import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Patient } from '../../patients/entities/patient.entity';
import {
  TreeNode,
  SeverityLevel,
} from '../../binary-tree/entities/tree-node.entity';
import {
  InputSource,
  NavigationSelection,
} from '../../binary-tree/dtos/navigate-tree.dto';
import { MedicalShift } from '../../auth/entities/medical-user.entity';

export enum ClinicalRecordType {
  PATIENT_TREE_LEAF = 'PATIENT_TREE_LEAF', // Síntoma o emoción alcanzado al llegar a la hoja del árbol binario
  DOCTOR_OBSERVATION = 'DOCTOR_OBSERVATION', // Observación médica general o nota de evolución/relevo en la nube
  EMERGENCY_EVENT = 'EMERGENCY_EVENT', // Evento crítico de emergencia registrado en la hoja del paciente
}

export enum ClinicalRecordStatus {
  PENDING = 'PENDING',
  ATTENDED = 'ATTENDED',
  IN_OBSERVATION = 'IN_OBSERVATION',
}

/**
 * Representa cada fila de la vista tipo "Excel" del paciente en la aplicación del médico.
 * Se almacena en PostgreSQL (nube) para que en los relevos de turno todos los médicos
 * sigan viendo el historial de síntomas y observaciones de cada paciente.
 */
@Entity('clinical_records')
export class ClinicalRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Patient, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @ManyToOne(() => TreeNode, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tree_node_id' })
  treeNode: TreeNode | null;

  @Column({
    type: 'enum',
    enum: ClinicalRecordType,
    default: ClinicalRecordType.PATIENT_TREE_LEAF,
  })
  recordType: ClinicalRecordType;

  @Column({ nullable: true })
  nodeCode: string;

  @Column()
  category: string;

  @Column()
  symptomOrMessage: string;

  @Column({ type: 'text', nullable: true })
  clinicalDescription: string;

  @Column({ type: 'text', nullable: true })
  navigationBreadcrumb: string;

  @Column({ type: 'int', default: 0 })
  stepsCount: number;

  @Column({
    type: 'enum',
    enum: SeverityLevel,
    default: SeverityLevel.LOW,
  })
  severityLevel: SeverityLevel;

  @Column({ default: false })
  isEmergency: boolean;

  @Column({
    type: 'enum',
    enum: InputSource,
    default: InputSource.TOUCH_SCREEN,
  })
  source: InputSource;

  @Column({
    type: 'enum',
    enum: ClinicalRecordStatus,
    default: ClinicalRecordStatus.PENDING,
  })
  status: ClinicalRecordStatus;

  @Column({ type: 'text', nullable: true })
  doctorObservations: string;

  @Column({ nullable: true })
  attendedByDoctorName: string;

  @Column({
    type: 'enum',
    enum: MedicalShift,
    default: MedicalShift.MORNING,
  })
  shift: MedicalShift;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/**
 * Regla 3 de AGENTS.md (Persistencia Auditada):
 * Cada pulsación individual de botón (LEFT / RIGHT) se registra con ID de paciente,
 * ID del nodo y marca de tiempo (timestamp) para trazabilidad histórica.
 */
@Entity('button_press_audits')
export class ButtonPressAudit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Patient, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @ManyToOne(() => TreeNode, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'from_node_id' })
  fromNode: TreeNode | null;

  @ManyToOne(() => TreeNode, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'selected_node_id' })
  selectedNode: TreeNode;

  @Column()
  selectedNodeCode: string;

  @Column()
  selectedNodeLabel: string;

  @Column({
    type: 'enum',
    enum: NavigationSelection,
  })
  selection: NavigationSelection;

  @Column({
    type: 'enum',
    enum: InputSource,
  })
  source: InputSource;

  @Column({ default: false })
  reachedLeaf: boolean;

  @Column({ default: false })
  triggeredEmergency: boolean;

  @CreateDateColumn()
  timestamp: Date;
}
