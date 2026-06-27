import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ── Request ────────────────────────────────────────────────────────────────

export class CitizenshipQueryDto {
  @ApiProperty({
    description: 'Consulta del usuario sobre el trámite de ciudadanía',
    example: 'quiero hacer el trámite de ciudadanía española por residencia',
  })
  query: string;

  @ApiPropertyOptional({
    description: 'ID de sesión existente para continuar una conversación',
    example: 'session-abc123',
  })
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'ID de usuario',
    example: 'user-001',
    default: 'anonymous',
  })
  userId?: string;
}

// ── Response ───────────────────────────────────────────────────────────────

export class AgentEventDto {
  @ApiProperty({ description: 'Nombre del agente que generó el evento' })
  agent: string;

  @ApiProperty({ description: 'Tipo de evento', enum: ['text', 'tool_call', 'final'] })
  type: 'text' | 'tool_call' | 'final';

  @ApiPropertyOptional({ description: 'Texto generado por el agente' })
  content?: string;
}

export class CitizenshipResponseDto {
  @ApiProperty({ description: 'ID de la sesión (para continuar la conversación)' })
  sessionId: string;

  @ApiProperty({ description: 'Respuesta final con la guía del trámite' })
  summary: string;

  @ApiProperty({ description: 'Secuencia de eventos de los agentes' })
  events: AgentEventDto[];

  @ApiProperty({ description: 'Tiempo de procesamiento en ms' })
  processingTimeMs: number;
}