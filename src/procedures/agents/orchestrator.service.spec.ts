import { lastValueFrom, toArray } from 'rxjs';
import type { ProcedureResearchEvent } from '../types/research-result.type';
import { OrchestratorService } from './orchestrator.service';
import { SynthesisAgentService } from './synthesis-agent.service';

describe('OrchestratorService', () => {
  let service: OrchestratorService;

  beforeEach(() => {
    service = new OrchestratorService(new SynthesisAgentService());
  });

  it('returns a synthesis-only result without web search or scraping', async () => {
    const result = await service.research({
      query: 'licencia funcionamiento',
      city: 'La Paz',
      procedureType: 'licencia_funcionamiento',
    });

    expect(result).toMatchObject({
      requirements: [],
      steps: [],
      fees: [],
      deadlines: [],
      sources: [],
      confidence: 'low',
    });
    expect(result.summary).toContain('licencia funcionamiento');
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        'El agente de web search esta desactivado porque su respuesta no cumple el formato JSON esperado.',
        'El agente de scraping esta desactivado porque depende de las fuentes del web search.',
      ]),
    );
  });

  it('streams only classification, synthesis and final events', async () => {
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
      'final',
    ]);
    expect(events.map((event) => event.event)).not.toContain('source');
    expect(events.map((event) => event.event)).not.toContain('partial');
    expect(events.at(-1)).toMatchObject({
      event: 'final',
      data: {
        requirements: [],
        sources: [],
        confidence: 'low',
      },
    });
  });
});
