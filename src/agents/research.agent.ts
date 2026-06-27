import { LlmAgent, GOOGLE_SEARCH } from '@google/adk';

/**
 * Agente 1 — Investigador
 *
 * Usa la herramienta GOOGLE_SEARCH nativa de ADK para buscar
 * información oficial sobre el trámite de ciudadanía solicitado.
 *
 * Lee  : {research_topic}  desde el session.state (inyectado por el coordinador)
 * Escribe: output → session.state["research_results"]  via outputKey
 */
export const researchAgent = new LlmAgent({
    name: 'ResearchAgent',
    model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
    description:
        'Especialista en buscar información oficial sobre trámites de ciudadanía usando Google Search.',
    instruction: `
Eres un investigador especializado en trámites de ciudadanía e inmigración.

El tema a investigar es:
{research_topic}

Instrucciones:
1. Usa Google Search para encontrar información oficial (sitios .gov, embajadas, consulados, organismos públicos).
2. Realiza búsquedas que cubran:
   - Requisitos y documentos necesarios
   - Pasos del proceso paso a paso
   - Costos y tasas oficiales
   - Tiempos estimados de respuesta
   - Oficinas o canales donde realizar el trámite
3. Prioriza SIEMPRE fuentes oficiales sobre blogs, foros o noticias.
4. Devuelve todos los datos encontrados de forma estructurada, incluyendo las URLs de origen.
`,
    tools: [GOOGLE_SEARCH],
    outputKey: 'research_results', // guarda en session.state["research_results"]
});