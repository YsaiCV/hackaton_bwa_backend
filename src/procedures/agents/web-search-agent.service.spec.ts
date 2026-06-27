import { ConfigService } from '@nestjs/config';
import { WebSearchAgentService } from './web-search-agent.service';

const adkMock = {
  GOOGLE_SEARCH: {},
  LlmAgent: jest.fn(),
  InMemoryRunner: jest.fn(),
  stringifyContent: jest.fn(),
  isFinalResponse: jest.fn(),
};

jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

describe('WebSearchAgentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses the last non-partial agent text when ADK does not mark it as final', async () => {
    const response = {
      summary: 'Resumen oficial',
      requirements: ['CI vigente'],
      steps: ['Presentar solicitud'],
      fees: [],
      deadlines: [],
      warnings: [],
      sources: [
        {
          title: 'Gobierno Municipal',
          url: 'https://municipio.gob.bo/tramite',
          type: 'google_grounding',
          snippet: 'Fuente oficial',
        },
      ],
      confidence: 'high',
    };
    const event = {
      author: 'web_search_agent',
      content: {
        role: 'model',
        parts: [{ text: JSON.stringify(response) }],
      },
    };

    adkMock.stringifyContent.mockReturnValue(JSON.stringify(response));
    adkMock.isFinalResponse.mockReturnValue(false);
    adkMock.InMemoryRunner.mockImplementation(() => ({
      async *runEphemeral() {
        yield {
          author: 'user',
          content: { role: 'user', parts: [{ text: 'consulta' }] },
        };
        yield event;
      },
    }));

    const service = new WebSearchAgentService({
      get: jest.fn((key: string) =>
        key === 'GEMINI_API_KEY' ? 'test-key' : undefined,
      ),
    } as unknown as ConfigService);
    jest.spyOn(service as never, 'loadAdk').mockResolvedValue(adkMock as never);

    await expect(service.search('consulta')).resolves.toMatchObject({
      summary: 'Resumen oficial',
      requirements: ['CI vigente'],
      sources: [
        expect.objectContaining({ url: 'https://municipio.gob.bo/tramite' }),
      ],
      confidence: 'high',
    });
  });

  it('uses grounding urls from ADK event metadata when JSON sources are empty', async () => {
    const response = {
      summary: 'Resumen oficial',
      requirements: ['CI vigente'],
      steps: [],
      fees: [],
      deadlines: [],
      warnings: [],
      sources: [],
      confidence: 'medium',
    };
    const event = {
      author: 'web_search_agent',
      content: {
        role: 'model',
        parts: [{ text: JSON.stringify(response) }],
      },
      groundingMetadata: {
        groundingChunks: [
          {
            web: {
              title: 'Gobierno Municipal',
              uri: 'https://municipio.gob.bo/tramite',
            },
          },
        ],
      },
    };

    adkMock.stringifyContent.mockReturnValue(JSON.stringify(response));
    adkMock.isFinalResponse.mockReturnValue(true);
    adkMock.InMemoryRunner.mockImplementation(() => ({
      async *runEphemeral() {
        yield event;
      },
    }));

    const service = new WebSearchAgentService({
      get: jest.fn((key: string) =>
        key === 'GEMINI_API_KEY' ? 'test-key' : undefined,
      ),
    } as unknown as ConfigService);
    jest.spyOn(service as never, 'loadAdk').mockResolvedValue(adkMock as never);

    await expect(service.search('consulta')).resolves.toMatchObject({
      sources: [
        expect.objectContaining({
          title: 'Gobierno Municipal',
          url: 'https://municipio.gob.bo/tramite',
        }),
      ],
      confidence: 'medium',
    });
  });
});
