import { Injectable } from '@nestjs/common';
import {
  ActiveDeviceSession,
  BinaryPairPayload,
} from '../../common/interfaces/binary-payload.interface';
import { InputSource } from '../binary-tree/dtos/navigate-tree.dto';
import { PatientsService } from '../patients/patients.service';
import { ClinicalRecordsService } from '../clinical-records/clinical-records.service';
import { EmergencyService } from '../emergency/emergency.service';
import { EmergencyGateway } from '../emergency/emergency.gateway';

@Injectable()
export class SyncService {
  // Caché de alta velocidad para sesiones activas de dispositivos (Control 2 botones + Proyector / Modo Solo Celular)
  private readonly deviceSessions = new Map<string, ActiveDeviceSession>();
  // Caché rápida de pares binarios del árbol por nodeId
  private readonly binaryPairCache = new Map<string, BinaryPairPayload>();

  constructor(
    private readonly patientsService: PatientsService,
    private readonly clinicalRecordsService: ClinicalRecordsService,
    private readonly emergencyService: EmergencyService,
    private readonly emergencyGateway: EmergencyGateway,
  ) {}

  cacheBinaryPair(nodeId: string, pair: BinaryPairPayload): void {
    this.binaryPairCache.set(nodeId, pair);
  }

  getCachedBinaryPair(nodeId: string): BinaryPairPayload | undefined {
    return this.binaryPairCache.get(nodeId);
  }

  clearTreeCache(): void {
    this.binaryPairCache.clear();
  }

  updatePatientDeviceSession(params: {
    patientId: string;
    currentNodeId: string;
    currentNodeCode: string;
    level: number;
    inputMode: InputSource;
    selectedLabel?: string;
    resetBreadcrumb?: boolean;
    lastPair: BinaryPairPayload;
  }): ActiveDeviceSession {
    const existing = this.deviceSessions.get(params.patientId);
    let breadcrumb = existing?.navigationBreadcrumb
      ? [...existing.navigationBreadcrumb]
      : [];

    if (params.resetBreadcrumb) {
      breadcrumb = [];
    } else if (params.selectedLabel) {
      breadcrumb.push(params.selectedLabel);
    }

    const session: ActiveDeviceSession = {
      patientId: params.patientId,
      currentNodeId: params.currentNodeId,
      currentNodeCode: params.currentNodeCode,
      level: params.level,
      inputMode: params.inputMode,
      navigationBreadcrumb: breadcrumb,
      lastPair: params.lastPair,
      updatedAt: new Date().toISOString(),
    };

    this.deviceSessions.set(params.patientId, session);

    // Sincroniza en vivo el mini-proyector o la pantalla del celular del paciente (Regla 1)
    this.emergencyGateway.emitBinaryPairToPatientDevice(
      params.patientId,
      params.lastPair,
    );

    return session;
  }

  getPatientDeviceSession(patientId: string): ActiveDeviceSession | null {
    return this.deviceSessions.get(patientId) ?? null;
  }

  /**
   * Obtiene el tablero consolidado en la nube para toda la planta UCI.
   * Permite que en los relevos de médicos en planta se acceda de inmediato a todos los pacientes,
   * su modo de dispositivo (solo celular o control físico + proyector), alertas activas y resumen de su Excel.
   */
  async getCloudWardOverview() {
    const [patients, activeEmergencies] = await Promise.all([
      this.patientsService.findAll(),
      this.emergencyService.findActiveAlerts(),
    ]);

    const patientSummaries = await Promise.all(
      patients.map(async (patient) => {
        const excel = await this.clinicalRecordsService.getPatientExcelSheet(
          patient.id,
        );
        const activeSession = this.getPatientDeviceSession(patient.id);
        return {
          patient: excel.patient,
          excelSummary: excel.summary,
          latestSymptomRow: excel.rows[0] ?? null,
          activeDeviceSession: activeSession,
        };
      }),
    );

    return {
      syncedAt: new Date().toISOString(),
      totalPatients: patients.length,
      activeEmergenciesCount: activeEmergencies.length,
      activeEmergencies,
      patients: patientSummaries,
    };
  }
}
