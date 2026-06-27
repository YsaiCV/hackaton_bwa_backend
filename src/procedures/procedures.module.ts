import { Module } from '@nestjs/common';
import { OrchestratorService } from './agents/orchestrator.service';
import { SynthesisAgentService } from './agents/synthesis-agent.service';
import { ProceduresController } from './procedures.controller';

@Module({
  controllers: [ProceduresController],
  providers: [OrchestratorService, SynthesisAgentService],
})
export class ProceduresModule {}
