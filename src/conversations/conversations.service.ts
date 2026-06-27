import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from './entities/chat-message.entity';
import { Task } from './entities/task.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  async getSessions(): Promise<{
    sessionId: string;
    userId: string;
    firstMessage: string | null;
    lastActivity: Date;
    messageCount: number;
  }[]> {
    const raw = await this.messageRepo
      .createQueryBuilder('msg')
      .select('msg.session_id', 'sessionId')
      .addSelect('msg.user_id', 'userId')
      .addSelect('MIN(msg.created_at)', 'startedAt')
      .addSelect('MAX(msg.created_at)', 'lastActivity')
      .addSelect('COUNT(*)', 'messageCount')
      .addSelect(
        `MIN(CASE WHEN msg.role = 'user' THEN msg.content END)`,
        'firstMessage',
      )
      .groupBy('msg.session_id')
      .addGroupBy('msg.user_id')
      .orderBy('MAX(msg.created_at)', 'DESC')
      .getRawMany();

    return raw.map((r) => ({
      sessionId: r.sessionId,
      userId: r.userId,
      firstMessage: r.firstMessage ?? null,
      lastActivity: r.lastActivity,
      messageCount: Number(r.messageCount),
    }));
  }

  async createMessage(dto: CreateMessageDto): Promise<ChatMessage> {
    const message = this.messageRepo.create({
      sessionId: dto.sessionId,
      userId: dto.userId ?? 'anonymous',
      role: dto.role,
      content: dto.content,
      metadata: dto.metadata ?? null,
    });
    return this.messageRepo.save(message);
  }

  async getMessagesBySession(sessionId: string): Promise<ChatMessage[]> {
    return this.messageRepo.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  async createTask(dto: CreateTaskDto): Promise<Task> {
    const task = this.taskRepo.create({
      sessionId: dto.sessionId,
      title: dto.title,
      description: dto.description ?? null,
      status: dto.status ?? undefined,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
    });
    return this.taskRepo.save(task);
  }

  async getTasksBySession(sessionId: string): Promise<Task[]> {
    return this.taskRepo.find({
      where: { sessionId },
      order: { createdAt: 'DESC' },
    });
  }

  async updateTask(id: string, dto: UpdateTaskDto): Promise<Task> {
    const task = await this.taskRepo.findOneBy({ id });
    if (!task) {
      throw new NotFoundException(`Task with id "${id}" not found`);
    }
    if (dto.title !== undefined) task.title = dto.title;
    if (dto.description !== undefined) task.description = dto.description;
    if (dto.status !== undefined) task.status = dto.status;
    if (dto.dueDate !== undefined) task.dueDate = new Date(dto.dueDate);
    return this.taskRepo.save(task);
  }

  async deleteTask(id: string): Promise<void> {
    const result = await this.taskRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Task with id "${id}" not found`);
    }
  }
}
