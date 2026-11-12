import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { MedicalShift } from '../entities/medical-user.entity';
import { StaffRole } from '../../../common/decorators/roles.decorator';

export class LoginDto {
  @IsEmail({}, { message: 'Debe proporcionar un correo electrónico válido' })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  password: string;

  @IsOptional()
  @IsEnum(MedicalShift, {
    message: 'El turno debe ser MORNING, AFTERNOON o NIGHT',
  })
  shift?: MedicalShift;
}

export class RegisterStaffDto {
  @IsString()
  @IsNotEmpty({
    message: 'El nombre completo del médico/enfermero es obligatorio',
  })
  fullName: string;

  @IsEmail({}, { message: 'Debe proporcionar un correo electrónico válido' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsEnum(StaffRole, {
    message: 'El rol debe ser DOCTOR, NURSE o ADMIN',
  })
  role: StaffRole;

  @IsEnum(MedicalShift, {
    message: 'El turno debe ser MORNING, AFTERNOON o NIGHT',
  })
  shift: MedicalShift;

  @IsOptional()
  @IsString()
  specialty?: string;
}
