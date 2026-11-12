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

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  bedNumber?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(130)
  age?: number;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsEnum(IntubationType)
  intubationType?: IntubationType;

  @IsOptional()
  @IsEnum(PatientDeviceMode)
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

export class UpdateDeviceModeDto {
  @IsEnum(PatientDeviceMode, {
    message:
      'El modo debe ser TOUCH_SCREEN (solo celular), HARDWARE_CONTROLLER (control 2 botones + proyector) o HYBRID',
  })
  @IsNotEmpty()
  deviceMode: PatientDeviceMode;

  @IsOptional()
  @IsString()
  deviceHardwareId?: string;
}
