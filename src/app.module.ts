import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import databaseConfig from './config/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BinaryTreeModule } from './modules/binary-tree/binary-tree.module';

@Module({
  imports: [
    // 1. Variables de entorno globales
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      envFilePath: '.env',
    }),

    // 2. Base de datos TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
      inject: [ConfigService],
    }),

    // 3. Módulos de dominio del sistema UCI
    BinaryTreeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}