import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { BinaryPairPayload } from '../../common/interfaces/binary-payload.interface';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/uci',
})
export class EmergencyGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EmergencyGateway.name);

  afterInit(): void {
    this.logger.log(
      '⚡ WebSocket Gateway UCI activo en namespace /uci (Emergencias, Excel en Vivo y Proyector)',
    );
  }

  handleConnection(client: Socket): void {
    this.logger.debug(`Cliente conectado a UCI Realtime: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`Cliente desconectado de UCI Realtime: ${client.id}`);
  }

  /**
   * El médico se une a la central de monitoreo general o a la vista Excel de un paciente específico.
   */
  @SubscribeMessage('join:medical-station')
  handleJoinMedicalStation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload?: { patientId?: string },
  ) {
    void client.join('medical-station');
    if (payload?.patientId) {
      void client.join(`patient-excel:${payload.patientId}`);
    }
    return {
      event: 'joined:medical-station',
      data: {
        status: 'CONNECTED',
        watchingPatientId: payload?.patientId ?? 'ALL',
      },
    };
  }

  /**
   * El mini-proyector o el celular del paciente se suscribe a su sala exclusiva para actualizar las 2 secciones en vivo.
   */
  @SubscribeMessage('join:patient-device')
  handleJoinPatientDevice(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { patientId: string },
  ) {
    if (payload?.patientId) {
      void client.join(`patient-device:${payload.patientId}`);
    }
    return {
      event: 'joined:patient-device',
      data: {
        status: 'SYNCED',
        patientId: payload?.patientId,
      },
    };
  }

  /**
   * Regla 2 de AGENTS.md: Dispara notificación de prioridad máxima e interrupción inmediata vía WebSockets.
   */
  broadcastCriticalEmergency(alertPayload: Record<string, unknown>): void {
    if (!this.server) return;
    this.server.to('medical-station').emit('emergency:critical', alertPayload);
    this.server.emit('emergency:alert', alertPayload);
  }

  /**
   * Notifica cuando una emergencia cambia de estado (ATTENDING / RESOLVED).
   */
  broadcastEmergencyStatusUpdate(alertPayload: Record<string, unknown>): void {
    if (!this.server) return;
    this.server.to('medical-station').emit('emergency:updated', alertPayload);
    this.server.emit('emergency:status-changed', alertPayload);
  }

  /**
   * Regla 5 de AGENTS.md: Actualiza en tiempo real la vista de tabla/Excel del médico cuando el paciente llega a una hoja.
   */
  broadcastNewExcelRow(
    patientId: string,
    excelRowPayload: Record<string, unknown>,
  ): void {
    if (!this.server) return;
    this.server
      .to('medical-station')
      .to(`patient-excel:${patientId}`)
      .emit('clinical-record:excel-row-added', excelRowPayload);
  }

  /**
   * Regla 5 de AGENTS.md: Actualiza en tiempo real la vista Excel cuando un médico agrega o edita observaciones clínicas en la nube.
   */
  broadcastObservationUpdated(
    patientId: string,
    recordPayload: Record<string, unknown>,
  ): void {
    if (!this.server) return;
    this.server
      .to('medical-station')
      .to(`patient-excel:${patientId}`)
      .emit('clinical-record:observation-updated', recordPayload);
  }

  /**
   * Regla 1 de AGENTS.md: Envía únicamente el par binario (leftNode, rightNode) al microproyector o celular del paciente.
   */
  emitBinaryPairToPatientDevice(
    patientId: string,
    pair: BinaryPairPayload,
  ): void {
    if (!this.server) return;
    this.server
      .to(`patient-device:${patientId}`)
      .emit('device:binary-pair-updated', pair);
  }
}
