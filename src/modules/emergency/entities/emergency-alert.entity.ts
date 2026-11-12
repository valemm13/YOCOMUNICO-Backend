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
import { InputSource } from '../../binary-tree/dtos/navigate-tree.dto';

export enum EmergencyTriggerType {
  DIRECT_PANIC_BUTTON = 'DIRECT_PANIC_BUTTON', // Botón de emergencia directo en control físico o en celular
  CRITICAL_TREE_NODE = 'CRITICAL_TREE_NODE', // Alcanzó nodo crítico del árbol (ej. Falta de Aire / Asfixia)
}

export enum EmergencyStatus {
  ACTIVE = 'ACTIVE',
  ATTENDING = 'ATTENDING',
  RESOLVED = 'RESOLVED',
}

@Entity('emergency_alerts')
export class EmergencyAlert {
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
    enum: EmergencyTriggerType,
    default: EmergencyTriggerType.DIRECT_PANIC_BUTTON,
  })
  triggerType: EmergencyTriggerType;

  @Column({
    type: 'enum',
    enum: InputSource,
    default: InputSource.HARDWARE_CONTROLLER,
  })
  source: InputSource;

  @Column({
    type: 'enum',
    enum: SeverityLevel,
    default: SeverityLevel.CRITICAL,
  })
  severityLevel: SeverityLevel;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: EmergencyStatus,
    default: EmergencyStatus.ACTIVE,
  })
  status: EmergencyStatus;

  @Column({ nullable: true })
  attendedByDoctorName: string;

  @Column({ type: 'text', nullable: true })
  resolutionNotes: string;

  @CreateDateColumn()
  triggeredAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
