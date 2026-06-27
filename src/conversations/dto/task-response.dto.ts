import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TaskResponseDto {
  @ApiProperty({ description: 'ID de la tarea' })
  id: string;

  @ApiProperty({ description: 'ID de sesión de la conversación' })
  sessionId: string;

  @ApiProperty({ description: 'Título de la tarea' })
  title: string;

  @ApiPropertyOptional({ description: 'Descripción de la tarea' })
  description: string | null;

  @ApiProperty({ description: 'Estado de la tarea' })
  status: string;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento' })
  dueDate: Date | null;

  @ApiProperty({ description: 'Fecha de creación' })
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  updatedAt: Date;
}
