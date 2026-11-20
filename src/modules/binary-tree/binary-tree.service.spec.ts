import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BinaryTreeService } from './service/binary-tree.service';
import { TreeNode, SeverityLevel } from './entities/tree-node.entity';
import { ClinicalRecordsService } from '../clinical-records/clinical-records.service';
import { EmergencyService } from '../emergency/emergency.service';
import { PatientsService } from '../patients/patients.service';
import { SyncService } from '../sync/sync.service';
import { InputSource, NavigationSelection } from './dtos/navigate-tree.dto';
import {
  CLINICAL_BINARY_TREE_SEED,
  ClinicalSeedNodeSpec,
} from './data/clinical-tree-seed.data';

describe('BinaryTreeService & Reglas de AGENTS.md', () => {
  let service: BinaryTreeService;

  const mockRepository = {
    count: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((dto: Partial<TreeNode>) => ({
      id: `uuid-${dto.code}`,
      ...dto,
    })),
    save: jest.fn((entity: TreeNode) => Promise.resolve(entity)),
    deleteAll: jest.fn(),
  };

  const mockClinicalRecordsService = {
    recordButtonPressAudit: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    recordLeafSymptomToPatientExcel: jest
      .fn()
      .mockResolvedValue({ id: 'excel-row-1' }),
  };

  const mockEmergencyService = {
    triggerFromCriticalNode: jest.fn().mockResolvedValue({ id: 'alert-911' }),
  };

  const mockPatientsService = {
    updateCurrentNode: jest.fn().mockResolvedValue(undefined),
  };

  const mockSyncService = {
    cacheBinaryPair: jest.fn(),
    getCachedBinaryPair: jest.fn().mockReturnValue(undefined),
    clearTreeCache: jest.fn(),
    updatePatientDeviceSession: jest.fn(),
    notifyLeafReached: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BinaryTreeService,
        {
          provide: getRepositoryToken(TreeNode),
          useValue: mockRepository,
        },
        {
          provide: ClinicalRecordsService,
          useValue: mockClinicalRecordsService,
        },
        {
          provide: EmergencyService,
          useValue: mockEmergencyService,
        },
        {
          provide: PatientsService,
          useValue: mockPatientsService,
        },
        {
          provide: SyncService,
          useValue: mockSyncService,
        },
      ],
    }).compile();

    service = module.get<BinaryTreeService>(BinaryTreeService);
  });

  it('Verifica que todos los nodos internos de CLINICAL_BINARY_TREE_SEED sean estrictamente binarios (left y right)', () => {
    const verifyNode = (node: ClinicalSeedNodeSpec) => {
      const hasLeft = Boolean(node.left);
      const hasRight = Boolean(node.right);
      // Todo nodo interno debe tener exactamente 2 opciones (izquierda y derecha)
      expect(hasLeft).toBe(hasRight);
      if (node.left) verifyNode(node.left);
      if (node.right) verifyNode(node.right);
    };

    verifyNode(CLINICAL_BINARY_TREE_SEED);
  });

  it('Regla 1: getRootPair devuelve únicamente leftNode y rightNode (Sección A y Sección B)', async () => {
    mockRepository.findOne.mockResolvedValueOnce({
      id: 'uuid-root',
      code: 'ROOT',
      label: 'Menú Principal UCI',
      level: 0,
      leftNode: {
        id: 'uuid-A',
        code: 'A',
        category: 'Dolor y Necesidades Físicas',
        label: 'Dolor y Necesidades Físicas',
        isLeaf: false,
        isEmergency: false,
        severityLevel: SeverityLevel.MEDIUM,
      },
      rightNode: {
        id: 'uuid-B',
        code: 'B',
        category: 'Estado Emocional y Mensajes',
        label: 'Estado Emocional y Mensajes',
        isLeaf: false,
        isEmergency: false,
        severityLevel: SeverityLevel.LOW,
      },
    });

    const pair = await service.getRootPair();

    expect(pair.currentNodeId).toBe('uuid-root');
    expect(pair.leftNode?.code).toBe('A');
    expect(pair.rightNode?.code).toBe('B');
    expect(mockSyncService.cacheBinaryPair).toHaveBeenCalled();
  });

  it('Reglas 2, 3 y 5: Al alcanzar una hoja crítica (ej. Falta de Aire / Asfixia), audita el botón, dispara emergencia y crea fila en el Excel del paciente', async () => {
    const parentNode = {
      id: 'uuid-A2.2',
      code: 'A2.2',
      label: 'Temperatura vs Falta de Aire',
      level: 3,
      leftNode: { id: 'uuid-A2.2.1', code: 'A2.2.1' },
      rightNode: { id: 'uuid-A2.2.2', code: 'A2.2.2' },
    };

    const criticalLeafNode = {
      id: 'uuid-A2.2.2',
      code: 'A2.2.2',
      category: 'Emergencia Respiratoria Vital',
      label: 'Falta de Aire / Asfixia',
      description: 'Dificultad respiratoria severa',
      icon: 'lungs-alert',
      level: 4,
      isLeaf: true,
      isEmergency: true,
      severityLevel: SeverityLevel.CRITICAL,
      parentNode: { id: 'uuid-root', code: 'ROOT', label: 'ROOT' },
      leftNode: null,
      rightNode: null,
    };

    mockRepository.findOne
      .mockResolvedValueOnce(parentNode) // 1. currentNode
      .mockResolvedValueOnce(criticalLeafNode) // 2. fullSelected
      .mockResolvedValueOnce({ code: 'ROOT', label: 'ROOT' }) // 3. breadcrumb parent
      .mockResolvedValueOnce({
        // 4. getRootPair para reiniciar puntero del paciente
        id: 'uuid-root',
        code: 'ROOT',
        label: 'Menú Principal UCI',
        level: 0,
        leftNode: {
          id: 'uuid-A',
          code: 'A',
          label: 'A',
          isLeaf: false,
          isEmergency: false,
        },
        rightNode: {
          id: 'uuid-B',
          code: 'B',
          label: 'B',
          isLeaf: false,
          isEmergency: false,
        },
      });

    const result = await service.navigate({
      patientId: '550e8400-e29b-41d4-a716-446655440000',
      currentNodeId: 'uuid-A2.2',
      selection: NavigationSelection.RIGHT,
      source: InputSource.HARDWARE_CONTROLLER,
    });

    expect(result.isLeaf).toBe(true);
    expect(result.isEmergency).toBe(true);
    expect(result.clinicalRecordId).toBe('excel-row-1');
    expect(result.emergencyAlertId).toBe('alert-911');
    expect(result.nextPair).toBeNull();
    expect(
      mockClinicalRecordsService.recordButtonPressAudit,
    ).toHaveBeenCalledTimes(1);
    expect(mockEmergencyService.triggerFromCriticalNode).toHaveBeenCalledTimes(
      1,
    );
    expect(
      mockClinicalRecordsService.recordLeafSymptomToPatientExcel,
    ).toHaveBeenCalledTimes(1);
  });

  it('Soporta navegación en Modo Solo Celular (TOUCH_SCREEN) descartando la mitad no elegida y devolviendo las siguientes 2 opciones', async () => {
    const emotionNodeB1 = {
      id: 'uuid-B1',
      code: 'B1',
      label: 'Estado Emocional',
      level: 2,
      leftNode: { id: 'uuid-B1.1', code: 'B1.1' },
      rightNode: { id: 'uuid-B1.2', code: 'B1.2' },
    };

    const positiveEmotionBranchB1_2 = {
      id: 'uuid-B1.2',
      code: 'B1.2',
      category: 'Emociones Positivas, Familia y Apoyo Médico',
      label: 'Bienestar / Calma / Felicidad vs Familia / Médico',
      level: 3,
      isLeaf: false,
      isEmergency: false,
      severityLevel: SeverityLevel.LOW,
      leftNode: {
        id: 'uuid-B1.2.1',
        code: 'B1.2.1',
        label: 'Calma y Alivio vs Felicidad, Gratitud y Esperanza',
        isLeaf: false,
        isEmergency: false,
      },
      rightNode: {
        id: 'uuid-B1.2.2',
        code: 'B1.2.2',
        label: 'Deseo de Ver a la Familia vs Explicación Médica',
        isLeaf: false,
        isEmergency: false,
      },
    };

    mockRepository.findOne
      .mockResolvedValueOnce(emotionNodeB1)
      .mockResolvedValueOnce(positiveEmotionBranchB1_2);

    const response = await service.navigate({
      patientId: '550e8400-e29b-41d4-a716-446655440000',
      currentNodeId: 'uuid-B1',
      selection: NavigationSelection.RIGHT,
      source: InputSource.TOUCH_SCREEN,
    });

    expect(response.isLeaf).toBe(false);
    expect(response.nextPair).not.toBeNull();
    expect(response.nextPair?.leftNode?.code).toBe('B1.2.1');
    expect(response.nextPair?.rightNode?.code).toBe('B1.2.2');
    expect(mockSyncService.updatePatientDeviceSession).toHaveBeenCalledWith(
      expect.objectContaining({
        inputMode: InputSource.TOUCH_SCREEN,
        currentNodeCode: 'B1.2',
      }),
    );
  });
});
