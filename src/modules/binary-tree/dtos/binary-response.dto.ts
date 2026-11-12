// Información limpia y compacta de una sola opción visual
export class NodeOptionDto {
  id: string;
  code: string;
  label: string;
  description?: string;
  icon?: string;
  isLeaf: boolean;
  isEmergency: boolean;
}

// Payload binario exacto que viaja al microproyector o tablet
export class BinaryPairResponseDto {
  currentNodeId: string;
  level: number;
  leftNode: NodeOptionDto | null;
  rightNode: NodeOptionDto | null;
} 