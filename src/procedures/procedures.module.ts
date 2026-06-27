import { Module } from '@nestjs/common';
import { ConversationsModule } from 'src/conversations/conversations.module';
import { OrchestratorService } from './agents/orchestrator.service';
import { SynthesisAgentService } from './agents/synthesis-agent.service';
import { CitizenshipController } from './procedures.controller';
import { CitizenshipService } from './procedures.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConversationsModule, AuthModule],
  controllers: [CitizenshipController],
  providers: [OrchestratorService, SynthesisAgentService, CitizenshipService],
})
export class ProceduresModule {}
