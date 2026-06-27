import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';
import { ChatMessageRole } from '../entities/chat-message.entity';

export class CreateMessageDto {
  @ApiProperty({ description: 'ID de sesión de la conversación' })
  @IsString()
  sessionId: string;

  @ApiPropertyOptional({ description: 'ID del usuario', default: 'anonymous' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'Rol del mensaje', enum: ChatMessageRole })
  @IsEnum(ChatMessageRole)
  role: ChatMessageRole;

  @ApiProperty({ description: 'Contenido del mensaje' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Metadatos adicionales (eventos, tool_calls, etc.)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
