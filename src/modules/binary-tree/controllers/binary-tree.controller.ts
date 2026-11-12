import { Controller, Get, Post, Body, Param, ParseUUIDPipe, HttpCode, HttpStatus,} from '@nestjs/common';
import { BinaryTreeService } from '../service/binary-tree.service';
import { BinaryPairResponseDto } from '../dtos/binary-response.dto';
import { NavigateTreeDto } from '../dtos/navigate-tree.dto';

@Controller('binary-tree')
export class BinaryTreeController {
  constructor(private readonly binaryTreeService: BinaryTreeService) {}

  /**
   * GET /api/binary-tree/root
   * Obtiene el par inicial (Nivel 0: Dolor y Físico vs. Emocional y Mensajes).
   * La pantalla o proyector llama a este endpoint al encenderse o reiniciarse.
   */
  @Get('root')
  async getRootPair(): Promise<BinaryPairResponseDto> {
    return this.binaryTreeService.getRootPair();
  }

  /**
   * GET /api/binary-tree/node/:id
   * Devuelve únicamente los 2 hijos (leftNode y rightNode) para el nodo solicitado.
   * Cumple la Regla 1 de AGENTS.md (Payload binario liviano para IoT).
   */
  @Get('node/:id')
  async getBinaryPair(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<BinaryPairResponseDto> {
    return this.binaryTreeService.getBinaryPair(id);
  }

  /**
   * POST /api/binary-tree/navigate
   * Procesa la pulsación del botón (LEFT o RIGHT) enviada por el hardware o pantalla táctil.
   */
  @Post('navigate')
  @HttpCode(HttpStatus.OK)
  async navigate(@Body() navigateDto: NavigateTreeDto) {
    return this.binaryTreeService.navigate(navigateDto);
  }
}