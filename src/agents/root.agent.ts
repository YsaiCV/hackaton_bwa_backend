import { LlmAgent, SequentialAgent } from '@google/adk';
import { researchAgent } from './research.agent';
import { summaryAgent } from './summary.agent';

/**
 * Pipeline Secuencial — Orquestador determinístico
 *
 * Ejecuta los sub-agentes en orden estricto:
 *   1. ResearchAgent  → busca con Google Search
 *   2. SummaryAgent   → genera la guía final
 *
 * Comparten estado a través de session.state:
 *   research_topic    → escrito por el coordinador raíz
 *   research_results  → escrito por ResearchAgent, leído por SummaryAgent
 *   final_summary     → escrito por SummaryAgent (respuesta final)
 */
export const citizenshipPipeline = new SequentialAgent({
    name: 'CitizenshipPipeline',
    description:
        'Pipeline que investiga el trámite con Google Search y luego genera un resumen claro.',
    subAgents: [researchAgent, summaryAgent],
});

/**
 * Agente Raíz — Punto de entrada y coordinador
 *
 * Analiza el prompt del usuario, extrae el tipo de trámite
 * y delega al pipeline secuencial.
 */
export const rootAgent = new LlmAgent({
    name: 'CitizenshipCoordinator',
    model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
    description: 'Coordinador principal de consultas sobre trámites de ciudadanía e inmigración.',
    instruction: `
Eres el coordinador de un sistema de asistencia para trámites de ciudadanía.

Cuando el usuario haga una consulta:
1. Analiza e identifica con precisión qué trámite necesita.
2. Guarda el tema de investigación como 'research_topic' en el estado de la sesión.
3. Delega al CitizenshipPipeline para que investigue y genere la guía.

Trámites que puedes manejar:
- Solicitud de ciudadanía / naturalización
- Renovación o emisión de pasaporte
- Visa de residencia permanente o temporal
- Reunificación familiar
- Registro de nacimiento en el exterior
- Doble ciudadanía o nacionalidad
- Permiso de trabajo o residencia

Si la consulta NO es sobre trámites de ciudadanía o inmigración, responde amablemente
indicando que solo puedes ayudar con ese tipo de gestiones.
`,
    subAgents: [citizenshipPipeline],
});