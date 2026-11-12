import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterStaffDto } from './dto/login.dto';
import { CreateHandoverDto } from './dto/handover.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/login
   * Autenticación de médicos y enfermeros al iniciar su turno en la planta UCI.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * POST /api/auth/register
   * Registra un nuevo médico o enfermero en la plataforma UCI en la nube.
   */
  @Post('register')
  async register(@Body() registerDto: RegisterStaffDto) {
    return this.authService.register(registerDto);
  }

  /**
   * GET /api/auth/staff
   * Lista el personal médico activo para selección rápida en relevos de turno y observaciones.
   */
  @Get('staff')
  async getStaffList() {
    return this.authService.findAllStaff();
  }

  /**
   * POST /api/auth/handover
   * Registra en la nube el relevo/entrega de turno entre médicos en la planta UCI.
   */
  @Post('handover')
  async createShiftHandover(@Body() handoverDto: CreateHandoverDto) {
    return this.authService.createShiftHandover(handoverDto);
  }

  /**
   * GET /api/auth/handovers
   * Obtiene el historial de relevos de turno médico almacenado en la nube.
   */
  @Get('handovers')
  async getShiftHandovers() {
    return this.authService.getShiftHandovers();
  }
}
