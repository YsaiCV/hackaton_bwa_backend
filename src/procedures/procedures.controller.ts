import {
  Body,
  Controller,
  MessageEvent,
  Post,
  Query,
  Req,
  Sse,
} from '@nestjs/common';
import type { Request } from 'express';
import { map, Observable } from 'rxjs';
import { ResearchProcedureDto } from './dto/research-procedure.dto';
import { OrchestratorService } from './agents/orchestrator.service';
import { ResearchResult } from './types/research-result.type';

@Controller('procedures')
export class ProceduresController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post('research')
  research(@Body() dto: ResearchProcedureDto): Promise<ResearchResult> {
    return this.orchestratorService.research(dto);
  }

  @Sse('research/stream')
  streamResearch(
    @Query() dto: ResearchProcedureDto,
    @Req() request: Request,
  ): Observable<MessageEvent> {
    const abortController = new AbortController();
    request.on('close', () => abortController.abort());

    return this.orchestratorService
      .streamResearch(dto, abortController.signal)
      .pipe(
        map((event) => ({
          type: event.event,
          data: event.data,
        })),
      );
  }
}
