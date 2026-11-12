import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  MedicalUser,
  MedicalShift,
  ShiftHandover,
} from './entities/medical-user.entity';
import { LoginDto, RegisterStaffDto } from './dto/login.dto';
import { CreateHandoverDto } from './dto/handover.dto';
import { StaffRole } from '../../common/decorators/roles.decorator';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(MedicalUser)
    private readonly medicalUserRepository: Repository<MedicalUser>,
    @InjectRepository(ShiftHandover)
    private readonly shiftHandoverRepository: Repository<ShiftHandover>,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.medicalUserRepository.count();
    if (count === 0) {
      this.logger.log('🌱 Inicializando personal médico de turnos UCI...');
      await this.seedDefaultStaff();
      this.logger.log('✅ Personal médico UCI inicializado.');
    }
  }

  private hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  }

  private generateToken(user: MedicalUser): string {
    const payload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      shift: user.shift,
      iat: Date.now(),
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
  }

  async login(dto: LoginDto) {
    const user = await this.medicalUserRepository.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user || user.passwordHash !== this.hashPassword(dto.password)) {
      throw new UnauthorizedException('Credenciales médicas inválidas');
    }

    if (dto.shift && dto.shift !== user.shift) {
      user.shift = dto.shift;
      await this.medicalUserRepository.save(user);
    }

    return {
      accessToken: this.generateToken(user),
      staff: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        shift: user.shift,
        specialty: user.specialty,
      },
    };
  }

  async register(dto: RegisterStaffDto) {
    const existing = await this.medicalUserRepository.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un miembro del personal médico con el correo ${dto.email}`,
      );
    }

    const staff = this.medicalUserRepository.create({
      fullName: dto.fullName,
      email: dto.email.toLowerCase().trim(),
      passwordHash: this.hashPassword(dto.password),
      role: dto.role,
      shift: dto.shift,
      specialty: dto.specialty || 'Medicina Crítica y Cuidado Intensivo',
      isActive: true,
    });

    const saved = await this.medicalUserRepository.save(staff);

    return {
      accessToken: this.generateToken(saved),
      staff: {
        id: saved.id,
        fullName: saved.fullName,
        email: saved.email,
        role: saved.role,
        shift: saved.shift,
        specialty: saved.specialty,
      },
    };
  }

  async findAllStaff(): Promise<Omit<MedicalUser, 'passwordHash'>[]> {
    const users = await this.medicalUserRepository.find({
      where: { isActive: true },
      order: { shift: 'ASC', fullName: 'ASC' },
    });

    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      shift: u.shift,
      specialty: u.specialty,
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));
  }

  async findById(id: string): Promise<MedicalUser> {
    const user = await this.medicalUserRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Personal médico con ID ${id} no encontrado`);
    }
    return user;
  }

  async createShiftHandover(dto: CreateHandoverDto) {
    const outgoingStaff = await this.findById(dto.outgoingStaffId);
    const incomingStaff = await this.findById(dto.incomingStaffId);

    incomingStaff.shift = dto.toShift;
    await this.medicalUserRepository.save(incomingStaff);

    const handover = this.shiftHandoverRepository.create({
      outgoingStaff,
      incomingStaff,
      fromShift: dto.fromShift,
      toShift: dto.toShift,
      generalWardNotes: dto.generalWardNotes,
      activePatientsCount: dto.activePatientsCount ?? 0,
      pendingEmergenciesCount: dto.pendingEmergenciesCount ?? 0,
    });

    const saved = await this.shiftHandoverRepository.save(handover);
    return {
      id: saved.id,
      fromShift: saved.fromShift,
      toShift: saved.toShift,
      outgoingStaff: {
        id: outgoingStaff.id,
        fullName: outgoingStaff.fullName,
        role: outgoingStaff.role,
      },
      incomingStaff: {
        id: incomingStaff.id,
        fullName: incomingStaff.fullName,
        role: incomingStaff.role,
      },
      generalWardNotes: saved.generalWardNotes,
      activePatientsCount: saved.activePatientsCount,
      pendingEmergenciesCount: saved.pendingEmergenciesCount,
      handoverTimestamp: saved.handoverTimestamp,
    };
  }

  async getShiftHandovers() {
    const handovers = await this.shiftHandoverRepository.find({
      relations: {
        outgoingStaff: true,
        incomingStaff: true,
      },
      order: { handoverTimestamp: 'DESC' },
      take: 30,
    });

    return handovers.map((h) => ({
      id: h.id,
      fromShift: h.fromShift,
      toShift: h.toShift,
      outgoingStaff: {
        id: h.outgoingStaff.id,
        fullName: h.outgoingStaff.fullName,
        role: h.outgoingStaff.role,
      },
      incomingStaff: {
        id: h.incomingStaff.id,
        fullName: h.incomingStaff.fullName,
        role: h.incomingStaff.role,
      },
      generalWardNotes: h.generalWardNotes,
      activePatientsCount: h.activePatientsCount,
      pendingEmergenciesCount: h.pendingEmergenciesCount,
      handoverTimestamp: h.handoverTimestamp,
    }));
  }

  private async seedDefaultStaff(): Promise<void> {
    const defaultStaff: Partial<MedicalUser>[] = [
      {
        fullName: 'Dra. Valerie Marmolejo (Turno Mañana)',
        email: 'valerie.uci@hospital.org',
        passwordHash: this.hashPassword('uci12345'),
        role: StaffRole.DOCTOR,
        shift: MedicalShift.MORNING,
        specialty: 'Medicina Crítica y Cuidado Intensivo',
        isActive: true,
      },
      {
        fullName: 'Dr. Samuel Ríos (Turno Tarde - Relevo)',
        email: 'samuel.uci@hospital.org',
        passwordHash: this.hashPassword('uci12345'),
        role: StaffRole.DOCTOR,
        shift: MedicalShift.AFTERNOON,
        specialty: 'Intensivista Planta UCI',
        isActive: true,
      },
      {
        fullName: 'Enf. Jefe Laura Gómez (Turno Noche)',
        email: 'laura.enfermeria@hospital.org',
        passwordHash: this.hashPassword('uci12345'),
        role: StaffRole.NURSE,
        shift: MedicalShift.NIGHT,
        specialty: 'Enfermería de Cuidado Crítico y VMI',
        isActive: true,
      },
    ];

    await this.medicalUserRepository.save(
      this.medicalUserRepository.create(defaultStaff),
    );
  }
}
