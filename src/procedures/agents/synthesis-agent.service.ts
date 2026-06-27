import { Injectable } from '@nestjs/common';
import {
  ResearchResult,
  ResearchSource,
  ScrapedPage,
} from '../types/research-result.type';

@Injectable()
export class SynthesisAgentService {
  synthesize(
    baseResult: ResearchResult,
    scrapedPages: ScrapedPage[],
  ): ResearchResult {
    const scrapedSources: ResearchSource[] = scrapedPages.map((page) => ({
      title: page.title,
      url: page.url,
      type: 'scraped',
      snippet: page.text.slice(0, 280),
    }));

    const sources = this.dedupeSources([
      ...baseResult.sources,
      ...scrapedSources,
    ]);

    return {
      summary: baseResult.summary,
      requirements: this.dedupeText(baseResult.requirements),
      steps: this.dedupeText(baseResult.steps),
      fees: this.dedupeText(baseResult.fees),
      deadlines: this.dedupeText(baseResult.deadlines),
      warnings: this.dedupeText([
        ...baseResult.warnings,
        ...this.scrapingWarnings(
          baseResult.sources.length,
          scrapedPages.length,
        ),
      ]),
      sources,
      confidence: this.resolveConfidence(baseResult.confidence, sources.length),
    };
  }

  private scrapingWarnings(
    sourceCount: number,
    scrapedCount: number,
  ): string[] {
    if (sourceCount === 0) {
      return ['No se recibieron fuentes desde Google Search grounding.'];
    }

    if (scrapedCount === 0) {
      return ['No se pudo complementar la respuesta con scraping HTML.'];
    }

    return [];
  }

  private resolveConfidence(
    confidence: ResearchResult['confidence'],
    sourceCount: number,
  ): ResearchResult['confidence'] {
    if (sourceCount === 0) {
      return 'low';
    }

    return confidence;
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

  private dedupeText(items: string[]): string[] {
    return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
  }
}
