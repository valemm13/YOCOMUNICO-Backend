import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreeNode } from './entities/tree-node.entity';
import { BinaryTreeService } from './service/binary-tree.service';
import { BinaryTreeController } from './controllers/binary-tree.controller';
import { ClinicalRecordsModule } from '../clinical-records/clinical-records.module';
import { EmergencyModule } from '../emergency/emergency.module';
import { PatientsModule } from '../patients/patients.module';
import { SyncModule } from '../sync/sync.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TreeNode]),
    ClinicalRecordsModule,
    EmergencyModule,
    PatientsModule,
    SyncModule,
  ],
  controllers: [BinaryTreeController],
  providers: [BinaryTreeService],
  exports: [BinaryTreeService],
})
export class BinaryTreeModule {}
