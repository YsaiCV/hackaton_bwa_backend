import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ResearchProcedureDto } from '../dto/research-procedure.dto';
import {
  ProcedureResearchEvent,
  ResearchResult,
} from '../types/research-result.type';
import { SynthesisAgentService } from './synthesis-agent.service';

@Injectable()
export class OrchestratorService {
  constructor(private readonly synthesisAgent: SynthesisAgentService) {}

  async research(
    dto: ResearchProcedureDto,
    _signal?: AbortSignal,
  ): Promise<ResearchResult> {
    return this.synthesisAgent.synthesize(this.createBaseResult(dto), []);
  }

  streamResearch(
    dto: ResearchProcedureDto,
    signal?: AbortSignal,
  ): Observable<ProcedureResearchEvent> {
    return new Observable<ProcedureResearchEvent>((subscriber) => {
      void (async () => {
        try {
          subscriber.next({
            event: 'status',
            data: {
              step: 'classifying',
              message: 'Clasificando consulta',
            },
          });

          subscriber.next({
            event: 'status',
            data: {
              step: 'synthesizing',
              message: 'Sintetizando respuesta final',
            },
          });

          const finalResult = this.synthesisAgent.synthesize(
            this.createBaseResult(dto),
            [],
          );

          subscriber.next({ event: 'final', data: finalResult });
          subscriber.complete();
        } catch (error) {
          if (!signal?.aborted) {
            subscriber.next({
              event: 'error',
              data: {
                message:
                  error instanceof Error
                    ? error.message
                    : 'No se pudo completar la busqueda',
              },
            });
          }

          subscriber.complete();
        }
      })();
    });
  }

  private classifyQuery(dto: ResearchProcedureDto): string {
    return [
      dto.query,
      dto.city ? `municipio ${dto.city}` : undefined,
      dto.procedureType ? `tipo tramite ${dto.procedureType}` : undefined,
      'Bolivia requisitos pasos costos plazos fuentes oficiales',
    ]
      .filter(Boolean)
      .join(' ');
  }

  private createBaseResult(dto: ResearchProcedureDto): ResearchResult {
    const query = this.classifyQuery(dto);

    return {
      summary: `Consulta recibida para sintetizar: ${query}`,
      requirements: [],
      steps: [],
      fees: [],
      deadlines: [],
      warnings: [
        'El agente de web search esta desactivado porque su respuesta no cumple el formato JSON esperado.',
        'El agente de scraping esta desactivado porque depende de las fuentes del web search.',
      ],
      sources: [],
      confidence: 'low',
    };
  }
}
