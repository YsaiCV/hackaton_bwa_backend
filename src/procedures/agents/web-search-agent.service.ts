import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ResearchConfidence,
  ResearchResult,
  ResearchSource,
} from '../types/research-result.type';

interface AdkEvent {
  author?: string;
  content?: {
    role?: string;
    parts?: { text?: string; thought?: boolean }[];
  };
  partial?: boolean;
  actions?: unknown;
}

interface AdkModule {
  GOOGLE_SEARCH: unknown;
  InMemoryRunner: new (input: { agent: unknown; appName?: string }) => {
    runEphemeral(params: {
      newMessage: { role: string; parts: { text: string }[] };
      userId: string;
    }): AsyncGenerator<AdkEvent, void, undefined>;
  };
  LlmAgent: new (input: {
    name: string;
    model: string;
    description?: string;
    instruction: string;
    tools?: unknown[];
  }) => unknown;
  /** Takes the full Event object (not just .content) and returns concatenated text */
  stringifyContent?: (event: AdkEvent) => string;
  /** Returns true only for the agent's final text response (not tool calls or partials) */
  isFinalResponse?: (event: AdkEvent) => boolean;
}

@Injectable()
export class WebSearchAgentService {
  constructor(private readonly configService: ConfigService) {}

  async search(
    classifiedQuery: string,
    signal?: AbortSignal,
  ): Promise<ResearchResult> {
    this.assertGeminiKey();

    const adk = await this.loadAdk();
    const agent = new adk.LlmAgent({
      name: 'web_search_agent',
      model:
        this.configService.get<string>('GEMINI_MODEL') ?? 'gemini-2.0-flash',
      description:
        'Researches Bolivian municipal procedure requirements with official sources.',
      instruction: [
        'Eres un agente de busqueda para tramites municipales de Bolivia.',
        'Prioriza dominios .gob.bo, sitios municipales, gacetas oficiales y paginas institucionales.',
        'Devuelve solo JSON valido con esta forma exacta:',
        '{"summary":"string","requirements":["string"],"steps":["string"],"fees":["string"],"deadlines":["string"],"warnings":["string"],"sources":[{"title":"string","url":"string","type":"google_grounding","snippet":"string"}],"confidence":"high|medium|low"}',
        'No uses markdown, bloques de codigo, comentarios ni texto antes o despues del JSON.',
        'El primer caracter de tu respuesta debe ser { y el ultimo debe ser }.',
        'No inventes costos, plazos ni requisitos. Si no estan claros, ponlos en warnings.',
      ].join(' '),
      tools: [],
    });
    const runner = new adk.InMemoryRunner({
      agent,
      appName: 'procedure-research',
    });

    let finalText = '';
    let fallbackText = '';
    const groundingSources: ResearchSource[] = [];

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
      groundingSources.push(...this.extractSourcesFromEvent(event));

      if (eventText && this.isAgentTextEvent(event)) {
        fallbackText = eventText;
      }

      if (eventText && adk.isFinalResponse?.(event)) {
        finalText = eventText;
      }
    }

    return this.normalizeResult(finalText || fallbackText, groundingSources);
  }

  private assertGeminiKey(): void {
    if (!this.configService.get<string>('GEMINI_API_KEY')) {
      throw new ServiceUnavailableException(
        'GEMINI_API_KEY is required to run WebSearchAgent.',
      );
    }
  }

  private async loadAdk(): Promise<AdkModule> {
    return (await import('@google/adk')) as unknown as AdkModule;
  }

  private extractEventText(
    event: AdkEvent,
    stringifyContent?: (event: AdkEvent) => string,
  ): string {
    // stringifyContent(event) reads event.content.parts[].text (excluding thoughts)
    const text = stringifyContent?.(event);
    if (text) {
      return text;
    }

    // Fallback: manually read the first non-thought text part
    const parts = event.content?.parts ?? [];
    for (const part of parts) {
      if (!part.thought && typeof part.text === 'string' && part.text.trim()) {
        return part.text;
      }
    }

    return '';
  }

  private isAgentTextEvent(event: AdkEvent): boolean {
    if (event.partial) {
      return false;
    }

    if (event.content?.role === 'user') {
      return false;
    }

    const parts = event.content?.parts ?? [];

    return parts.some(
      (part) =>
        !part.thought && typeof part.text === 'string' && part.text.trim(),
    );
  }

  private extractSourcesFromEvent(event: AdkEvent): ResearchSource[] {
    const sources: ResearchSource[] = [];
    const visit = (value: unknown): void => {
      if (!value || typeof value !== 'object') {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }

      const record = value as Record<string, unknown>;
      const url = this.asUrl(record.url) ?? this.asUrl(record.uri);

      if (url) {
        sources.push({
          title: this.asString(record.title, url),
          url,
          type: 'google_grounding',
          snippet:
            typeof record.snippet === 'string'
              ? record.snippet
              : typeof record.text === 'string'
                ? record.text
                : undefined,
        });
      }

      Object.values(record).forEach(visit);
    };

    visit(event);
    return this.dedupeSources(sources);
  }

  private normalizeResult(
    rawText: string,
    fallbackSources: ResearchSource[] = [],
  ): ResearchResult {
    const parsed = this.parseJson(rawText);
    const sources = this.dedupeSources([
      ...this.normalizeSources(parsed.sources),
      ...fallbackSources,
    ]);

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
      .map((source) => ({
        source,
        normalizedUrl: this.asUrl(source.url) ?? this.asUrl(source.uri),
      }))
      .filter((source) => typeof source.normalizedUrl === 'string')
      .map(({ source, normalizedUrl }) => ({
        title: this.asString(source.title, normalizedUrl as string),
        url: normalizedUrl as string,
        type: 'google_grounding' as const,
        snippet:
          typeof source.snippet === 'string' ? source.snippet : undefined,
      }));
  }

  private dedupeSources(sources: ResearchSource[]): ResearchSource[] {
    const seen = new Set<string>();

    return sources.filter((source) => {
      const key = source.url.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
  }

  private asString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  private asUrl(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol)
        ? url.toString()
        : undefined;
    } catch {
      return undefined;
    }
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
