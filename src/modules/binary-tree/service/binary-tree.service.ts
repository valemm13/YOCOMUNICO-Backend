import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TreeNode, SeverityLevel } from '../entities/tree-node.entity';
import { BinaryPairResponseDto, NodeOptionDto } from '../dtos/binary-response.dto';
import { NavigateTreeDto, NavigationSelection } from '../dtos/navigate-tree.dto';

@Injectable()
export class BinaryTreeService implements OnModuleInit {
  private readonly logger = new Logger(BinaryTreeService.name);

  constructor(
    @InjectRepository(TreeNode)
    private readonly treeNodeRepository: Repository<TreeNode>,
  ) {}

  /**
   * Se ejecuta automáticamente al arrancar el servidor.
   * Si la tabla está vacía, crea el árbol clínico inicial de AGENTS.md.
   */
  async onModuleInit(): Promise<void> {
    const count = await this.treeNodeRepository.count();
    if (count === 0) {
      this.logger.log('🌱 Inicializando árbol binario clínico ...');
      await this.seedTree();
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
      label: node.label,
      description: node.description,
      icon: node.icon,
      isLeaf: node.isLeaf,
      isEmergency: node.isEmergency,
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
      throw new NotFoundException('El nodo raíz del árbol no ha sido inicializado');
    }

    return {
      currentNodeId: root.id,
      level: root.level,
      leftNode: this.toOptionDto(root.leftNode),
      rightNode: this.toOptionDto(root.rightNode),
    };
  }

  /**
   * Devuelve únicamente los dos nodos hijos correspondientes a un nodo específico.
   * Cumple la Regla 1 de AGENTS.md (Payload binario liviano).
   */
  async getBinaryPair(nodeId: string): Promise<BinaryPairResponseDto> {
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

    return {
      currentNodeId: node.id,
      level: node.level,
      leftNode: this.toOptionDto(node.leftNode),
      rightNode: this.toOptionDto(node.rightNode),
    };
  }

  /**
   * Procesa la navegación cuando el paciente pulsa el botón IZQUIERDO o DERECHO.
   */
  async navigate(dto: NavigateTreeDto): Promise<{
    selectedNode: NodeOptionDto;
    isLeaf: boolean;
    isEmergency: boolean;
    severityLevel: SeverityLevel;
    nextPair: BinaryPairResponseDto | null;
  }> {
    const currentNode = await this.treeNodeRepository.findOne({
      where: { id: dto.currentNodeId },
      relations: {
        leftNode: true,
        rightNode: true,
      },
    });

    if (!currentNode) {
      throw new NotFoundException(`Nodo actual con ID ${dto.currentNodeId} no encontrado`);
    }

    // Determinar qué nodo eligió el paciente
    const selectedChild =
      dto.selection === NavigationSelection.LEFT
        ? currentNode.leftNode
        : currentNode.rightNode;

    if (!selectedChild) {
      throw new NotFoundException('No existe una opción disponible en la dirección seleccionada');
    }

    // Cargar el nodo seleccionado con sus propios hijos (por si no es hoja)
    const fullSelected = await this.treeNodeRepository.findOne({
      where: { id: selectedChild.id },
      relations: {
        leftNode: true,
        rightNode: true,
      },
    });

    if (!fullSelected) {
      throw new NotFoundException('Error al cargar el nodo seleccionado');
    }

    // Si ya es un nodo final (hoja), no hay siguiente par
    let nextPair: BinaryPairResponseDto | null = null;
    if (!fullSelected.isLeaf) {
      nextPair = {
        currentNodeId: fullSelected.id,
        level: fullSelected.level,
        leftNode: this.toOptionDto(fullSelected.leftNode),
        rightNode: this.toOptionDto(fullSelected.rightNode),
      };
    }

    return {
      selectedNode: this.toOptionDto(fullSelected)!,
      isLeaf: fullSelected.isLeaf,
      isEmergency: fullSelected.isEmergency,
      severityLevel: fullSelected.severityLevel,
      nextPair,
    };
  }

  /**
   * Pobla la base de datos con toda la estructura clínica estipulada en AGENTS.md.
   */
  private async seedTree(): Promise<void> {
    // 1. Nodo ROOT Virtual
    const root = this.treeNodeRepository.create({
      code: 'ROOT',
      label: 'Menú Principal UCI',
      description: 'Nodo raíz del sistema',
      level: 0,
      isLeaf: false,
      isEmergency: false,
      severityLevel: SeverityLevel.LOW,
    });
    await this.treeNodeRepository.save(root);

    // 2. Nivel 0 (Sección A vs Sección B)
    const nodeA = this.treeNodeRepository.create({
      code: 'A',
      label: 'Dolor y Necesidades Físicas',
      description: 'Malestar corporal, tubos, sed o posición',
      icon: 'body',
      level: 1,
      isLeaf: false,
      isEmergency: false,
      severityLevel: SeverityLevel.LOW,
      parentNode: root,
    });

    const nodeB = this.treeNodeRepository.create({
      code: 'B',
      label: 'Estado Emocional y Mensajes',
      description: 'Ánimo, familia, dudas o descanso',
      icon: 'heart',
      level: 1,
      isLeaf: false,
      isEmergency: false,
      severityLevel: SeverityLevel.LOW,
      parentNode: root,
    });
    await this.treeNodeRepository.save([nodeA, nodeB]);

    root.leftNode = nodeA;
    root.rightNode = nodeB;
    await this.treeNodeRepository.save(root);

    // 3. Sub-ramas de A (A1 vs A2)
    const nodeA1 = this.treeNodeRepository.create({
      code: 'A1',
      label: 'Dolor / Malestar de Dispositivos',
      description: 'Dolor físico o molestia por tubo/sonda',
      icon: 'pain',
      level: 2,
      isLeaf: false,
      isEmergency: false,
      severityLevel: SeverityLevel.HIGH,
      parentNode: nodeA,
    });

    const nodeA2 = this.treeNodeRepository.create({
      code: 'A2',
      label: 'Necesidades y Confort',
      description: 'Sed, posición, temperatura o aire',
      icon: 'comfort',
      level: 2,
      isLeaf: false,
      isEmergency: false,
      severityLevel: SeverityLevel.MEDIUM,
      parentNode: nodeA,
    });
    await this.treeNodeRepository.save([nodeA1, nodeA2]);

    nodeA.leftNode = nodeA1;
    nodeA.rightNode = nodeA2;
    await this.treeNodeRepository.save(nodeA);

    // 4. Sub-ramas de B (B1 vs B2)
    const nodeB1 = this.treeNodeRepository.create({
      code: 'B1',
      label: 'Estado Emocional',
      description: 'Miedo, ansiedad o tristeza',
      icon: 'emotion',
      level: 2,
      isLeaf: false,
      isEmergency: false,
      severityLevel: SeverityLevel.MEDIUM,
      parentNode: nodeB,
    });

    const nodeB2 = this.treeNodeRepository.create({
      code: 'B2',
      label: 'Mensajes Rápidos',
      description: 'Descanso o preguntas al equipo',
      icon: 'chat',
      level: 2,
      isLeaf: false,
      isEmergency: false,
      severityLevel: SeverityLevel.LOW,
      parentNode: nodeB,
    });
    await this.treeNodeRepository.save([nodeB1, nodeB2]);

    nodeB.leftNode = nodeB1;
    nodeB.rightNode = nodeB2;
    await this.treeNodeRepository.save(nodeB);

    // 5. Desglose de A1 -> A1.1 (Dolor Localizado) vs A1.2 (Dispositivos)
    const nodeA1_1 = this.treeNodeRepository.create({
      code: 'A1.1',
      label: 'Dolor Físico Localizado',
      description: 'Dolor en una parte del cuerpo',
      icon: 'localized-pain',
      level: 3,
      isLeaf: false,
      isEmergency: false,
      severityLevel: SeverityLevel.HIGH,
      parentNode: nodeA1,
    });

    const nodeA1_2 = this.treeNodeRepository.create({
      code: 'A1.2',
      label: 'Molestia por Tubo / Dispositivo',
      description: 'Tubo endotraqueal, vía o sonda',
      icon: 'tube',
      level: 3,
      isLeaf: false,
      isEmergency: false,
      severityLevel: SeverityLevel.HIGH,
      parentNode: nodeA1,
    });
    await this.treeNodeRepository.save([nodeA1_1, nodeA1_2]);

    nodeA1.leftNode = nodeA1_1;
    nodeA1.rightNode = nodeA1_2;
    await this.treeNodeRepository.save(nodeA1);

    // 6. Desglose de A1.1 -> A1.1.1 (Cabeza/Torso) vs A1.1.2 (Extremidades/Abdomen)
    const nodeA1_1_1 = this.treeNodeRepository.create({
      code: 'A1.1.1',
      label: 'Cabeza o Torso',
      description: 'Dolor en cabeza, cuello o pecho',
      icon: 'chest',
      level: 4,
      isLeaf: false,
      isEmergency: false,
      severityLevel: SeverityLevel.HIGH,
      parentNode: nodeA1_1,
    });

    const nodeA1_1_2 = this.treeNodeRepository.create({
      code: 'A1.1.2',
      label: 'Extremidades o Abdomen',
      description: 'Brazos, piernas o estómago',
      icon: 'limbs',
      level: 4,
      isLeaf: false,
      isEmergency: false,
      severityLevel: SeverityLevel.MEDIUM,
      parentNode: nodeA1_1,
    });
    await this.treeNodeRepository.save([nodeA1_1_1, nodeA1_1_2]);

    nodeA1_1.leftNode = nodeA1_1_1;
    nodeA1_1.rightNode = nodeA1_1_2;
    await this.treeNodeRepository.save(nodeA1_1);

    // 7. Hojas de A1.1.1 (Punzante Agudo vs Sordo Constante)
    const leafA1_1_1_1 = this.treeNodeRepository.create({
      code: 'A1.1.1.1',
      label: 'Dolor Punzante Agudo',
      description: 'Dolor fuerte y repentino (Alerta médica)',
      icon: 'alert-pain',
      level: 5,
      isLeaf: true,
      isEmergency: true, // Dispara alerta crítica
      severityLevel: SeverityLevel.CRITICAL,
      parentNode: nodeA1_1_1,
    });

    const leafA1_1_1_2 = this.treeNodeRepository.create({
      code: 'A1.1.1.2',
      label: 'Dolor Sordo / Constante',
      description: 'Molestia continua pero soportable',
      icon: 'constant-pain',
      level: 5,
      isLeaf: true,
      isEmergency: false,
      severityLevel: SeverityLevel.HIGH,
      parentNode: nodeA1_1_1,
    });
    await this.treeNodeRepository.save([leafA1_1_1_1, leafA1_1_1_2]);

    nodeA1_1_1.leftNode = leafA1_1_1_1;
    nodeA1_1_1.rightNode = leafA1_1_1_2;
    await this.treeNodeRepository.save(nodeA1_1_1);

    // 8. Hojas de A1.1.2 (Abdomen vs Extremidades)
    const leafA1_1_2_1 = this.treeNodeRepository.create({
      code: 'A1.1.2.1',
      label: 'Dolor Abdominal',
      description: 'Dolor o hinchazón en el estómago',
      icon: 'stomach',
      level: 5,
      isLeaf: true,
      isEmergency: false,
      severityLevel: SeverityLevel.HIGH,
      parentNode: nodeA1_1_2,
    });

    const leafA1_1_2_2 = this.treeNodeRepository.create({
      code: 'A1.1.2.2',
      label: 'Dolor en Brazos / Piernas',
      description: 'Calambre o dolor en extremidades',
      icon: 'legs',
      level: 5,
      isLeaf: true,
      isEmergency: false,
      severityLevel: SeverityLevel.MEDIUM,
      parentNode: nodeA1_1_2,
    });
    await this.treeNodeRepository.save([leafA1_1_2_1, leafA1_1_2_2]);

    nodeA1_1_2.leftNode = leafA1_1_2_1;
    nodeA1_1_2.rightNode = leafA1_1_2_2;
    await this.treeNodeRepository.save(nodeA1_1_2);

    // 9. Hojas de A1.2 (Tubo Endotraqueal vs Sonda/Vía)
    const leafA1_2_1 = this.treeNodeRepository.create({
      code: 'A1.2.1',
      label: 'Tubo Endotraqueal / Garganta',
      description: 'Molestia o roce del tubo en la garganta',
      icon: 'intubation',
      level: 4,
      isLeaf: true,
      isEmergency: false,
      severityLevel: SeverityLevel.HIGH,
      parentNode: nodeA1_2,
    });

    const leafA1_2_2 = this.treeNodeRepository.create({
      code: 'A1.2.2',
      label: 'Sonda / Vía Venosa',
      description: 'Ardor o tirón de vía intravenosa o sonda',
      icon: 'catheter',
      level: 4,
      isLeaf: true,
      isEmergency: false,
      severityLevel: SeverityLevel.MEDIUM,
      parentNode: nodeA1_2,
    });
    await this.treeNodeRepository.save([leafA1_2_1, leafA1_2_2]);

    nodeA1_2.leftNode = leafA1_2_1;
    nodeA1_2.rightNode = leafA1_2_2;
    await this.treeNodeRepository.save(nodeA1_2);

    // 10. Desglose de A2 -> A2.1 (Sed/Posición) vs A2.2 (Frío-Calor / Asfixia)
    const nodeA2_1 = this.treeNodeRepository.create({
      code: 'A2.1',
      label: 'Sed / Boca Seca vs Cama',
      description: 'Sed o cambio de postura',
      icon: 'bed-water',
      level: 3,
      isLeaf: false,
      isEmergency: false,
      severityLevel: SeverityLevel.MEDIUM,
      parentNode: nodeA2,
    });

    const nodeA2_2 = this.treeNodeRepository.create({
      code: 'A2.2',
      label: 'Temperatura vs Falta de Aire',
      description: 'Frío, calor o dificultad respiratoria',
      icon: 'breath-temp',
      level: 3,
      isLeaf: false,
      isEmergency: false,
      severityLevel: SeverityLevel.CRITICAL,
      parentNode: nodeA2,
    });
    await this.treeNodeRepository.save([nodeA2_1, nodeA2_2]);

    nodeA2.leftNode = nodeA2_1;
    nodeA2.rightNode = nodeA2_2;
    await this.treeNodeRepository.save(nodeA2);

    // 11. Hojas de A2.1 (Sed vs Posición)
    const leafA2_1_1 = this.treeNodeRepository.create({
      code: 'A2.1.1',
      label: 'Sed / Boca Seca',
      description: 'Necesidad de humedecer la boca',
      icon: 'water',
      level: 4,
      isLeaf: true,
      isEmergency: false,
      severityLevel: SeverityLevel.MEDIUM,
      parentNode: nodeA2_1,
    });

    const leafA2_1_2 = this.treeNodeRepository.create({
      code: 'A2.1.2',
      label: 'Ajuste de Cama / Posición',
      description: 'Cambiar de postura o elevar cabecera',
      icon: 'bed',
      level: 4,
      isLeaf: true,
      isEmergency: false,
      severityLevel: SeverityLevel.LOW,
      parentNode: nodeA2_1,
    });
    await this.treeNodeRepository.save([leafA2_1_1, leafA2_1_2]);

    nodeA2_1.leftNode = leafA2_1_1;
    nodeA2_1.rightNode = leafA2_1_2;
    await this.treeNodeRepository.save(nodeA2_1);

    // 12. Hojas de A2.2 (Frío/Calor vs FALTA DE AIRE - CRÍTICO)
    const leafA2_2_1 = this.treeNodeRepository.create({
      code: 'A2.2.1',
      label: 'Frío / Calor',
      description: 'Ajuste de cobija o temperatura ambiente',
      icon: 'thermometer',
      level: 4,
      isLeaf: true,
      isEmergency: false,
      severityLevel: SeverityLevel.LOW,
      parentNode: nodeA2_2,
    });

    const leafA2_2_2 = this.treeNodeRepository.create({
      code: 'A2.2.2',
      label: 'Falta de Aire / Asfixia',
      description: 'Dificultad respiratoria severa (Emergencia vital)',
      icon: 'lungs-alert',
      level: 4,
      isLeaf: true,
      isEmergency: true, // ¡EMERGENCIA CRÍTICA MÁXIMA!
      severityLevel: SeverityLevel.CRITICAL,
      parentNode: nodeA2_2,
    });
    await this.treeNodeRepository.save([leafA2_2_1, leafA2_2_2]);

    nodeA2_2.leftNode = leafA2_2_1;
    nodeA2_2.rightNode = leafA2_2_2;
    await this.treeNodeRepository.save(nodeA2_2);

    // 13. Hojas de B1 (Emociones: Ansiedad/Miedo vs Tristeza/Frustración)
    const leafB1_1 = this.treeNodeRepository.create({
      code: 'B1.1',
      label: 'Ansiedad / Miedo / Pánico',
      description: 'Angustia o temor intenso',
      icon: 'anxiety',
      level: 3,
      isLeaf: true,
      isEmergency: false,
      severityLevel: SeverityLevel.HIGH,
      parentNode: nodeB1,
    });

    const leafB1_2 = this.treeNodeRepository.create({
      code: 'B1.2',
      label: 'Tristeza / Deseo de ver a Familia',
      description: 'Necesidad de compañía o apoyo familiar',
      icon: 'family',
      level: 3,
      isLeaf: true,
      isEmergency: false,
      severityLevel: SeverityLevel.MEDIUM,
      parentNode: nodeB1,
    });
    await this.treeNodeRepository.save([leafB1_1, leafB1_2]);

    nodeB1.leftNode = leafB1_1;
    nodeB1.rightNode = leafB1_2;
    await this.treeNodeRepository.save(nodeB1);

    // 14. Hojas de B2 (Mensajes Rápidos: Silencio/Descanso vs Dudas)
    const leafB2_1 = this.treeNodeRepository.create({
      code: 'B2.1',
      label: 'Quiero Descansar / Silencio',
      description: 'Solicitud de apagar luces o silencio para dormir',
      icon: 'sleep',
      level: 3,
      isLeaf: true,
      isEmergency: false,
      severityLevel: SeverityLevel.LOW,
      parentNode: nodeB2,
    });

    const leafB2_2 = this.treeNodeRepository.create({
      code: 'B2.2',
      label: '¿Falta mucho para el procedimiento?',
      description: 'Duda sobre el tiempo de permanencia o cuidados',
      icon: 'clock',
      level: 3,
      isLeaf: true,
      isEmergency: false,
      severityLevel: SeverityLevel.LOW,
      parentNode: nodeB2,
    });
    await this.treeNodeRepository.save([leafB2_1, leafB2_2]);

    nodeB2.leftNode = leafB2_1;
    nodeB2.rightNode = leafB2_2;
    await this.treeNodeRepository.save(nodeB2);
  }
}
