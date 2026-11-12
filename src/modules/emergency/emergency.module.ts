import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmergencyAlert } from './entities/emergency-alert.entity';
import { EmergencyGateway } from './emergency.gateway';
import { EmergencyService } from './emergency.service';
import { EmergencyController } from './emergency.controller';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [TypeOrmModule.forFeature([EmergencyAlert]), PatientsModule],
  controllers: [EmergencyController],
  providers: [EmergencyGateway, EmergencyService],
  exports: [EmergencyGateway, EmergencyService],
})
export class EmergencyModule {}
