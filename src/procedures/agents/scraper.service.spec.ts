import { ScraperService } from './scraper.service';

describe('ScraperService', () => {
  let service: ScraperService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    service = new ScraperService();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('extracts title and normalized page text from HTML', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      text: async () => `
        <html>
          <head><title>Licencia GAMLP</title></head>
          <body>
            <nav>menu</nav>
            <main>
              <h1>Licencia de funcionamiento</h1>
              <p>Requisito uno</p>
              <p>Requisito dos</p>
            </main>
            <script>window.noise = true</script>
          </body>
        </html>
      `,
    } as Response);

    const result = await service.scrape('https://lapaz.bo/licencia');

    expect(result).toEqual({
      title: 'Licencia GAMLP',
      url: 'https://lapaz.bo/licencia',
      text: 'Licencia de funcionamiento Requisito uno Requisito dos',
    });
  });

  it('ignores non HTML responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/pdf' }),
      text: async () => 'pdf',
    } as Response);

    await expect(
      service.scrape('https://lapaz.bo/file.pdf'),
    ).resolves.toBeNull();
  });
});
