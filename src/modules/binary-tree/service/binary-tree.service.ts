import {
  Injectable,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TreeNode, SeverityLevel } from '../entities/tree-node.entity';
import {
  BinaryPairResponseDto,
  NodeOptionDto,
} from '../dtos/binary-response.dto';
import {
  InputSource,
  NavigateTreeDto,
  NavigationSelection,
  ResetTreeNavigationDto,
  StepBackTreeDto,
  NavigateResponseDto
} from '../dtos/navigate-tree.dto';
import {
  CLINICAL_BINARY_TREE_SEED,
  ClinicalSeedNodeSpec,
} from '../data/clinical-tree-seed.data';
import { ClinicalRecordsService } from '../../clinical-records/clinical-records.service';
import { EmergencyService } from '../../emergency/emergency.service';
import { PatientsService } from '../../patients/patients.service';
import { SyncService } from '../../sync/sync.service';

@Injectable()
export class BinaryTreeService implements OnModuleInit {
  private readonly logger = new Logger(BinaryTreeService.name);

  constructor(
    @InjectRepository(TreeNode)
    private readonly treeNodeRepository: Repository<TreeNode>,
    private readonly clinicalRecordsService: ClinicalRecordsService,
    private readonly emergencyService: EmergencyService,
    private readonly patientsService: PatientsService,
    private readonly syncService: SyncService,
  ) {}

  /**
   * Se ejecuta automáticamente al arrancar el servidor.
   * Si la tabla está vacía o el árbol quedó incompleto (por ejemplo, raíz sin hijos), pobla el árbol binario clínico completo.
   */
  async onModuleInit(): Promise<void> {
    const count = await this.treeNodeRepository.count();
    const root = await this.treeNodeRepository.findOne({
      where: { code: 'ROOT' },
      relations: { leftNode: true, rightNode: true },
    });

    if (count === 0 || !root || !root.leftNode || !root.rightNode) {
      this.logger.log(
        '🌱 Inicializando árbol binario clínico exhaustivo UCI...',
      );
      await this.reseedClinicalTree();
      this.logger.log('✅ Árbol binario clínico inicializado correctamente.');
    }
  }

  /**
   * Convierte un TreeNode de la BD en un NodeOptionDto liviano para el proyector/pantalla.
   * Regla 1 de AGENTS.md.
   */
  private toOptionDto(node: TreeNode | null): NodeOptionDto | null {
    if (!node) return null;

    return {
      id: node.id,
      code: node.code,
      category: node.category,
      label: node.label,
      description: node.description,
      icon: node.icon,
      isLeaf: node.isLeaf,
      isEmergency: node.isEmergency,
      severityLevel: node.severityLevel,
    };
  }

  /**
   * Obtiene la raíz del árbol (Nivel 0: Dolor y Físico vs. Emocional y Mensajes).
   */
  async getRootPair(): Promise<BinaryPairResponseDto> {
    const root = await this.treeNodeRepository.findOne({
      where: { code: 'ROOT' },
      relations: {
        leftNode: true,
        rightNode: true,
      },
    });

    if (!root) {
      throw new NotFoundException(
        'El nodo raíz del árbol no ha sido inicializado',
      );
    }

    const pair: BinaryPairResponseDto = {
      currentNodeId: root.id,
      currentNodeCode: root.code,
      currentNodeLabel: root.label,
      level: root.level,
      leftNode: this.toOptionDto(root.leftNode),
      rightNode: this.toOptionDto(root.rightNode),
    };

    this.syncService.cacheBinaryPair(root.id, pair);
    return pair;
  }

  /**
   * Devuelve únicamente los dos nodos hijos correspondientes a un nodo específico.
   * Cumple la Regla 1 de AGENTS.md (Payload binario liviano).
   */
  async getBinaryPair(nodeId: string): Promise<BinaryPairResponseDto> {
    const cached = this.syncService.getCachedBinaryPair(nodeId);
    if (cached) {
      return cached;
    }

    const node = await this.treeNodeRepository.findOne({
      where: { id: nodeId },
      relations: {
        leftNode: true,
        rightNode: true,
      },
    });

    if (!node) {
      throw new NotFoundException(`Nodo con ID ${nodeId} no encontrado`);
    }

    const pair: BinaryPairResponseDto = {
      currentNodeId: node.id,
      currentNodeCode: node.code,
      currentNodeLabel: node.label,
      level: node.level,
      leftNode: this.toOptionDto(node.leftNode),
      rightNode: this.toOptionDto(node.rightNode),
    };

    this.syncService.cacheBinaryPair(node.id, pair);
    return pair;
  }

  /**
   * Procesa la navegación cuando el paciente pulsa el botón IZQUIERDO o DERECHO
   * (tanto desde el Control Físico de 2 Botones + Mini Proyector como desde Modo Solo Celular).
   * Cumple las Reglas 1, 2, 3 y 5 de AGENTS.md.
   */
  /**
   * Procesa la pulsación del paciente y devuelve **toda** la información
   * que necesita la UI para decidir si muestra el pop‑up.
   */
  async navigate(dto: NavigateTreeDto): Promise<NavigateResponseDto> {
    const currentNode = await this.treeNodeRepository.findOne({
      where: { id: dto.currentNodeId },
      relations: {
        leftNode: true,
        rightNode: true,
      },
    });

    if (!currentNode) {
      throw new NotFoundException(
        `Nodo actual con ID ${dto.currentNodeId} no encontrado`,
      );
    }

    // 1. Elegimos la mitad que el paciente tocó (descartando la otra mitad)
    const selectedChild =
      dto.selection === NavigationSelection.LEFT
        ? currentNode.leftNode
        : currentNode.rightNode;

    if (!selectedChild) {
      throw new NotFoundException(
        'No existe una opción disponible en la dirección seleccionada',
      );
    }

    // 2. Cargamos el nodo completo (hijos + padre)
    const fullSelected = await this.treeNodeRepository.findOne({
      where: { id: selectedChild.id },
      relations: {
        leftNode: true,
        rightNode: true,
        parentNode: true,
      },
    });

    if (!fullSelected) {
      throw new NotFoundException('Error al cargar el nodo seleccionado');
    }

    // 3. REGLA 3 DE AGENTS.MD: Persistencia auditada de cada pulsación de botón
    await this.clinicalRecordsService.recordButtonPressAudit({
      patientId: dto.patientId,
      fromNode: currentNode,
      selectedNode: fullSelected,
      selection: dto.selection,
      source: dto.source,
    });

    // 4. REGLA 2 DE AGENTS.MD: Si el nodo es crítico (isEmergency = true), dispara alerta de prioridad máxima
    let emergencyAlertId: string | undefined;
    if (fullSelected.isEmergency) {
      const alert = await this.emergencyService.triggerFromCriticalNode(
        dto.patientId,
        fullSelected,
        dto.source,
      );
      emergencyAlertId = alert.id;
    }

    // 5. Si es un nodo hoja (síntoma o emoción específica alcanzada):
    //    - Se envía automáticamente al Excel del paciente en la app del médico (Regla 5)
    //    - Se reinicia la posición del paciente al nodo raíz para su próxima comunicación
    let nextPair: BinaryPairResponseDto | null = null;
    let clinicalRecordId: string | undefined;

    if (fullSelected.isLeaf) {
      const breadcrumb = await this.buildBreadcrumbPath(fullSelected);
      const record =
        await this.clinicalRecordsService.recordLeafSymptomToPatientExcel({
          patientId: dto.patientId,
          leafNode: fullSelected,
          source: dto.source,
          navigationBreadcrumb: breadcrumb,
        });
      clinicalRecordId = record.id;

      // Reinicio a la raíz (para la siguiente interacción)
      const rootPair = await this.getRootPair();
      await this.patientsService.updateCurrentNode(
        dto.patientId,
        rootPair.currentNodeId,
      );
      this.syncService.updatePatientDeviceSession({
        patientId: dto.patientId,
        currentNodeId: rootPair.currentNodeId,
        currentNodeCode: rootPair.currentNodeCode ?? 'ROOT',
        level: 0,
        inputMode: dto.source ?? InputSource.TOUCH_SCREEN,
        resetBreadcrumb: true,
        lastPair: rootPair,
      });

      // Notificar al microproyector que se alcanzó un nodo hoja para que muestre el pop-up de 3 segundos
      this.syncService.notifyLeafReached({
        patientId: dto.patientId,
        isLeaf: true,
        isEmergency: fullSelected.isEmergency,
        title: fullSelected.isEmergency
          ? '¡Emergencia! Mensaje enviado al médico'
          : 'Mensaje enviado al médico',
        label: fullSelected.label,
        selectedNode: this.toOptionDto(fullSelected)!,
      });

      nextPair = null;
    } else {
      // 6. Nodo intermedio → devolvemos el nuevo par y actualizamos la posición del paciente
      nextPair = {
        currentNodeId: fullSelected.id,
        currentNodeCode: fullSelected.code,
        currentNodeLabel: fullSelected.label,
        level: fullSelected.level,
        leftNode: this.toOptionDto(fullSelected.leftNode),
        rightNode: this.toOptionDto(fullSelected.rightNode),
      };

      await this.patientsService.updateCurrentNode(
        dto.patientId,
        fullSelected.id,
      );
      this.syncService.updatePatientDeviceSession({
        patientId: dto.patientId,
        currentNodeId: fullSelected.id,
        currentNodeCode: fullSelected.code,
        level: fullSelected.level,
        inputMode: dto.source,
        selectedLabel: fullSelected.label,
        lastPair: nextPair,
      });
    }

    // 7. Respuesta completa que la UI necesita
    return {
      selectedNode: this.toOptionDto(fullSelected)!,
      isLeaf: fullSelected.isLeaf,
      isEmergency: fullSelected.isEmergency,
      severityLevel: fullSelected.severityLevel,
      clinicalRecordId,
      emergencyAlertId,
      nextPair,
    };
  }
  
  /**
   * Reinicia la navegación de un paciente al Nivel 0 (Sección A vs Sección B).
   */
  async resetNavigation(
    dto: ResetTreeNavigationDto,
  ): Promise<BinaryPairResponseDto> {
    const rootPair = await this.getRootPair();
    await this.patientsService.updateCurrentNode(
      dto.patientId,
      rootPair.currentNodeId,
    );

    this.syncService.updatePatientDeviceSession({
      patientId: dto.patientId,
      currentNodeId: rootPair.currentNodeId,
      currentNodeCode: 'ROOT',
      level: 0,
      inputMode: dto.source ?? InputSource.TOUCH_SCREEN,
      resetBreadcrumb: true,
      lastPair: rootPair,
    });

    return rootPair;
  }

  /**
   * Retrocede un nivel en el árbol binario si el paciente se equivocó de sección.
   */
  async stepBack(dto: StepBackTreeDto): Promise<BinaryPairResponseDto> {
    const currentNode = await this.treeNodeRepository.findOne({
      where: { id: dto.currentNodeId },
      relations: { parentNode: true },
    });

    if (!currentNode || !currentNode.parentNode) {
      return this.resetNavigation({
        patientId: dto.patientId,
        source: dto.source,
      });
    }

    const parentPair = await this.getBinaryPair(currentNode.parentNode.id);
    await this.patientsService.updateCurrentNode(
      dto.patientId,
      parentPair.currentNodeId,
    );

    this.syncService.updatePatientDeviceSession({
      patientId: dto.patientId,
      currentNodeId: parentPair.currentNodeId,
      currentNodeCode: parentPair.currentNodeCode ?? 'ROOT',
      level: parentPair.level,
      inputMode: dto.source ?? InputSource.TOUCH_SCREEN,
      lastPair: parentPair,
    });

    return parentPair;
  }

  /**
   * Recarga/actualiza todo el árbol binario clínico sin perder pacientes.
   */
  async reseedClinicalTree(): Promise<{
    message: string;
    totalNodes: number;
    leafNodes: number;
    emergencyNodes: number;
  }> {
    this.syncService.clearTreeCache();

    // 1. Desvincular referencias internas antes de borrar para no violar foreign keys
    await this.treeNodeRepository
      .createQueryBuilder()
      .update(TreeNode)
      .set({
        leftNode: null as any,
        rightNode: null as any,
        parentNode: null as any,
      })
      .execute();

    // 2. Borrar todos los nodos existentes
    await this.treeNodeRepository
      .createQueryBuilder()
      .delete()
      .from(TreeNode)
      .execute();

    // 3. Sembrar árbol binario clínico exhaustivo
    await this.seedTree();
    await this.getRootPair();
    const stats = await this.getTreeStatistics();
    return {
      message: 'Árbol binario clínico UCI reconstruido exitosamente',
      ...stats,
    };
  }

  async getTreeStatistics(): Promise<{
    totalNodes: number;
    leafNodes: number;
    internalBinaryNodes: number;
    emergencyNodes: number;
  }> {
    const allNodes = await this.treeNodeRepository.find();
    const leafNodes = allNodes.filter((n) => n.isLeaf).length;
    const emergencyNodes = allNodes.filter((n) => n.isEmergency).length;

    return {
      totalNodes: allNodes.length,
      leafNodes,
      internalBinaryNodes: allNodes.length - leafNodes,
      emergencyNodes,
    };
  }

  /**
   * Reconstruye la ruta de navegación desde la raíz hasta la hoja seleccionada
   * para guardarla en el Excel del paciente.
   */
  private async buildBreadcrumbPath(leafNode: TreeNode): Promise<string[]> {
    const labels: string[] = [];
    let cursor: TreeNode | null = leafNode;

    while (cursor && cursor.code !== 'ROOT') {
      labels.unshift(cursor.label);
      if (cursor.parentNode?.id) {
        cursor = await this.treeNodeRepository.findOne({
          where: { id: cursor.parentNode.id },
          relations: { parentNode: true },
        });
      } else {
        break;
      }
    }

    return labels;
  }

  /**
   * Pobla la base de datos de forma recursiva con toda la estructura clínica de AGENTS.md
   * y los desgloses binarios de dolor, dispositivos, necesidades fisiológicas, emociones y mensajes.
   * Se utiliza actualización directa por ID para evitar ciclos en memoria en el grafo de TypeORM.
   */
  private async seedTree(): Promise<void> {
    await this.createNodeRecursive(CLINICAL_BINARY_TREE_SEED, null, 0);
  }

  private async createNodeRecursive(
    spec: ClinicalSeedNodeSpec,
    parentId: string | null,
    level: number,
  ): Promise<TreeNode> {
    const isLeaf = !spec.left && !spec.right;

    const node = this.treeNodeRepository.create({
      code: spec.code,
      category: spec.category,
      label: spec.label,
      description: spec.description,
      icon: spec.icon,
      level,
      isLeaf,
      isEmergency: Boolean(spec.isEmergency),
      severityLevel: spec.severityLevel,
      parentNode: parentId ? ({ id: parentId } as TreeNode) : undefined,
    });

    const savedNode = await this.treeNodeRepository.save(node);

    let leftChildId: string | null = null;
    let rightChildId: string | null = null;

    if (spec.left) {
      const leftChild = await this.createNodeRecursive(
        spec.left,
        savedNode.id,
        level + 1,
      );
      leftChildId = leftChild.id;
    }

    if (spec.right) {
      const rightChild = await this.createNodeRecursive(
        spec.right,
        savedNode.id,
        level + 1,
      );
      rightChildId = rightChild.id;
    }

    if (leftChildId || rightChildId) {
      await this.treeNodeRepository.update(savedNode.id, {
        leftNode: leftChildId ? ({ id: leftChildId } as TreeNode) : undefined,
        rightNode: rightChildId ? ({ id: rightChildId } as TreeNode) : undefined,
      });
    }

    return savedNode;
  }
}
