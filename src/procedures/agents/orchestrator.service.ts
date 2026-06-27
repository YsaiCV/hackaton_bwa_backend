import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ResearchProcedureDto } from '../dto/research-procedure.dto';
import {
  ProcedureResearchEvent,
  ResearchResult,
} from '../types/research-result.type';
import { ScraperService } from './scraper.service';
import { SynthesisAgentService } from './synthesis-agent.service';
import { WebSearchAgentService } from './web-search-agent.service';

@Injectable()
export class OrchestratorService {
  constructor(
    private readonly webSearchAgent: WebSearchAgentService,
    private readonly scraperService: ScraperService,
    private readonly synthesisAgent: SynthesisAgentService,
  ) {}

  async research(
    dto: ResearchProcedureDto,
    signal?: AbortSignal,
  ): Promise<ResearchResult> {
    const classifiedQuery = this.classifyQuery(dto);
    const webResult = await this.webSearchAgent.search(classifiedQuery, signal);
    const pages = await this.scraperService.scrapeMany(
      webResult.sources.map((source) => source.url),
      signal,
    );

    return this.synthesisAgent.synthesize(webResult, pages);
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

          const classifiedQuery = this.classifyQuery(dto);

          subscriber.next({
            event: 'status',
            data: {
              step: 'searching',
              message: 'Buscando fuentes oficiales',
            },
          });

          const webResult = await this.webSearchAgent.search(
            classifiedQuery,
            signal,
          );

          for (const source of webResult.sources) {
            subscriber.next({ event: 'source', data: source });
          }

          subscriber.next({
            event: 'partial',
            data: {
              requirements: webResult.requirements,
              warnings: webResult.warnings,
              sources: webResult.sources,
            },
          });

          subscriber.next({
            event: 'status',
            data: {
              step: 'scraping',
              message: 'Leyendo paginas oficiales encontradas',
            },
          });

          const pages = await this.scraperService.scrapeMany(
            webResult.sources.map((source) => source.url),
            signal,
          );

          subscriber.next({
            event: 'status',
            data: {
              step: 'synthesizing',
              message: 'Sintetizando respuesta final',
            },
          });

          const finalResult = this.synthesisAgent.synthesize(webResult, pages);

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
}
