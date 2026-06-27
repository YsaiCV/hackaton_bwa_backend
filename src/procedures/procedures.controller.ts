import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { type Response } from 'express';

import { CitizenshipService } from './procedures.service';
import { CitizenshipQueryDto, CitizenshipResponseDto } from 'src/agents/dto/citizenship.dto';

@ApiTags('Citizenship')
@Controller('citizenship')
export class CitizenshipController {
  private readonly logger = new Logger(CitizenshipController.name);

  constructor(private readonly citizenshipService: CitizenshipService) { }

  /**
   * POST /citizenship/query
   * Endpoint principal: procesa una consulta y devuelve la guía del trámite.
   */
  @Post('query')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Consultar información sobre un trámite de ciudadanía',
    description: `
Orquesta un pipeline de agentes ADK:
1. **ResearchAgent** — busca información oficial con Google Search  
2. **SummaryAgent**  — sintetiza los resultados en una guía accionable

Devuelve el resumen estructurado y los eventos de cada agente.
    `,
  })
  @ApiBody({ type: CitizenshipQueryDto })
  @ApiResponse({
    status: 200,
    description: 'Guía del trámite generada exitosamente',
    type: CitizenshipResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Query inválido o vacío',
  })
  @ApiResponse({
    status: 500,
    description: 'Error interno del agente o de la API de Gemini',
  })
  async query(@Body() dto: CitizenshipQueryDto): Promise<CitizenshipResponseDto> {
    this.logger.log(`POST /citizenship/query — "${dto.query}"`);
    return this.citizenshipService.processQuery(dto);
  }

  /**
   * POST /citizenship/query/stream
   * Endpoint SSE: transmite los eventos de los agentes en tiempo real.
   *
   * Útil para UIs que quieren mostrar el progreso del pipeline en vivo
   * (ej: "🔎 Buscando información..." → "📝 Generando resumen...")
   */
  @Post('query/stream')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Consulta con streaming SSE (Server-Sent Events)',
    description:
      'Transmite los eventos de cada agente en tiempo real mientras el pipeline se ejecuta.',
  })
  @ApiBody({ type: CitizenshipQueryDto })
  async queryStream(
    @Body() dto: CitizenshipQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`POST /citizenship/query/stream — "${dto.query}"`);

    // Configurar headers SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const sendEvent = (eventName: string, data: unknown) => {
      res.write(`event: ${eventName}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Ejecutar el pipeline y emitir cada evento como SSE
      const result = await this.citizenshipService.processQuery(dto);

      // Emitir eventos individuales
      for (const event of result.events) {
        sendEvent('agent_event', event);
        // Pequeña pausa para que el cliente los procese en orden
        await new Promise((r) => setTimeout(r, 50));
      }

      // Emitir el resumen final
      sendEvent('final', {
        sessionId: result.sessionId,
        summary: result.summary,
        processingTimeMs: result.processingTimeMs,
      });

      sendEvent('done', { status: 'completed' });
    } catch (error) {
      sendEvent('error', { message: (error as Error).message });
    } finally {
      res.end();
    }
  }
}