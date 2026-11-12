import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  IntubationType,
  PatientDeviceMode,
  PatientIcuStatus,
} from '../entities/patient.entity';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty({ message: 'El nombre completo del paciente es obligatorio' })
  fullName: string;

  @IsString()
  @IsNotEmpty({ message: 'El documento del paciente es obligatorio' })
  documentNumber: string;

  @IsString()
  @IsNotEmpty({ message: 'El número de cama/cubículo UCI es obligatorio' })
  bedNumber: string;

  @IsInt()
  @Min(0)
  @Max(130)
  age: number;

  @IsString()
  @IsNotEmpty({ message: 'El diagnóstico de ingreso a UCI es obligatorio' })
  diagnosis: string;

  @IsOptional()
  @IsEnum(IntubationType)
  intubationType?: IntubationType;

  @IsOptional()
  @IsEnum(PatientDeviceMode, {
    message:
      'El modo de dispositivo debe ser TOUCH_SCREEN (solo celular), HARDWARE_CONTROLLER (control + proyector) o HYBRID',
  })
  deviceMode?: PatientDeviceMode;

  @IsOptional()
  @IsString()
  deviceHardwareId?: string;

  @IsOptional()
  @IsEnum(PatientIcuStatus)
  status?: PatientIcuStatus;

  @IsOptional()
  @IsString()
  clinicalSummaryNotes?: string;
}
