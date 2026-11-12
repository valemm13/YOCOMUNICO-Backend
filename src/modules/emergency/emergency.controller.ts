import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { EmergencyService } from './emergency.service';
import { TriggerPanicDto, ResolveEmergencyDto } from './dto/emergency.dto';

@Controller('emergency')
export class EmergencyController {
  constructor(private readonly emergencyService: EmergencyService) {}

  /**
   * POST /api/emergency/panic
   * Dispara una llamada de emergencia inmediata desde el control de 2 botones o desde el celular (Regla 2 de AGENTS.md).
   */
  @Post('panic')
  async triggerPanic(@Body() dto: TriggerPanicDto) {
    return this.emergencyService.triggerDirectPanic(dto);
  }

  /**
   * GET /api/emergency/active
   * Lista todas las alertas de emergencia activas o en atención en la planta UCI.
   */
  @Get('active')
  async getActiveAlerts() {
    return this.emergencyService.findActiveAlerts();
  }

  /**
   * GET /api/emergency/patient/:patientId
   * Obtiene el historial de llamadas de emergencia de un paciente específico.
   */
  @Get('patient/:patientId')
  async getPatientAlerts(
    @Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string,
  ) {
    return this.emergencyService.findAllByPatient(patientId);
  }

  /**
   * PATCH /api/emergency/:id/resolve
   * Permite al médico o enfermero atender o resolver una alerta de emergencia activa.
   */
  @Patch(':id/resolve')
  async resolveAlert(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: ResolveEmergencyDto,
  ) {
    return this.emergencyService.resolveOrUpdateAlert(id, dto);
  }
}
