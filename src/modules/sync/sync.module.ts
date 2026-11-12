import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { PatientsModule } from '../patients/patients.module';
import { ClinicalRecordsModule } from '../clinical-records/clinical-records.module';
import { EmergencyModule } from '../emergency/emergency.module';

@Module({
  imports: [PatientsModule, ClinicalRecordsModule, EmergencyModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}
