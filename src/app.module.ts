import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { PatientsModule } from './modules/patients/patients.module';
import { BinaryTreeModule } from './modules/binary-tree/binary-tree.module';
import { ClinicalRecordsModule } from './modules/clinical-records/clinical-records.module';
import { EmergencyModule } from './modules/emergency/emergency.module';
import { SyncModule } from './modules/sync/sync.module';

@Module({
  imports: [
    // 1. Variables de entorno globales
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      envFilePath: '.env',
    }),

    // 2. Base de datos TypeORM (PostgreSQL en la nube / local)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        ...configService.get<TypeOrmModuleOptions>('database'),
      }),
      inject: [ConfigService],
    }),

    // 3. Módulos de dominio del sistema UCI según AGENTS.md
    AuthModule,
    PatientsModule,
    EmergencyModule,
    ClinicalRecordsModule,
    SyncModule,
    BinaryTreeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
