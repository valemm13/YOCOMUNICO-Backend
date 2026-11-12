import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BinaryTreeService } from '../service/binary-tree.service';
import { BinaryPairResponseDto } from '../dtos/binary-response.dto';
import {
  NavigateTreeDto,
  ResetTreeNavigationDto,
  StepBackTreeDto,
} from '../dtos/navigate-tree.dto';

@Controller('binary-tree')
export class BinaryTreeController {
  constructor(private readonly binaryTreeService: BinaryTreeService) {}

  /**
   * GET /api/binary-tree/root
   * Obtiene el par inicial (Nivel 0: Dolor y Físico vs. Emocional y Mensajes).
   * La pantalla del celular o el microproyector llaman a este endpoint al encenderse o reiniciarse.
   */
  @Get('root')
  async getRootPair(): Promise<BinaryPairResponseDto> {
    return this.binaryTreeService.getRootPair();
  }

  /**
   * GET /api/binary-tree/stats
   * Devuelve estadísticas de nodos, hojas y alertas críticas del árbol binario clínico.
   */
  @Get('stats')
  async getTreeStats() {
    return this.binaryTreeService.getTreeStatistics();
  }

  /**
   * GET /api/binary-tree/node/:id
   * Devuelve únicamente los 2 hijos (leftNode y rightNode) para el nodo solicitado.
   * Cumple la Regla 1 de AGENTS.md (Payload binario liviano para IoT y celular).
   */
  @Get('node/:id')
  async getBinaryPair(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<BinaryPairResponseDto> {
    return this.binaryTreeService.getBinaryPair(id);
  }

  /**
   * POST /api/binary-tree/navigate
   * Procesa la pulsación del botón (LEFT o RIGHT) enviada por el control físico (HARDWARE_CONTROLLER)
   * o por la pantalla táctil del celular (TOUCH_SCREEN).
   */
  @Post('navigate')
  @HttpCode(HttpStatus.OK)
  async navigate(@Body() navigateDto: NavigateTreeDto) {
    return this.binaryTreeService.navigate(navigateDto);
  }

  /**
   * POST /api/binary-tree/reset
   * Reinicia la sesión de búsqueda binaria del paciente de vuelta a la raíz (Sección A vs Sección B).
   */
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetNavigation(@Body() resetDto: ResetTreeNavigationDto) {
    return this.binaryTreeService.resetNavigation(resetDto);
  }

  /**
   * POST /api/binary-tree/back
   * Permite retroceder un nivel en el árbol si el paciente seleccionó una mitad por error.
   */
  @Post('back')
  @HttpCode(HttpStatus.OK)
  async stepBack(@Body() stepBackDto: StepBackTreeDto) {
    return this.binaryTreeService.stepBack(stepBackDto);
  }

  /**
   * POST /api/binary-tree/reseed
   * Reconstruye la taxonomía clínica completa del árbol binario en la base de datos.
   */
  @Post('reseed')
  @HttpCode(HttpStatus.OK)
  async reseedTree() {
    return this.binaryTreeService.reseedClinicalTree();
  }
}
