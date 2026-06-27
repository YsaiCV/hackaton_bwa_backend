export type ResearchConfidence = 'high' | 'medium' | 'low';

export type ResearchSourceType = 'google_grounding' | 'scraped';

export interface ResearchSource {
  title: string;
  url: string;
  type: ResearchSourceType;
  snippet?: string;
}

export interface ResearchResult {
  summary: string;
  requirements: string[];
  steps: string[];
  fees: string[];
  deadlines: string[];
  warnings: string[];
  sources: ResearchSource[];
  confidence: ResearchConfidence;
}

export interface ScrapedPage {
  title: string;
  url: string;
  text: string;
}

export type ProcedureResearchEvent =
  | {
      event: 'status';
      data: { step: string; message: string };
    }
  | {
      event: 'source';
      data: ResearchSource;
    }
  | {
      event: 'partial';
      data: Partial<ResearchResult>;
    }
  | {
      event: 'final';
      data: ResearchResult;
    }
  | {
      event: 'error';
      data: { message: string };
    };
