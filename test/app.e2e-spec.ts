import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { OrchestratorService } from '../src/procedures/agents/orchestrator.service';
import { Observable } from 'rxjs';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const researchResult = {
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
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OrchestratorService)
      .useValue({
        research: jest.fn().mockResolvedValue(researchResult),
        streamResearch: jest.fn(
          () =>
            new Observable((subscriber) => {
              subscriber.next({
                event: 'status',
                data: { step: 'classifying', message: 'Clasificando consulta' },
              });
              subscriber.next({ event: 'final', data: researchResult });
              subscriber.complete();
            }),
        ),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/procedures/research (POST)', () => {
    return request(app.getHttpServer())
      .post('/procedures/research')
      .send({
        query: 'requisitos licencia funcionamiento GAMLP La Paz 2025',
        city: 'La Paz',
        procedureType: 'licencia_funcionamiento',
      })
      .expect(201)
      .expect(researchResult);
  });

  it('/procedures/research/stream (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/procedures/research/stream')
      .query({
        query: 'requisitos licencia funcionamiento GAMLP La Paz 2025',
        city: 'La Paz',
        procedureType: 'licencia_funcionamiento',
      })
      .expect(200)
      .expect('Content-Type', /text\/event-stream/);

    expect(response.text).toContain('event: status');
    expect(response.text).toContain('event: final');
    expect(response.text).toContain('"summary":"Resumen"');
  });

  afterEach(async () => {
    await app.close();
  });
});
