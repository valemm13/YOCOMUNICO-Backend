import {
  Injectable,
  NotFoundException,
  ConflictException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Patient,
  IntubationType,
  PatientDeviceMode,
  PatientIcuStatus,
} from './entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import {
  UpdatePatientDto,
  UpdateDeviceModeDto,
} from './dto/update-patient.dto';

@Injectable()
export class PatientsService implements OnModuleInit {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.patientRepository.count();
    if (count === 0) {
      this.logger.log(
        '🌱 Inicializando pacientes intubados de ejemplo en UCI...',
      );
      await this.seedDefaultPatients();
      this.logger.log('✅ Pacientes UCI inicializados.');
    }
  }

  async create(dto: CreatePatientDto): Promise<Patient> {
    const existing = await this.patientRepository.findOne({
      where: { documentNumber: dto.documentNumber.trim() },
    });

    if (existing) {
      throw new ConflictException(
        `Ya existe un paciente registrado con el documento ${dto.documentNumber}`,
      );
    }

    const patient = this.patientRepository.create({
      fullName: dto.fullName,
      documentNumber: dto.documentNumber.trim(),
      bedNumber: dto.bedNumber,
      age: dto.age,
      diagnosis: dto.diagnosis,
      intubationType: dto.intubationType ?? IntubationType.ENDOTRACHEAL,
      deviceMode: dto.deviceMode ?? PatientDeviceMode.HYBRID,
      deviceHardwareId: dto.deviceHardwareId,
      status: dto.status ?? PatientIcuStatus.ACTIVE_ICU,
      clinicalSummaryNotes: dto.clinicalSummaryNotes,
    });

    return this.patientRepository.save(patient);
  }

  async findAll(status?: PatientIcuStatus): Promise<Patient[]> {
    if (status) {
      return this.patientRepository.find({
        where: { status },
        order: { bedNumber: 'ASC', admittedAt: 'DESC' },
      });
    }
    return this.patientRepository.find({
      order: { bedNumber: 'ASC', admittedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Patient> {
    const patient = await this.patientRepository.findOne({ where: { id } });
    if (!patient) {
      throw new NotFoundException(`Paciente con ID ${id} no encontrado en UCI`);
    }
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto): Promise<Patient> {
    const patient = await this.findOne(id);
    Object.assign(patient, dto);
    return this.patientRepository.save(patient);
  }

  async updateDeviceMode(
    id: string,
    dto: UpdateDeviceModeDto,
  ): Promise<Patient> {
    const patient = await this.findOne(id);
    patient.deviceMode = dto.deviceMode;
    if (dto.deviceHardwareId !== undefined) {
      patient.deviceHardwareId = dto.deviceHardwareId;
    }
    return this.patientRepository.save(patient);
  }

  async updateCurrentNode(
    patientId: string,
    nodeId: string | null,
  ): Promise<void> {
    await this.patientRepository.update(
      { id: patientId },
      { currentNodeId: nodeId },
    );
  }

  private async seedDefaultPatients(): Promise<void> {
    const samplePatients: Partial<Patient>[] = [
      {
        fullName: 'Carlos Andrés Mendoza',
        documentNumber: '1032456789',
        bedNumber: 'UCI-Cama-01',
        age: 58,
        diagnosis:
          'Insuficiencia respiratoria aguda post-quirúrgica - Ventilación Mecánica Invasiva con sedación ligera (RASS 0)',
        intubationType: IntubationType.ENDOTRACHEAL,
        deviceMode: PatientDeviceMode.HARDWARE_CONTROLLER,
        deviceHardwareId: 'CTRL-POLYMER-001',
        status: PatientIcuStatus.ACTIVE_ICU,
        clinicalSummaryNotes:
          'Paciente consciente, usa control de polímero de 2 botones + mini proyector en techo/bandeja.',
      },
      {
        fullName: 'María Fernanda Salazar',
        documentNumber: '52890123',
        bedNumber: 'UCI-Cama-02',
        age: 42,
        diagnosis:
          'Neumonía bilateral severa en proceso de destete ventilatorio (Weaning) - Consciente sin voz',
        intubationType: IntubationType.ENDOTRACHEAL,
        deviceMode: PatientDeviceMode.TOUCH_SCREEN,
        deviceHardwareId: 'MOBILE-APP-CAMA-02',
        status: PatientIcuStatus.ACTIVE_ICU,
        clinicalSummaryNotes:
          'Paciente consciente en modo SOLO CELULAR (pantalla dividida en 2 grandes secciones táctiles).',
      },
      {
        fullName: 'Jorge Eliécer Quintana',
        documentNumber: '79451236',
        bedNumber: 'UCI-Cama-03',
        age: 67,
        diagnosis:
          'EPOC exacerbado con traqueostomía percutánea - Debilidad muscular adquirida en UCI',
        intubationType: IntubationType.TRACHEOSTOMY,
        deviceMode: PatientDeviceMode.HYBRID,
        deviceHardwareId: 'HYBRID-UCI-003',
        status: PatientIcuStatus.ACTIVE_ICU,
        clinicalSummaryNotes:
          'Modo híbrido activo: puede pulsar los 2 botones del control o tocar las 2 mitades del celular.',
      },
    ];

    await this.patientRepository.save(
      this.patientRepository.create(samplePatients),
    );
  }
}
