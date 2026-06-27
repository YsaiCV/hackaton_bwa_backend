import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ResearchConfidence,
  ResearchResult,
  ResearchSource,
} from '../types/research-result.type';

interface AdkModule {
  GOOGLE_SEARCH: unknown;
  InMemoryRunner: new (input: { agent: unknown; appName?: string }) => {
    runEphemeral(params: {
      newMessage: { role: string; parts: { text: string }[] };
      userId: string;
    }): AsyncGenerator<unknown, void, undefined>;
  };
  LlmAgent: new (input: {
    name: string;
    model: string;
    description?: string;
    instruction: string;
    tools?: unknown[];
  }) => unknown;
  stringifyContent?: (content: unknown) => string;
}

@Injectable()
export class WebSearchAgentService {
  constructor(private readonly configService: ConfigService) {}

  async search(
    classifiedQuery: string,
    signal?: AbortSignal,
  ): Promise<ResearchResult> {
    this.assertGeminiKey();

    const adk = (await import('@google/adk')) as unknown as AdkModule;
    const agent = new adk.LlmAgent({
      name: 'web_search_agent',
      model:
        this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-flash-latest',
      description:
        'Researches Bolivian municipal procedure requirements with official sources.',
      instruction: [
        'Eres un agente de busqueda para tramites municipales de Bolivia.',
        'Usa Google Search grounding para encontrar fuentes oficiales y actuales.',
        'Prioriza dominios .gob.bo, sitios municipales, gacetas oficiales y paginas institucionales.',
        'Devuelve solo JSON valido con esta forma exacta:',
        '{"summary":"string","requirements":["string"],"steps":["string"],"fees":["string"],"deadlines":["string"],"warnings":["string"],"sources":[{"title":"string","url":"string","type":"google_grounding","snippet":"string"}],"confidence":"high|medium|low"}',
        'No inventes costos, plazos ni requisitos. Si no estan claros, ponlos en warnings.',
      ].join(' '),
      tools: [adk.GOOGLE_SEARCH],
    });
    const runner = new adk.InMemoryRunner({
      agent,
      appName: 'procedure-research',
    });

    let text = '';

    for await (const event of runner.runEphemeral({
      newMessage: {
        role: 'user',
        parts: [{ text: classifiedQuery }],
      },
      userId: 'flutter-client',
    })) {
      if (signal?.aborted) {
        break;
      }

      const eventText = this.extractEventText(event, adk.stringifyContent);

      if (eventText) {
        text = eventText;
      }
    }

    return this.normalizeResult(text);
  }

  private assertGeminiKey(): void {
    if (!this.configService.get<string>('GEMINI_API_KEY')) {
      throw new ServiceUnavailableException(
        'GEMINI_API_KEY is required to run WebSearchAgent.',
      );
    }
  }

  private extractEventText(
    event: unknown,
    stringifyContent?: (content: unknown) => string,
  ): string {
    const possibleEvent = event as {
      content?: unknown;
      data?: unknown;
      text?: unknown;
      response?: { text?: unknown };
    };

    if (typeof possibleEvent.text === 'string') {
      return possibleEvent.text;
    }

    if (typeof possibleEvent.response?.text === 'string') {
      return possibleEvent.response.text;
    }

    if (possibleEvent.content && stringifyContent) {
      return stringifyContent(possibleEvent.content);
    }

    return '';
  }

  private normalizeResult(rawText: string): ResearchResult {
    const parsed = this.parseJson(rawText);
    const sources = this.normalizeSources(parsed.sources);

    return {
      summary: this.asString(
        parsed.summary,
        'No se encontro un resumen confiable.',
      ),
      requirements: this.asStringArray(parsed.requirements),
      steps: this.asStringArray(parsed.steps),
      fees: this.asStringArray(parsed.fees),
      deadlines: this.asStringArray(parsed.deadlines),
      warnings: this.asStringArray(parsed.warnings),
      sources,
      confidence: this.asConfidence(parsed.confidence, sources.length),
    };
  }

  private parseJson(rawText: string): Record<string, unknown> {
    const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const jsonCandidate = fencedMatch?.[1] ?? rawText;
    const objectMatch = jsonCandidate.match(/\{[\s\S]*\}/);

    if (!objectMatch) {
      return {
        summary: rawText || 'No se pudo interpretar la respuesta del agente.',
        warnings: ['La respuesta del agente no vino en formato JSON.'],
        sources: [],
        confidence: 'low',
      };
    }

    try {
      return JSON.parse(objectMatch[0]) as Record<string, unknown>;
    } catch {
      return {
        summary: rawText || 'No se pudo interpretar la respuesta del agente.',
        warnings: ['La respuesta del agente no vino en JSON valido.'],
        sources: [],
        confidence: 'low',
      };
    }
  }

  private normalizeSources(value: unknown): ResearchSource[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((source) => source as Record<string, unknown>)
      .filter((source) => typeof source.url === 'string')
      .map((source) => ({
        title: this.asString(source.title, source.url as string),
        url: source.url as string,
        type: 'google_grounding' as const,
        snippet:
          typeof source.snippet === 'string' ? source.snippet : undefined,
      }));
  }

  private asString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  private asConfidence(
    value: unknown,
    sourceCount: number,
  ): ResearchConfidence {
    if (value === 'high' || value === 'medium' || value === 'low') {
      return value;
    }

    return sourceCount > 0 ? 'medium' : 'low';
  }
}
