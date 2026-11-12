import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum IntubationType {
  ENDOTRACHEAL = 'ENDOTRACHEAL', // Tubo endotraqueal orotraqueal
  TRACHEOSTOMY = 'TRACHEOSTOMY', // Cánula de traqueostomía
  NON_INVASIVE_VENTILATION = 'NON_INVASIVE_VENTILATION', // Máscara VNI
}

export enum PatientDeviceMode {
  TOUCH_SCREEN = 'TOUCH_SCREEN', // Modo Solo Celular / Tablet (Pantalla dividida en 2)
  HARDWARE_CONTROLLER = 'HARDWARE_CONTROLLER', // Control físico polímero 2 botones + Mini Proyector
  HYBRID = 'HYBRID', // Permite usar indistintamente tanto el celular como el control físico
}

export enum PatientIcuStatus {
  ACTIVE_ICU = 'ACTIVE_ICU',
  STEP_DOWN_WARD = 'STEP_DOWN_WARD',
  DISCHARGED = 'DISCHARGED',
}

@Entity('patients')
export class Patient {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fullName: string;

  @Column({ unique: true })
  documentNumber: string;

  @Column()
  bedNumber: string;

  @Column({ type: 'int' })
  age: number;

  @Column({ type: 'text' })
  diagnosis: string;

  @Column({
    type: 'enum',
    enum: IntubationType,
    default: IntubationType.ENDOTRACHEAL,
  })
  intubationType: IntubationType;

  @Column({
    type: 'enum',
    enum: PatientDeviceMode,
    default: PatientDeviceMode.HYBRID,
  })
  deviceMode: PatientDeviceMode;

  @Column({ nullable: true })
  deviceHardwareId: string;

  @Column({ type: 'uuid', nullable: true })
  currentNodeId: string | null;

  @Column({
    type: 'enum',
    enum: PatientIcuStatus,
    default: PatientIcuStatus.ACTIVE_ICU,
  })
  status: PatientIcuStatus;

  @Column({ type: 'text', nullable: true })
  clinicalSummaryNotes: string;

  @CreateDateColumn()
  admittedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
