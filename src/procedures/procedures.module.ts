import { Module } from '@nestjs/common';
import { OrchestratorService } from './agents/orchestrator.service';
import { SynthesisAgentService } from './agents/synthesis-agent.service';
import { CitizenshipController } from './procedures.controller';
import { CitizenshipService } from './procedures.service';

@Module({
  controllers: [CitizenshipController],
  providers: [OrchestratorService, SynthesisAgentService, CitizenshipService],
})
export class ProceduresModule {}
