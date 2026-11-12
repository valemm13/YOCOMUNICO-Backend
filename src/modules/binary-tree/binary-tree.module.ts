import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TreeNode } from './entities/tree-node.entity';
import { BinaryTreeService } from './service/binary-tree.service';
import { BinaryTreeController } from './controllers/binary-tree.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TreeNode])],
  controllers: [BinaryTreeController],
  providers: [BinaryTreeService],
  exports: [BinaryTreeService], // Lo exportamos para que otros módulos (como emergencias o auditoría) puedan usarlo
})
export class BinaryTreeModule {}