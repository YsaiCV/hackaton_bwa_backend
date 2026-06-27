import { Module } from '@nestjs/common';
import { OrchestratorService } from './agents/orchestrator.service';
import { ScraperService } from './agents/scraper.service';
import { SynthesisAgentService } from './agents/synthesis-agent.service';
import { WebSearchAgentService } from './agents/web-search-agent.service';
import { ProceduresController } from './procedures.controller';

@Module({
  controllers: [ProceduresController],
  providers: [
    OrchestratorService,
    ScraperService,
    SynthesisAgentService,
    WebSearchAgentService,
  ],
})
export class ProceduresModule {}
