import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { MedicalShift } from '../entities/medical-user.entity';

export class CreateHandoverDto {
  @IsUUID('4', { message: 'El ID del médico saliente debe ser un UUID válido' })
  @IsNotEmpty()
  outgoingStaffId: string;

  @IsUUID('4', { message: 'El ID del médico entrante debe ser un UUID válido' })
  @IsNotEmpty()
  incomingStaffId: string;

  @IsEnum(MedicalShift)
  fromShift: MedicalShift;

  @IsEnum(MedicalShift)
  toShift: MedicalShift;

  @IsString()
  @IsNotEmpty({
    message: 'Las notas de entrega de turno en planta son obligatorias',
  })
  generalWardNotes: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  activePatientsCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  pendingEmergenciesCount?: number;
}
