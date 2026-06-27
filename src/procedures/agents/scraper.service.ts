import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ScrapedPage } from '../types/research-result.type';

const MAX_TEXT_LENGTH = 5000;

@Injectable()
export class ScraperService {
  async scrape(url: string, signal?: AbortSignal): Promise<ScrapedPage | null> {
    const parsedUrl = this.parseHttpUrl(url);

    if (!parsedUrl) {
      return null;
    }

    const response = await fetch(parsedUrl.toString(), {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'hackaton-bwa-backend/1.0 procedure-research',
      },
      signal,
    });

    const contentType = response.headers.get('content-type') ?? '';

    if (!response.ok || !contentType.includes('text/html')) {
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    $('script, style, noscript, svg, iframe, nav, footer').remove();

    const title = this.cleanText(
      $('title').first().text() || $('h1').first().text() || parsedUrl.hostname,
    );
    const mainText = this.cleanText(
      $('main').text() || $('article').text() || $('body').text(),
    );

    if (!mainText) {
      return null;
    }

    return {
      title,
      url: parsedUrl.toString(),
      text: mainText.slice(0, MAX_TEXT_LENGTH),
    };
  }

  async scrapeMany(
    urls: string[],
    signal?: AbortSignal,
  ): Promise<ScrapedPage[]> {
    const uniqueUrls = [...new Set(urls)].slice(0, 3);
    const pages = await Promise.allSettled(
      uniqueUrls.map((url) => this.scrape(url, signal)),
    );

    return pages
      .filter(
        (result): result is PromiseFulfilledResult<ScrapedPage | null> =>
          result.status === 'fulfilled',
      )
      .map((result) => result.value)
      .filter((page): page is ScrapedPage => Boolean(page));
  }

  private parseHttpUrl(url: string): URL | null {
    try {
      const parsedUrl = new URL(url);

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return null;
      }

      return parsedUrl;
    } catch {
      return null;
    }
  }

  private cleanText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }
}
