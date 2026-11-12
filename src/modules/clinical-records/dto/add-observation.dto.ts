import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ClinicalRecordStatus } from '../entities/clinical-record.entity';
import { MedicalShift } from '../../auth/entities/medical-user.entity';
import { SeverityLevel } from '../../binary-tree/entities/tree-node.entity';

export class CreateDoctorObservationDto {
  @IsString()
  @IsNotEmpty({ message: 'El texto de la observación médica es obligatorio' })
  doctorObservations: string;

  @IsString()
  @IsNotEmpty({
    message: 'El nombre del médico que registra la observación es obligatorio',
  })
  attendedByDoctorName: string;

  @IsOptional()
  @IsEnum(MedicalShift, {
    message: 'El turno debe ser MORNING, AFTERNOON o NIGHT',
  })
  shift?: MedicalShift;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(SeverityLevel)
  severityLevel?: SeverityLevel;
}

export class UpdateExcelRowObservationDto {
  @IsString()
  @IsNotEmpty({
    message: 'La observación clínica para esta fila del Excel es obligatoria',
  })
  doctorObservations: string;

  @IsString()
  @IsNotEmpty({
    message: 'El nombre del médico o enfermero en turno es obligatorio',
  })
  attendedByDoctorName: string;

  @IsOptional()
  @IsEnum(ClinicalRecordStatus, {
    message: 'El estado debe ser PENDING, ATTENDED o IN_OBSERVATION',
  })
  status?: ClinicalRecordStatus;

  @IsOptional()
  @IsEnum(MedicalShift)
  shift?: MedicalShift;
}
