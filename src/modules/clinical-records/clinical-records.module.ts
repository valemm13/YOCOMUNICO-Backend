import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ClinicalRecord,
  ButtonPressAudit,
} from './entities/clinical-record.entity';
import { ClinicalRecordsService } from './clinical-records.service';
import { ClinicalRecordsController } from './clinical-records.controller';
import { PatientsModule } from '../patients/patients.module';
import { EmergencyModule } from '../emergency/emergency.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ClinicalRecord, ButtonPressAudit]),
    PatientsModule,
    EmergencyModule,
  ],
  controllers: [ClinicalRecordsController],
  providers: [ClinicalRecordsService],
  exports: [ClinicalRecordsService],
})
export class ClinicalRecordsModule {}
