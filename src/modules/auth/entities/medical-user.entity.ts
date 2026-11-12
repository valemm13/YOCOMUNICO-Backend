import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { StaffRole } from '../../../common/decorators/roles.decorator';

export enum MedicalShift {
  MORNING = 'MORNING',
  AFTERNOON = 'AFTERNOON',
  NIGHT = 'NIGHT',
}

@Entity('medical_users')
export class MedicalUser {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: StaffRole,
    default: StaffRole.DOCTOR,
  })
  role: StaffRole;

  @Column({
    type: 'enum',
    enum: MedicalShift,
    default: MedicalShift.MORNING,
  })
  shift: MedicalShift;

  @Column({ nullable: true })
  specialty: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('shift_handovers')
export class ShiftHandover {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => MedicalUser, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'outgoing_staff_id' })
  outgoingStaff: MedicalUser;

  @ManyToOne(() => MedicalUser, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'incoming_staff_id' })
  incomingStaff: MedicalUser;

  @Column({
    type: 'enum',
    enum: MedicalShift,
  })
  fromShift: MedicalShift;

  @Column({
    type: 'enum',
    enum: MedicalShift,
  })
  toShift: MedicalShift;

  @Column({ type: 'text' })
  generalWardNotes: string;

  @Column({ type: 'int', default: 0 })
  activePatientsCount: number;

  @Column({ type: 'int', default: 0 })
  pendingEmergenciesCount: number;

  @CreateDateColumn()
  handoverTimestamp: Date;
}
