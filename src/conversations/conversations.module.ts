import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ChatMessage } from './entities/chat-message.entity';
import { Task } from './entities/task.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChatMessage, Task])],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [TypeOrmModule, ConversationsService],
})
export class ConversationsModule {}
