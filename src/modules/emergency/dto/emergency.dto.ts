import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { InputSource } from '../../binary-tree/dtos/navigate-tree.dto';
import { EmergencyStatus } from '../entities/emergency-alert.entity';

export class TriggerPanicDto {
  @IsUUID('4', { message: 'El patientId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del paciente es obligatorio' })
  patientId: string;

  @IsEnum(InputSource, {
    message: 'El origen debe ser HARDWARE_CONTROLLER o TOUCH_SCREEN',
  })
  source: InputSource;

  @IsOptional()
  @IsString()
  customMessage?: string;
}

export class ResolveEmergencyDto {
  @IsEnum(EmergencyStatus, {
    message: 'El estado debe ser ACTIVE, ATTENDING o RESOLVED',
  })
  status: EmergencyStatus;

  @IsString()
  @IsNotEmpty({
    message: 'El nombre del médico o enfermero que atiende es obligatorio',
  })
  attendedByDoctorName: string;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}
