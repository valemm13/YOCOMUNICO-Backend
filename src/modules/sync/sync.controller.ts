import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { SyncService } from './sync.service';

@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /**
   * GET /api/sync/ward-overview
   * Estado consolidado en la nube de toda la planta UCI (pacientes, resumen de su Excel,
   * alertas activas y sesiones de proyector/celular) para relevos de turno médico.
   */
  @Get('ward-overview')
  async getWardOverview() {
    return this.syncService.getCloudWardOverview();
  }

  /**
   * GET /api/sync/session/:patientId
   * Devuelve el estado actual de la sesión binaria en el dispositivo del paciente
   * (compatible tanto con modo Solo Celular como con Control Físico de 2 Botones + Mini Proyector).
   */
  @Get('session/:patientId')
  getPatientSession(
    @Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string,
  ) {
    return {
      patientId,
      session: this.syncService.getPatientDeviceSession(patientId),
    };
  }
}
