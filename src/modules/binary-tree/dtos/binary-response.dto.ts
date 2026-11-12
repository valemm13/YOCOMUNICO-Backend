import { SeverityLevel } from '../entities/tree-node.entity';

// Información limpia y compacta de una sola opción visual
export class NodeOptionDto {
  id: string;
  code: string;
  category?: string;
  label: string;
  description?: string;
  icon?: string;
  isLeaf: boolean;
  isEmergency: boolean;
  severityLevel?: SeverityLevel;
}

// Payload binario exacto que viaja al microproyector o tablet/celular (Regla 1 de AGENTS.md)
export class BinaryPairResponseDto {
  currentNodeId: string;
  currentNodeCode?: string;
  currentNodeLabel?: string;
  level: number;
  leftNode: NodeOptionDto | null;
  rightNode: NodeOptionDto | null;
}
