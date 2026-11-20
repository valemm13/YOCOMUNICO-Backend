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
        severityLevel: patient.severityLevel,
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
   * Exporta el Excel del paciente en formato CSV optimizado para Microsoft Excel en español:
   * - Incluye directiva 'sep=;' para forzar a Excel a separar en columnas reales (evita que todo quede en Columna A).
   * - Codificación con UTF-8 BOM (\uFEFF) para visualización correcta de tildes y caracteres especiales.
   * - Ficha de cabecera con los datos clínicos del paciente.
   * - Columna de comunicación del paciente claramente diferenciada de descripciones técnicas.
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

    const patient = sheet.patient;
    const now = this.formatDateTimeComponents(new Date());

    // Tarjeta superior con datos clínicos del paciente
    const metadataLines = [
      'sep=;',
      escapeCsv('========================================================================================================================'),
      escapeCsv('CENTRO DE CUIDADOS INTENSIVOS (UCI) - EXPEDIENTE DIGITAL DE COMUNICACIÓN ASISTIDA'),
      escapeCsv('SISTEMA DE COMUNICACIÓN Y MONITOREO POR NODOS BINARIOS'),
      escapeCsv('========================================================================================================================'),
      [
        escapeCsv('PACIENTE:'),
        escapeCsv(patient.fullName.toUpperCase()),
        escapeCsv('HISTORIA CLÍNICA / CÉDULA:'),
        escapeCsv(patient.documentNumber),
      ].join(';'),
      [
        escapeCsv('CAMA ASIGNADA:'),
        escapeCsv(patient.bedNumber),
        escapeCsv('EDAD:'),
        escapeCsv(`${patient.age} años`),
      ].join(';'),
      [
        escapeCsv('DIAGNÓSTICO MÉDICO:'),
        escapeCsv(patient.diagnosis),
        escapeCsv('ESTADO DE GRAVEDAD:'),
        escapeCsv(this.translateSeverity(patient.severityLevel)),
      ].join(';'),
      [
        escapeCsv('TIPO DE INTUBACIÓN:'),
        escapeCsv(patient.intubationType || 'Orotraqueal'),
        escapeCsv('DISPOSITIVO ASIGNADO:'),
        escapeCsv(patient.deviceMode || 'Control 2 Botones + Proyector'),
      ].join(';'),
      [
        escapeCsv('ESTADO EN UCI:'),
        escapeCsv(patient.status || 'ACTIVE_ICU'),
        escapeCsv('FECHA DEL REPORTE:'),
        escapeCsv(`${now.date} ${now.time}`),
      ].join(';'),
      [
        escapeCsv('TOTAL DE EVENTOS REGISTRADOS:'),
        escapeCsv(sheet.summary.totalRows),
        escapeCsv('ALERTAS CRÍTICAS DE EMERGENCIA:'),
        escapeCsv(sheet.summary.criticalEventsCount),
      ].join(';'),
      escapeCsv('========================================================================================================================'),
      '',
      escapeCsv('------------------------------------------------------------------------------------------------------------------------'),
      escapeCsv('REGISTRO CRONOLÓGICO: INTERACCIONES DEL PACIENTE Y OBSERVACIONES CLÍNICAS'),
      escapeCsv('------------------------------------------------------------------------------------------------------------------------'),
    ];

    const columnHeaders = [
      'N°',
      'FECHA',
      'HORA',
      'TURNO MÉDICO',
      'MENSAJE EXPRESADO POR EL PACIENTE',
      'CATEGORÍA CLÍNICA',
      'DESCRIPCIÓN MÉDICA',
      'RUTA BINARIA SEGUIDA',
      'SEVERIDAD',
      '¿EMERGENCIA CRÍTICA?',
      'DISPOSITIVO USADO',
      'ESTADO ATENCIÓN',
      'MÉDICO / ENFERMERO',
      'OBSERVACIONES CLÍNICAS (NUBE)',
    ]
      .map(escapeCsv)
      .join(';');

    const dataLines = sheet.rows.map((row) => {
      const dt = this.formatDateTimeComponents(row.timestamp);
      const patientVoice = `[COMUNICADO PACIENTE]: ${row.symptomOrMessage.toUpperCase()}`;
      return [
        escapeCsv(row.rowNumber),
        escapeCsv(dt.date),
        escapeCsv(dt.time),
        escapeCsv(this.translateShift(row.shift)),
        escapeCsv(patientVoice),
        escapeCsv(row.category),
        escapeCsv(row.clinicalDescription || ''),
        escapeCsv(row.navigationBreadcrumb || 'Inicio'),
        escapeCsv(this.translateSeverity(row.severityLevel)),
        escapeCsv(row.isEmergency ? '🚨 SÍ - ALERTA CRÍTICA' : 'NO (Normal)'),
        escapeCsv(this.translateDevice(row.source)),
        escapeCsv(row.status === 'ATTENDED' ? '✅ ATENDIDO' : '⏳ PENDIENTE'),
        escapeCsv(row.attendedByDoctorName || 'Pendiente'),
        escapeCsv(row.doctorObservations || ''),
      ].join(';');
    });

    const bom = '\uFEFF';
    const sanitizedName = sheet.patient.fullName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');

    return {
      filename: `expediente_uci_${sheet.patient.bedNumber}_${sanitizedName}.csv`,
      csvContent: `${bom}${[...metadataLines, columnHeaders, ...dataLines].join('\r\n')}`,
    };
  }

  /**
   * Exporta el expediente completo en formato Excel nativo (.XLS / SpreadsheetML)
   * con estilos visuales completos: encabezados con color, bordes de celda claramente delimitados,
   * destacado cromático del mensaje del paciente y alertas rojas para emergencias.
   */
  async exportPatientExcelXls(patientId: string): Promise<{
    filename: string;
    xlsContent: string;
  }> {
    const sheet = await this.getPatientExcelSheet(patientId);
    const patient = sheet.patient;
    const now = this.formatDateTimeComponents(new Date());

    const rowsHtml = sheet.rows
      .map((row) => {
        const dt = this.formatDateTimeComponents(row.timestamp);
        const isEmergency = row.isEmergency;
        const rowBg = isEmergency
          ? '#fee2e2'
          : row.rowNumber % 2 === 0
            ? '#f8fafc'
            : '#ffffff';
        const patientVoice = `🗣️ ${row.symptomOrMessage.toUpperCase()}`;
        const emergencyBadge = isEmergency
          ? `<span style="background-color:#dc2626;color:#ffffff;padding:4px 8px;font-weight:bold;font-size:10pt;border-radius:4px;">🚨 ALERTA</span>`
          : `<span style="color:#64748b;font-size:10pt;">Normal</span>`;
        const statusBadge =
          row.status === 'ATTENDED'
            ? `<span style="background-color:#059669;color:#ffffff;padding:4px 8px;font-weight:bold;font-size:10pt;border-radius:4px;">✅ ATENDIDO</span>`
            : `<span style="background-color:#d97706;color:#ffffff;padding:4px 8px;font-weight:bold;font-size:10pt;border-radius:4px;">⏳ PENDIENTE</span>`;

        return `
        <tr style="background-color:${rowBg};">
          <td style="text-align:center;font-weight:bold;border:1px solid #cbd5e1;padding:8px 6px;">${row.rowNumber}</td>
          <td style="text-align:center;border:1px solid #cbd5e1;padding:8px 6px;white-space:nowrap;">${dt.date}</td>
          <td style="text-align:center;border:1px solid #cbd5e1;padding:8px 6px;white-space:nowrap;font-weight:600;">${dt.time}</td>
          <td style="text-align:center;border:1px solid #cbd5e1;padding:8px 6px;font-size:10pt;">${this.translateShift(row.shift)}</td>
          <td style="border:2px solid #0284c7;background-color:#f0f9ff;color:#0369a1;font-weight:bold;font-size:11.5pt;padding:10px 12px;">
            ${patientVoice}
          </td>
          <td style="border:1px solid #cbd5e1;padding:8px 10px;font-weight:600;color:#334155;">${row.category}</td>
          <td style="border:1px solid #cbd5e1;padding:8px 10px;color:#475569;font-size:10pt;">${row.clinicalDescription || ''}</td>
          <td style="border:1px solid #cbd5e1;padding:8px 10px;color:#64748b;font-size:9.5pt;">${row.navigationBreadcrumb || 'Inicio'}</td>
          <td style="text-align:center;border:1px solid #cbd5e1;padding:8px 6px;font-weight:bold;font-size:10pt;">${this.translateSeverity(row.severityLevel)}</td>
          <td style="text-align:center;border:1px solid #cbd5e1;padding:8px 6px;">${emergencyBadge}</td>
          <td style="border:1px solid #cbd5e1;padding:8px 10px;font-size:10pt;">${this.translateDevice(row.source)}</td>
          <td style="text-align:center;border:1px solid #cbd5e1;padding:8px 6px;">${statusBadge}</td>
          <td style="border:1px solid #cbd5e1;padding:8px 10px;font-weight:600;color:#1e293b;">${row.attendedByDoctorName || 'Pendiente'}</td>
          <td style="border:1px solid #cbd5e1;padding:8px 10px;font-style:italic;color:#334155;">${row.doctorObservations || 'Sin observaciones registradas'}</td>
        </tr>`;
      })
      .join('');

    const xlsContent = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Expediente Cama ${patient.bedNumber}</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 11pt; color: #1e293b; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 24px; }
    th { background-color: #0f172a; color: #ffffff; font-weight: bold; padding: 12px 8px; border: 1px solid #334155; text-align: center; font-size: 10.5pt; }
    td { vertical-align: middle; }
    .card-title { background-color: #0f766e; color: #ffffff; font-size: 14pt; font-weight: bold; text-align: center; padding: 14px; }
    .card-label { font-weight: bold; color: #475569; background-color: #f1f5f9; padding: 8px 10px; border: 1px solid #cbd5e1; }
    .card-val { color: #0f172a; font-weight: 600; padding: 8px 10px; border: 1px solid #cbd5e1; }
  </style>
</head>
<body>
  <table>
    <tr>
      <td colspan="14" class="card-title">
        UNIDAD DE CUIDADOS INTENSIVOS (UCI) - EXPEDIENTE DIGITAL DE COMUNICACIÓN ASISTIDA<br/>
        <span style="font-size:10.5pt;font-weight:normal;opacity:0.9;">SISTEMA INTELIGENTE DE MONITOREO Y RESPUESTA POR NODOS BINARIOS</span>
      </td>
    </tr>
    <tr>
      <td colspan="2" class="card-label">PACIENTE:</td>
      <td colspan="4" class="card-val" style="font-size:12pt;font-weight:bold;color:#0f766e;">${patient.fullName.toUpperCase()}</td>
      <td colspan="2" class="card-label">HISTORIA / CÉDULA:</td>
      <td colspan="2" class="card-val">${patient.documentNumber}</td>
      <td colspan="2" class="card-label">CAMA UCI:</td>
      <td colspan="2" class="card-val" style="font-size:12pt;font-weight:bold;color:#b45309;">${patient.bedNumber}</td>
    </tr>
    <tr>
      <td colspan="2" class="card-label">EDAD:</td>
      <td colspan="4" class="card-val">${patient.age} años</td>
      <td colspan="2" class="card-label">ESTADO DE GRAVEDAD:</td>
      <td colspan="2" class="card-val" style="font-weight:bold;">${this.translateSeverity(patient.severityLevel)}</td>
      <td colspan="2" class="card-label">ESTADO UCI:</td>
      <td colspan="2" class="card-val">${patient.status}</td>
    </tr>
    <tr>
      <td colspan="2" class="card-label">DIAGNÓSTICO:</td>
      <td colspan="4" class="card-val">${patient.diagnosis}</td>
      <td colspan="2" class="card-label">TIPO INTUBACIÓN:</td>
      <td colspan="2" class="card-val">${patient.intubationType || 'Orotraqueal'}</td>
      <td colspan="2" class="card-label">DISPOSITIVO ASIGNADO:</td>
      <td colspan="2" class="card-val">${patient.deviceMode || 'Control + Proyector'}</td>
    </tr>
    <tr>
      <td colspan="2" class="card-label">FECHA DE REPORTE:</td>
      <td colspan="4" class="card-val">${now.date} ${now.time}</td>
      <td colspan="2" class="card-label">TOTAL EVENTOS:</td>
      <td colspan="2" class="card-val" style="font-weight:bold;">${sheet.summary.totalRows}</td>
      <td colspan="2" class="card-label">ALERTAS DE EMERGENCIA:</td>
      <td colspan="2" class="card-val" style="color:#dc2626;font-weight:bold;">${sheet.summary.criticalEventsCount}</td>
    </tr>
  </table>

  <table>
    <thead>
      <tr>
        <th style="width: 45px;">N°</th>
        <th style="width: 95px;">FECHA</th>
        <th style="width: 105px;">HORA</th>
        <th style="width: 130px;">TURNO MÉDICO</th>
        <th style="width: 290px; background-color: #0369a1; color: #ffffff;">MENSAJE EXPRESADO POR EL PACIENTE</th>
        <th style="width: 180px;">CATEGORÍA CLÍNICA</th>
        <th style="width: 240px;">DESCRIPCIÓN MÉDICA</th>
        <th style="width: 200px;">RUTA BINARIA SEGUIDA</th>
        <th style="width: 130px;">SEVERIDAD</th>
        <th style="width: 110px;">¿EMERGENCIA?</th>
        <th style="width: 170px;">DISPOSITIVO USADO</th>
        <th style="width: 130px;">ESTADO</th>
        <th style="width: 160px;">MÉDICO A CARGO</th>
        <th style="width: 280px;">OBSERVACIONES MÉDICAS (NUBE)</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
</body>
</html>`;

    const sanitizedName = sheet.patient.fullName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_');

    return {
      filename: `expediente_uci_${sheet.patient.bedNumber}_${sanitizedName}.xls`,
      xlsContent,
    };
  }

  private formatDateTimeComponents(dateInput: Date | string) {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      return { date: 'N/A', time: 'N/A' };
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, '0');
    return {
      date: `${day}/${month}/${year}`,
      time: `${hoursStr}:${minutes}:${seconds} ${ampm}`,
    };
  }

  private translateShift(shift?: MedicalShift | string): string {
    switch (shift) {
      case MedicalShift.MORNING:
        return 'Mañana (06:00 - 14:00)';
      case MedicalShift.AFTERNOON:
        return 'Tarde (14:00 - 22:00)';
      case MedicalShift.NIGHT:
        return 'Noche (22:00 - 06:00)';
      default:
        return shift || 'No especificado';
    }
  }

  private translateSeverity(severity?: SeverityLevel | string): string {
    switch (severity) {
      case SeverityLevel.CRITICAL:
        return 'CRÍTICO';
      case SeverityLevel.HIGH:
        return 'ALTO';
      case SeverityLevel.MEDIUM:
        return 'MEDIO';
      case SeverityLevel.LOW:
        return 'BAJO';
      default:
        return severity || 'N/A';
    }
  }

  private translateDevice(source?: InputSource | string): string {
    if (source === InputSource.HARDWARE_CONTROLLER) {
      return 'Control Físico + Proyector';
    }
    return 'Teléfono Móvil / Táctil';
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
