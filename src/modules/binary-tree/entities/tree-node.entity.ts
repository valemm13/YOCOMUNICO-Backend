// UUID es un identificador universal unico para los pacientes, con este no hay forma de que dos personas
// tengan el mismo Id y se descifre facilmente cual es el de un paciente especifico, lo cual protege la informacion del paciente
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SeverityLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

@Entity('tree_nodes')
export class TreeNode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Código clínico del árbol (ej. 'ROOT', 'A', 'B', 'A1', 'A2.2', etc.)
  @Column({ unique: true })
  code: string;

  // Categoría clínica para agrupar en la vista Excel del médico
  @Column({ default: 'General UCI' })
  category: string;

  // Texto principal mostrado al paciente en la pantalla/proyector (ej. "Dolor Corporal")
  @Column()
  label: string;

  // Descripción auxiliar o contexto clínico para el personal médico
  @Column({ type: 'text', nullable: true })
  description: string;

  // Identificador de icono gráfico para la interfaz (ej. "pain", "water", "lungs")
  @Column({ nullable: true })
  icon: string;

  // Nivel de profundidad en el árbol (0: Raíz, 1: Sub-ramas, 2 o más: Desglose y Hojas)
  @Column({ type: 'int', default: 0 })
  level: number;

  // Indica si es un nodo final (síntoma o mensaje alcanzado)
  @Column({ default: false })
  isLeaf: boolean;

  // Si es verdadero, dispara interrupción y alerta de prioridad máxima (Regla 2 de Agents.md)
  @Column({ default: false })
  isEmergency: boolean;

  // Nivel de severidad clínica
  @Column({
    type: 'enum',
    enum: SeverityLevel,
    default: SeverityLevel.LOW,
  })
  severityLevel: SeverityLevel;

  // Relación con el nodo padre (de dónde viene la navegación)
  @ManyToOne(() => TreeNode, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parentNode: TreeNode;

  // Rama Izquierda (Botón Izquierdo / Mitad Izquierda de la pantalla)
  @ManyToOne(() => TreeNode, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'left_node_id' })
  leftNode: TreeNode;

  // Rama Derecha (Botón Derecho / Mitad Derecha de la pantalla)
  @ManyToOne(() => TreeNode, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'right_node_id' })
  rightNode: TreeNode;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
