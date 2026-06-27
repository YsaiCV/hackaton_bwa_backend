import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@ApiTags('Conversations')
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todas las conversaciones recientes' })
  async getConversations() {
    return this.service.getSessions();
  }

  @Get(':sessionId/messages')
  @ApiOperation({ summary: 'Obtener el historial de mensajes de una conversación' })
  async getMessages(@Param('sessionId') sessionId: string) {
    return this.service.getMessagesBySession(sessionId);
  }

  @Post('tasks')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una tarea asociada a una conversación' })
  async createTask(@Body() dto: CreateTaskDto) {
    return this.service.createTask(dto);
  }

  @Get(':sessionId/tasks')
  @ApiOperation({ summary: 'Obtener las tareas de una conversación' })
  async getTasks(@Param('sessionId') sessionId: string) {
    return this.service.getTasksBySession(sessionId);
  }

  @Patch('tasks/:id')
  @ApiOperation({ summary: 'Actualizar una tarea' })
  async updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.service.updateTask(id, dto);
  }

  @Delete('tasks/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una tarea' })
  async deleteTask(@Param('id') id: string) {
    await this.service.deleteTask(id);
  }
}
