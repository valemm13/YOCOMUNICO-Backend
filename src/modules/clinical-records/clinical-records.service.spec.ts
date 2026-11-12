import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClinicalRecordsService } from './clinical-records.service';
import {
  ClinicalRecord,
  ButtonPressAudit,
  ClinicalRecordStatus,
} from './entities/clinical-record.entity';
import { PatientsService } from '../patients/patients.service';
import { EmergencyGateway } from '../emergency/emergency.gateway';
import {
  IntubationType,
  PatientDeviceMode,
  PatientIcuStatus,
} from '../patients/entities/patient.entity';
import { SeverityLevel } from '../binary-tree/entities/tree-node.entity';
import { InputSource } from '../binary-tree/dtos/navigate-tree.dto';
import { MedicalShift } from '../auth/entities/medical-user.entity';

describe('ClinicalRecordsService (Vista Excel, Relevos y Exportación CSV)', () => {
  let service: ClinicalRecordsService;

  const samplePatient = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    fullName: 'María Fernanda Salazar',
    documentNumber: '52890123',
    bedNumber: 'UCI-Cama-02',
    age: 42,
    diagnosis: 'Neumonía bilateral severa',
    intubationType: IntubationType.ENDOTRACHEAL,
    deviceMode: PatientDeviceMode.TOUCH_SCREEN,
    status: PatientIcuStatus.ACTIVE_ICU,
  };

  const mockClinicalRecordRepo = {
    create: jest.fn((dto: Partial<ClinicalRecord>) => ({
      id: 'record-uuid-1',
      createdAt: new Date('2026-11-11T10:00:00Z'),
      updatedAt: new Date('2026-11-11T10:00:00Z'),
      ...dto,
    })),
    save: jest.fn((entity: ClinicalRecord) => Promise.resolve(entity)),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockButtonAuditRepo = {
    create: jest.fn((dto: Partial<ButtonPressAudit>) => ({
      id: 'audit-uuid-1',
      timestamp: new Date(),
      ...dto,
    })),
    save: jest.fn((entity: ButtonPressAudit) => Promise.resolve(entity)),
    find: jest.fn(),
  };

  const mockPatientsService = {
    findOne: jest.fn().mockResolvedValue(samplePatient),
  };

  const mockEmergencyGateway = {
    broadcastNewExcelRow: jest.fn(),
    broadcastObservationUpdated: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicalRecordsService,
        {
          provide: getRepositoryToken(ClinicalRecord),
          useValue: mockClinicalRecordRepo,
        },
        {
          provide: getRepositoryToken(ButtonPressAudit),
          useValue: mockButtonAuditRepo,
        },
        {
          provide: PatientsService,
          useValue: mockPatientsService,
        },
        {
          provide: EmergencyGateway,
          useValue: mockEmergencyGateway,
        },
      ],
    }).compile();

    service = module.get<ClinicalRecordsService>(ClinicalRecordsService);
  });

  it('Registra observaciones médicas en la nube y notifica en tiempo real para relevos de turno', async () => {
    const saved = await service.addDoctorObservationToPatient(
      samplePatient.id,
      {
        doctorObservations:
          'Se realizó aspiración de secreciones y se humedecieron labios. Paciente tranquila para entrega de turno tarde.',
        attendedByDoctorName: 'Dra. Valerie Marmolejo',
        shift: MedicalShift.MORNING,
      },
    );

    expect(saved.doctorObservations).toContain('entrega de turno');
    expect(saved.attendedByDoctorName).toBe('Dra. Valerie Marmolejo');
    expect(saved.status).toBe(ClinicalRecordStatus.ATTENDED);
    expect(
      mockEmergencyGateway.broadcastObservationUpdated,
    ).toHaveBeenCalledWith(
      samplePatient.id,
      expect.objectContaining({
        patientName: samplePatient.fullName,
        bedNumber: samplePatient.bedNumber,
      }),
    );
  });

  it('Genera la vista tipo Excel del paciente y exporta CSV con UTF-8 BOM', async () => {
    mockClinicalRecordRepo.find.mockResolvedValueOnce([
      {
        id: 'row-1',
        patient: samplePatient,
        nodeCode: 'B1.2.1.2.1',
        category: 'Gratitud y Alegría',
        symptomOrMessage: 'Estoy Feliz y Muy Agradecido con el Equipo Médico',
        clinicalDescription: 'Expresión de gratitud hacia médicos',
        navigationBreadcrumb:
          'Estado Emocional y Mensajes ➔ Estado Emocional ➔ Bienestar ➔ Estoy Feliz y Muy Agradecido',
        stepsCount: 4,
        severityLevel: SeverityLevel.LOW,
        isEmergency: false,
        source: InputSource.TOUCH_SCREEN,
        status: ClinicalRecordStatus.ATTENDED,
        attendedByDoctorName: 'Dr. Samuel Ríos',
        doctorObservations:
          'Paciente orientada y animada tras visita familiar.',
        shift: MedicalShift.AFTERNOON,
        createdAt: new Date('2026-11-11T15:30:00Z'),
        updatedAt: new Date('2026-11-11T15:35:00Z'),
      },
    ]);

    const csvResult = await service.exportPatientExcelCsv(samplePatient.id);

    expect(csvResult.filename).toContain('UCI-Cama-02');
    expect(csvResult.csvContent.startsWith('\uFEFF')).toBe(true);
    expect(csvResult.csvContent).toContain(
      'Estoy Feliz y Muy Agradecido con el Equipo Médico',
    );
    expect(csvResult.csvContent).toContain('Solo Celular / Pantalla Táctil');
  });
});
