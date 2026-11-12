import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import { ClinicalRecordsService } from './clinical-records.service';
import {
  CreateDoctorObservationDto,
  UpdateExcelRowObservationDto,
} from './dto/add-observation.dto';

@Controller('clinical-records')
export class ClinicalRecordsController {
  constructor(
    private readonly clinicalRecordsService: ClinicalRecordsService,
  ) {}

  /**
   * GET /api/clinical-records/patient/:patientId/excel
   * Obtiene la tabla estructurada tipo "Excel" del paciente seleccionado por el médico,
   * con todos sus síntomas reportados (hojas alcanzadas) y las observaciones médicas de todos los turnos.
   */
  @Get('patient/:patientId/excel')
  async getPatientExcel(
    @Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string,
  ) {
    return this.clinicalRecordsService.getPatientExcelSheet(patientId);
  }

  /**
   * GET /api/clinical-records/patient/:patientId/export-csv
   * Descarga el archivo CSV compatible directamente con Microsoft Excel del paciente seleccionado.
   */
  @Get('patient/:patientId/export-csv')
  async exportPatientExcelCsv(
    @Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string,
    @Res() res: Response,
  ) {
    const { filename, csvContent } =
      await this.clinicalRecordsService.exportPatientExcelCsv(patientId);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  }

  /**
   * POST /api/clinical-records/patient/:patientId/observations
   * Agrega una observación médica general en el Excel del paciente (guardada en la nube para relevos de turno).
   */
  @Post('patient/:patientId/observations')
  async addDoctorObservation(
    @Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string,
    @Body() dto: CreateDoctorObservationDto,
  ) {
    return this.clinicalRecordsService.addDoctorObservationToPatient(
      patientId,
      dto,
    );
  }

  /**
   * PATCH /api/clinical-records/:recordId/observations
   * Agrega o actualiza la observación del médico sobre una fila específica del Excel del paciente
   * y actualiza su estado (ej. ATTENDED).
   */
  @Patch(':recordId/observations')
  async updateExcelRowObservation(
    @Param('recordId', new ParseUUIDPipe({ version: '4' })) recordId: string,
    @Body() dto: UpdateExcelRowObservationDto,
  ) {
    return this.clinicalRecordsService.updateExcelRowObservation(recordId, dto);
  }

  /**
   * GET /api/clinical-records/patient/:patientId/audit-trail
   * Devuelve la auditoría de cada pulsación individual de botón (Regla 3 de AGENTS.md).
   */
  @Get('patient/:patientId/audit-trail')
  async getPatientAuditTrail(
    @Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string,
  ) {
    return this.clinicalRecordsService.getPatientButtonAuditTrail(patientId);
  }
}
