import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import {
  UpdatePatientDto,
  UpdateDeviceModeDto,
} from './dto/update-patient.dto';
import { PatientIcuStatus } from './entities/patient.entity';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  /**
   * GET /api/patients
   * Permite al médico ver todos los pacientes de la planta antes de seleccionar uno y entrar a su Excel.
   */
  @Get()
  async findAll(@Query('status') status?: PatientIcuStatus) {
    return this.patientsService.findAll(status);
  }

  /**
   * GET /api/patients/:id
   * Obtiene el detalle de un paciente seleccionado por el médico o vinculado al dispositivo/celular.
   */
  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.patientsService.findOne(id);
  }

  /**
   * POST /api/patients
   * Registra un nuevo paciente intubado en la UCI.
   */
  @Post()
  async create(@Body() createPatientDto: CreatePatientDto) {
    return this.patientsService.create(createPatientDto);
  }

  /**
   * PATCH /api/patients/:id
   * Actualiza datos clínicos, cama o estado del paciente.
   */
  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updatePatientDto: UpdatePatientDto,
  ) {
    return this.patientsService.update(id, updatePatientDto);
  }

  /**
   * PATCH /api/patients/:id/device-mode
   * Alterna entre modo SOLO CELULAR (TOUCH_SCREEN), CONTROL FÍSICO + PROYECTOR (HARDWARE_CONTROLLER) o HÍBRIDO (HYBRID).
   */
  @Patch(':id/device-mode')
  async updateDeviceMode(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateDeviceModeDto,
  ) {
    return this.patientsService.updateDeviceMode(id, dto);
  }
}
