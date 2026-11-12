import { IsUUID, IsEnum, IsNotEmpty } from 'class-validator';

export enum NavigationSelection {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export enum InputSource {
  HARDWARE_CONTROLLER = 'HARDWARE_CONTROLLER', // Control físico con pulsadores
  TOUCH_SCREEN = 'TOUCH_SCREEN',               // App en tablet o pantalla táctil
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