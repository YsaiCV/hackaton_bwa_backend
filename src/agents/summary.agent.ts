import { LlmAgent } from '@google/adk';

/**
 * Agente 2 — Resumidor / Sintetizador
 *
 * Lee los resultados de búsqueda del estado compartido de sesión
 * ({research_results}) y genera una guía clara y accionable para el ciudadano.
 *
 * Lee  : {research_results}  desde session.state (escrito por ResearchAgent)
 * Escribe: output → session.state["final_summary"]  via outputKey
 */
export const summaryAgent = new LlmAgent({
    name: 'SummaryAgent',
    model: process.env.GEMINI_MODEL ?? 'gemini-2.0-flash',
    description:
        'Transforma resultados de investigación en una guía práctica y accionable para el ciudadano.',
    instruction: `
Eres un experto en comunicación clara sobre trámites administrativos.

Con base en la siguiente investigación realizada:

{research_results}

Crea una guía práctica y fácil de entender. Estructura tu respuesta EXACTAMENTE así:

## 📋 Guía para tu Trámite

### ✅ Requisitos y Documentos
Lista los documentos necesarios de forma clara y enumerada.

### 📝 Pasos a Seguir
Enumera el proceso completo en orden lógico.

### 💰 Costos y Tiempos
Detalla costos aproximados y tiempos estimados de respuesta.

### 🏛️ ¿Dónde Realizarlo?
Indica oficinas físicas, sitios web o canales disponibles.

### ⚠️ Puntos Importantes
Menciona advertencias, excepciones o requisitos especiales.

### 🔗 Fuentes Oficiales
Lista las URLs o instituciones donde verificar la información.

---
*Información recopilada automáticamente. Verifica siempre en fuentes oficiales antes de iniciar tu trámite.*
`,
    outputKey: 'final_summary',
});