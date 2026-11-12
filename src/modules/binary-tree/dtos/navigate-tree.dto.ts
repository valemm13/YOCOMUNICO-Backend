import { IsUUID, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';

export enum NavigationSelection {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export enum InputSource {
  HARDWARE_CONTROLLER = 'HARDWARE_CONTROLLER', // Control físico con 2 pulsadores + Mini Proyector
  TOUCH_SCREEN = 'TOUCH_SCREEN', // Modo Solo Celular o Tablet (Pantalla dividida en 2)
}

export class NavigateTreeDto {
  @IsUUID('4', { message: 'El patientId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del paciente es obligatorio' })
  patientId: string;

  @IsUUID('4', { message: 'El currentNodeId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El nodo actual es obligatorio' })
  currentNodeId: string;

  @IsEnum(NavigationSelection, {
    message: 'La selección debe ser LEFT o RIGHT',
  })
  selection: NavigationSelection;

  @IsEnum(InputSource, {
    message: 'El origen debe ser HARDWARE_CONTROLLER o TOUCH_SCREEN',
  })
  source: InputSource;
}

export class ResetTreeNavigationDto {
  @IsUUID('4', { message: 'El patientId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del paciente es obligatorio' })
  patientId: string;

  @IsOptional()
  @IsEnum(InputSource)
  source?: InputSource;
}

export class StepBackTreeDto {
  @IsUUID('4', { message: 'El patientId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del paciente es obligatorio' })
  patientId: string;

  @IsUUID('4', { message: 'El currentNodeId debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El nodo actual es obligatorio' })
  currentNodeId: string;

  @IsOptional()
  @IsEnum(InputSource)
  source?: InputSource;
}
