import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { TaskStatus } from '../entities/task.entity';

export class CreateTaskDto {
  @ApiProperty({ description: 'ID de sesión de la conversación' })
  @IsString()
  sessionId: string;

  @ApiProperty({ description: 'Título de la tarea' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Descripción detallada de la tarea' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Estado de la tarea', enum: TaskStatus, default: TaskStatus.PENDING })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
