import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ClinicalRecord,
  ClinicalRecordStatus,
  ClinicalRecordType,
  ButtonPressAudit,
} from './entities/clinical-record.entity';
import {
  CreateDoctorObservationDto,
  UpdateExcelRowObservationDto,
} from './dto/add-observation.dto';
import { PatientsService } from '../patients/patients.service';
import { EmergencyGateway } from '../emergency/emergency.gateway';
import {
  TreeNode,
  SeverityLevel,
} from '../binary-tree/entities/tree-node.entity';
import {
  InputSource,
  NavigationSelection,
} from '../binary-tree/dtos/navigate-tree.dto';
import { MedicalShift } from '../auth/entities/medical-user.entity';

@Injectable()
export class ClinicalRecordsService {
  constructor(
    @InjectRepository(ClinicalRecord)
    private readonly clinicalRecordRepository: Repository<ClinicalRecord>,
    @InjectRepository(ButtonPressAudit)
    private readonly buttonAuditRepository: Repository<ButtonPressAudit>,
    private readonly patientsService: PatientsService,
    private readonly emergencyGateway: EmergencyGateway,
  ) {}

  /**
   * Regla 3 de AGENTS.md: Persistencia auditada de cada pulsación de botón (LEFT / RIGHT).
   */
  async recordButtonPressAudit(params: {
    patientId: string;
    fromNode: TreeNode | null;
    selectedNode: TreeNode;
    selection: NavigationSelection;
    source: InputSource;
  }): Promise<ButtonPressAudit> {
    const patient = await this.patientsService.findOne(params.patientId);

    const audit = this.buttonAuditRepository.create({
      patient,
      fromNode: params.fromNode,
      selectedNode: params.selectedNode,
      selectedNodeCode: params.selectedNode.code,
      selectedNodeLabel: params.selectedNode.label,
      selection: params.selection,
      source: params.source,
      reachedLeaf: params.selectedNode.isLeaf,
      triggeredEmergency: params.selectedNode.isEmergency,
    });

    return this.buttonAuditRepository.save(audit);
  }

  /**
   * Cuando el paciente llega a una hoja del árbol binario, se envía automáticamente
   * la fila al "Excel" del paciente en la nube y se notifica en vivo al médico (Reglas 3 y 5).
   */
  async recordLeafSymptomToPatientExcel(params: {
    patientId: string;
    leafNode: TreeNode;
    source: InputSource;
    navigationBreadcrumb: string[];
  }): Promise<ClinicalRecord> {
    const patient = await this.patientsService.findOne(params.patientId);

    const breadcrumbText = params.navigationBreadcrumb.join(' ➔ ');

    const record = this.clinicalRecordRepository.create({
      patient,
      treeNode: params.leafNode,
      recordType: params.leafNode.isEmergency
        ? ClinicalRecordType.EMERGENCY_EVENT
        : ClinicalRecordType.PATIENT_TREE_LEAF,
      nodeCode: params.leafNode.code,
      category: params.leafNode.category || 'Comunicación Binaria UCI',
      symptomOrMessage: params.leafNode.label,
      clinicalDescription: params.leafNode.description,
      navigationBreadcrumb: breadcrumbText,
      stepsCount: params.navigationBreadcrumb.length,
      severityLevel: params.leafNode.severityLevel,
      isEmergency: params.leafNode.isEmergency,
      source: params.source,
      status: ClinicalRecordStatus.PENDING,
      shift: this.getCurrentShiftByHour(),
    });

    const saved = await this.clinicalRecordRepository.save(record);

    const excelRowPayload = this.formatExcelRow(
      saved,
      patient.fullName,
      patient.bedNumber,
    );

    // Regla 5 de AGENTS.md: Actualizar en tiempo real la vista de tabla/Excel del médico
    this.emergencyGateway.broadcastNewExcelRow(patient.id, excelRowPayload);

    return saved;
  }

  /**
   * Permite al médico agregar una observación directa al expediente/Excel del paciente en la nube.
   */
  async addDoctorObservationToPatient(
    patientId: string,
    dto: CreateDoctorObservationDto,
  ): Promise<ClinicalRecord> {
    const patient = await this.patientsService.findOne(patientId);

    const record = this.clinicalRecordRepository.create({
      patient,
      treeNode: null,
      recordType: ClinicalRecordType.DOCTOR_OBSERVATION,
      nodeCode: 'OBS-MED',
      category: dto.category || 'Observación Médica / Relevo de Turno',
      symptomOrMessage: 'Nota Clínica del Médico',
      clinicalDescription: dto.doctorObservations,
      navigationBreadcrumb: 'Registro directo desde App Médica',
      stepsCount: 0,
      severityLevel: dto.severityLevel ?? SeverityLevel.LOW,
      isEmergency: false,
      source: InputSource.TOUCH_SCREEN,
      status: ClinicalRecordStatus.ATTENDED,
      doctorObservations: dto.doctorObservations,
      attendedByDoctorName: dto.attendedByDoctorName,
      shift: dto.shift ?? this.getCurrentShiftByHour(),
    });

    const saved = await this.clinicalRecordRepository.save(record);
    const excelRowPayload = this.formatExcelRow(
      saved,
      patient.fullName,
      patient.bedNumber,
    );

    this.emergencyGateway.broadcastObservationUpdated(
      patient.id,
      excelRowPayload,
    );

    return saved;
  }

  /**
   * Permite al médico escribir o actualizar observaciones sobre un síntoma específico en el Excel del paciente
   * y marcarlo como atendido. Todo queda sincronizado en la nube para el relevo médico.
   */
  async updateExcelRowObservation(
    recordId: string,
    dto: UpdateExcelRowObservationDto,
  ): Promise<ClinicalRecord> {
    const record = await this.clinicalRecordRepository.findOne({
      where: { id: recordId },
      relations: { patient: true, treeNode: true },
    });

    if (!record) {
      throw new NotFoundException(
        `Fila del expediente clínico (Excel) con ID ${recordId} no encontrada`,
      );
    }

    record.doctorObservations = dto.doctorObservations;
    record.attendedByDoctorName = dto.attendedByDoctorName;
    record.status = dto.status ?? ClinicalRecordStatus.ATTENDED;
    if (dto.shift) {
      record.shift = dto.shift;
    }

    const saved = await this.clinicalRecordRepository.save(record);
    const excelRowPayload = this.formatExcelRow(
      saved,
      record.patient.fullName,
      record.patient.bedNumber,
    );

    this.emergencyGateway.broadcastObservationUpdated(
      record.patient.id,
      excelRowPayload,
    );

    return saved;
  }

  /**
   * Devuelve la vista completa tipo "Excel" de un paciente seleccionado por el médico.
   */
  async getPatientExcelSheet(patientId: string) {
    const patient = await this.patientsService.findOne(patientId);

    const records = await this.clinicalRecordRepository.find({
      where: { patient: { id: patientId } },
      relations: { treeNode: true },
      order: { createdAt: 'DESC' },
    });

    const rows = records.map((r, idx) => ({
      rowNumber: records.length - idx,
      ...this.formatExcelRow(r, patient.fullName, patient.bedNumber),
    }));

    return {
      patient: {
        id: patient.id,
        fullName: patient.fullName,
        documentNumber: patient.documentNumber,
        bedNumber: patient.bedNumber,
        age: patient.age,
        diagnosis: patient.diagnosis,
        intubationType: patient.intubationType,
        deviceMode: patient.deviceMode,
        status: patient.status,
      },
      summary: {
        totalRows: rows.length,
        pendingSymptomsCount: rows.filter(
          (r) => r.status === ClinicalRecordStatus.PENDING,
        ).length,
        criticalEventsCount: rows.filter(
          (r) => r.isEmergency || r.severityLevel === SeverityLevel.CRITICAL,
        ).length,
        doctorObservationsCount: rows.filter((r) =>
          Boolean(r.doctorObservations),
        ).length,
      },
      columns: [
        'Fila',
        'Fecha y Hora',
        'Turno',
        'Código Nodo',
        'Categoría',
        'Síntoma / Emoción / Mensaje (Hoja)',
        'Descripción Clínica',
        'Ruta Binaria Seguida',
        'Severidad',
        'Emergencia',
        'Dispositivo Usado',
        'Estado Atención',
        'Médico / Enfermero',
        'Observaciones Médicas (Nube)',
      ],
      rows,
    };
  }

  /**
   * Exporta el Excel del paciente en formato CSV con UTF-8 BOM para abrir directamente en Microsoft Excel.
   */
  async exportPatientExcelCsv(patientId: string): Promise<{
    filename: string;
    csvContent: string;
  }> {
    const sheet = await this.getPatientExcelSheet(patientId);
    const escapeCsv = (
      val: string | number | boolean | null | undefined,
    ): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = sheet.columns.map(escapeCsv).join(',');
    const lines = sheet.rows.map((row) =>
      [
        row.rowNumber,
        new Date(row.timestamp).toISOString(),
        row.shift,
        row.nodeCode,
        row.category,
        row.symptomOrMessage,
        row.clinicalDescription || '',
        row.navigationBreadcrumb || '',
        row.severityLevel,
        row.isEmergency ? 'SI' : 'NO',
        row.source === InputSource.HARDWARE_CONTROLLER
          ? 'Control 2 Botones + Proyector'
          : 'Solo Celular / Pantalla Táctil',
        row.status,
        row.attendedByDoctorName || 'Pendiente',
        row.doctorObservations || '',
      ]
        .map(escapeCsv)
        .join(','),
    );

    const bom = '\uFEFF';
    const sanitizedName = sheet.patient.fullName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');

    return {
      filename: `expediente_uci_${sheet.patient.bedNumber}_${sanitizedName}.csv`,
      csvContent: `${bom}${[headers, ...lines].join('\r\n')}`,
    };
  }

  /**
   * Obtiene el historial auditado de cada pulsación de botón del paciente (Regla 3 de AGENTS.md).
   */
  async getPatientButtonAuditTrail(patientId: string) {
    await this.patientsService.findOne(patientId);

    const audits = await this.buttonAuditRepository.find({
      where: { patient: { id: patientId } },
      relations: { fromNode: true, selectedNode: true },
      order: { timestamp: 'DESC' },
      take: 200,
    });

    return audits.map((a) => ({
      id: a.id,
      patientId,
      fromNodeCode: a.fromNode?.code ?? 'ROOT',
      selectedNodeId: a.selectedNode.id,
      selectedNodeCode: a.selectedNodeCode,
      selectedNodeLabel: a.selectedNodeLabel,
      selection: a.selection,
      source: a.source,
      reachedLeaf: a.reachedLeaf,
      triggeredEmergency: a.triggeredEmergency,
      timestamp: a.timestamp,
    }));
  }

  private formatExcelRow(
    record: ClinicalRecord,
    patientName: string,
    bedNumber: string,
  ) {
    return {
      id: record.id,
      patientId: record.patient?.id,
      patientName,
      bedNumber,
      recordType: record.recordType,
      nodeCode: record.nodeCode || 'N/A',
      category: record.category,
      symptomOrMessage: record.symptomOrMessage,
      clinicalDescription: record.clinicalDescription,
      navigationBreadcrumb: record.navigationBreadcrumb,
      stepsCount: record.stepsCount,
      severityLevel: record.severityLevel,
      isEmergency: record.isEmergency,
      source: record.source,
      status: record.status,
      attendedByDoctorName: record.attendedByDoctorName,
      doctorObservations: record.doctorObservations,
      shift: record.shift,
      timestamp: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private getCurrentShiftByHour(): MedicalShift {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return MedicalShift.MORNING;
    if (hour >= 14 && hour < 22) return MedicalShift.AFTERNOON;
    return MedicalShift.NIGHT;
  }
}
