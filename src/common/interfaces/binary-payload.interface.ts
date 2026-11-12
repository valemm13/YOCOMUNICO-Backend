import { SeverityLevel } from '../../modules/binary-tree/entities/tree-node.entity';
import {
  InputSource,
  NavigationSelection,
} from '../../modules/binary-tree/dtos/navigate-tree.dto';

export interface BinaryNodeOption {
  id: string;
  code: string;
  label: string;
  description?: string;
  icon?: string;
  category?: string;
  isLeaf: boolean;
  isEmergency: boolean;
  severityLevel?: SeverityLevel;
}

export interface BinaryPairPayload {
  currentNodeId: string;
  currentNodeCode?: string;
  currentNodeLabel?: string;
  level: number;
  leftNode: BinaryNodeOption | null;
  rightNode: BinaryNodeOption | null;
}

export interface ActiveDeviceSession {
  patientId: string;
  currentNodeId: string;
  currentNodeCode: string;
  level: number;
  inputMode: InputSource;
  navigationBreadcrumb: string[];
  lastPair: BinaryPairPayload;
  updatedAt: string;
}

export interface ButtonAuditPayload {
  patientId: string;
  fromNodeId: string;
  fromNodeCode: string;
  toNodeId: string;
  toNodeCode: string;
  selection: NavigationSelection;
  inputSource: InputSource;
  isLeafReached: boolean;
  isEmergencyTriggered: boolean;
  timestamp: Date;
}
