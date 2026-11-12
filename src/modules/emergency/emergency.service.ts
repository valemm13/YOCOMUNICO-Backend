import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EmergencyAlert,
  EmergencyStatus,
  EmergencyTriggerType,
} from './entities/emergency-alert.entity';
import { TriggerPanicDto, ResolveEmergencyDto } from './dto/emergency.dto';
import { EmergencyGateway } from './emergency.gateway';
import { PatientsService } from '../patients/patients.service';
import {
  TreeNode,
  SeverityLevel,
} from '../binary-tree/entities/tree-node.entity';
import { InputSource } from '../binary-tree/dtos/navigate-tree.dto';

@Injectable()
export class EmergencyService {
  private readonly logger = new Logger(EmergencyService.name);

  constructor(
    @InjectRepository(EmergencyAlert)
    private readonly emergencyRepository: Repository<EmergencyAlert>,
    private readonly emergencyGateway: EmergencyGateway,
    private readonly patientsService: PatientsService,
  ) {}

  /**
   * Regla 2 de AGENTS.md: Botón directo de pánico desde el control físico (2 botones) o desde el celular.
   * Ignora la profundidad del árbol y dispara alerta crítica inmediata.
   */
  async triggerDirectPanic(dto: TriggerPanicDto): Promise<EmergencyAlert> {
    const patient = await this.patientsService.findOne(dto.patientId);

    const alert = this.emergencyRepository.create({
      patient,
      treeNode: null,
      triggerType: EmergencyTriggerType.DIRECT_PANIC_BUTTON,
      source: dto.source,
      severityLevel: SeverityLevel.CRITICAL,
      title: `🚨 LLAMADA DE EMERGENCIA DIRECTA - ${patient.bedNumber}`,
      description:
        dto.customMessage ||
        `El paciente ${patient.fullName} (${patient.bedNumber}) activó el botón de pánico directo desde ${dto.source === InputSource.HARDWARE_CONTROLLER ? 'el Control Físico de 2 Botones' : 'la Pantalla del Celular'}.`,
      status: EmergencyStatus.ACTIVE,
    });

    const saved = await this.emergencyRepository.save(alert);

    this.logger.warn(
      `🚨 EMERGENCIA DIRECTA activada por paciente ${patient.fullName} (${patient.bedNumber})`,
    );

    this.emergencyGateway.broadcastCriticalEmergency({
      alertId: saved.id,
      patientId: patient.id,
      patientName: patient.fullName,
      bedNumber: patient.bedNumber,
      triggerType: saved.triggerType,
      source: saved.source,
      severityLevel: saved.severityLevel,
      title: saved.title,
      description: saved.description,
      status: saved.status,
      triggeredAt: saved.triggeredAt,
    });

    return saved;
  }

  /**
   * Regla 2 de AGENTS.md: Se dispara automáticamente cuando la navegación binaria alcanza un nodo crítico (isEmergency = true).
   */
  async triggerFromCriticalNode(
    patientId: string,
    node: TreeNode,
    source: InputSource,
  ): Promise<EmergencyAlert> {
    const patient = await this.patientsService.findOne(patientId);

    const alert = this.emergencyRepository.create({
      patient,
      treeNode: node,
      triggerType: EmergencyTriggerType.CRITICAL_TREE_NODE,
      source,
      severityLevel: SeverityLevel.CRITICAL,
      title: `🚨 SÍNTOMA CRÍTICO: ${node.label} (${patient.bedNumber})`,
      description: `El paciente ${patient.fullName} en ${patient.bedNumber} seleccionó el nodo crítico [${node.code}] "${node.label}": ${node.description || 'Requiere intervención médica inmediata'}`,
      status: EmergencyStatus.ACTIVE,
    });

    const saved = await this.emergencyRepository.save(alert);

    this.logger.warn(
      `🚨 EMERGENCIA DE ÁRBOL BINARIO [${node.code} - ${node.label}] para paciente ${patient.fullName} (${patient.bedNumber})`,
    );

    this.emergencyGateway.broadcastCriticalEmergency({
      alertId: saved.id,
      patientId: patient.id,
      patientName: patient.fullName,
      bedNumber: patient.bedNumber,
      nodeCode: node.code,
      nodeLabel: node.label,
      triggerType: saved.triggerType,
      source: saved.source,
      severityLevel: saved.severityLevel,
      title: saved.title,
      description: saved.description,
      status: saved.status,
      triggeredAt: saved.triggeredAt,
    });

    return saved;
  }

  async findActiveAlerts(): Promise<EmergencyAlert[]> {
    return this.emergencyRepository.find({
      where: [
        { status: EmergencyStatus.ACTIVE },
        { status: EmergencyStatus.ATTENDING },
      ],
      relations: {
        patient: true,
        treeNode: true,
      },
      order: { triggeredAt: 'DESC' },
    });
  }

  async findAllByPatient(patientId: string): Promise<EmergencyAlert[]> {
    return this.emergencyRepository.find({
      where: { patient: { id: patientId } },
      relations: {
        patient: true,
        treeNode: true,
      },
      order: { triggeredAt: 'DESC' },
    });
  }

  async resolveOrUpdateAlert(
    id: string,
    dto: ResolveEmergencyDto,
  ): Promise<EmergencyAlert> {
    const alert = await this.emergencyRepository.findOne({
      where: { id },
      relations: { patient: true, treeNode: true },
    });

    if (!alert) {
      throw new NotFoundException(
        `Alerta de emergencia con ID ${id} no encontrada`,
      );
    }

    alert.status = dto.status;
    alert.attendedByDoctorName = dto.attendedByDoctorName;
    if (dto.resolutionNotes !== undefined) {
      alert.resolutionNotes = dto.resolutionNotes;
    }
    if (dto.status === EmergencyStatus.RESOLVED) {
      alert.resolvedAt = new Date();
    }

    const saved = await this.emergencyRepository.save(alert);

    this.emergencyGateway.broadcastEmergencyStatusUpdate({
      alertId: saved.id,
      patientId: saved.patient.id,
      patientName: saved.patient.fullName,
      bedNumber: saved.patient.bedNumber,
      status: saved.status,
      attendedByDoctorName: saved.attendedByDoctorName,
      resolutionNotes: saved.resolutionNotes,
      resolvedAt: saved.resolvedAt,
    });

    return saved;
  }
}
