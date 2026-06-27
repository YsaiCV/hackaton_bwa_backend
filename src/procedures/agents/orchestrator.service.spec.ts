import { lastValueFrom, toArray } from 'rxjs';
import { OrchestratorService } from './orchestrator.service';
import { ScraperService } from './scraper.service';
import { SynthesisAgentService } from './synthesis-agent.service';
import { WebSearchAgentService } from './web-search-agent.service';
import type { ProcedureResearchEvent } from '../types/research-result.type';

describe('OrchestratorService', () => {
  it('streams status, source, partial and final events', async () => {
    const webSearchAgent = {
      search: jest.fn().mockResolvedValue({
        summary: 'Resumen',
        requirements: ['CI'],
        steps: ['Enviar formulario'],
        fees: [],
        deadlines: [],
        warnings: [],
        sources: [
          {
            title: 'GAMLP',
            url: 'https://lapaz.bo/licencia',
            type: 'google_grounding',
          },
        ],
        confidence: 'high',
      }),
    } as unknown as WebSearchAgentService;
    const scraperService = {
      scrapeMany: jest.fn().mockResolvedValue([
        {
          title: 'GAMLP',
          url: 'https://lapaz.bo/licencia',
          text: 'Requisitos oficiales',
        },
      ]),
    } as unknown as ScraperService;
    const service = new OrchestratorService(
      webSearchAgent,
      scraperService,
      new SynthesisAgentService(),
    );

    const events: ProcedureResearchEvent[] = await lastValueFrom(
      service
        .streamResearch({
          query: 'licencia funcionamiento',
          city: 'La Paz',
          procedureType: 'licencia_funcionamiento',
        })
        .pipe(toArray()),
    );

    expect(events.map((event) => event.event)).toEqual([
      'status',
      'status',
      'source',
      'partial',
      'status',
      'status',
      'final',
    ]);
    expect(events.at(-1)).toMatchObject({
      event: 'final',
      data: {
        summary: 'Resumen',
        requirements: ['CI'],
        sources: expect.arrayContaining([
          expect.objectContaining({ url: 'https://lapaz.bo/licencia' }),
        ]),
      },
    });
  });
});
