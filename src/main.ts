import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // 1. Prefijo global para las rutas (ej. /api/binary-tree, /api/patients, /api/clinical-records)
  app.setGlobalPrefix('api');

  // 2. Habilitar CORS para permitir la conexión desde la app médica y el hardware/celular
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // 3. Filtro global de excepciones estandarizado
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // 4. Validación estricta según las directrices de Agents.md
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remueve cualquier propiedad extra no definida en los DTOs
      forbidNonWhitelisted: true, // Lanza error si envían campos sospechosos
      transform: true, // Convierte tipos automáticamente según las clases DTO
    }),
  );

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`🚀 Servidor UCI corriendo en http://localhost:${port}/api`);
}
void bootstrap();
