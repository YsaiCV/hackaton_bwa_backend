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
  model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  description:
    'Transforma resultados de investigación en una guía práctica y accionable para el ciudadano.',
  instruction: `
Eres un experto en comunicación clara sobre trámites administrativos.

Con base en la siguiente investigación realizada:

{research_results}

Crea una guía práctica y fácil de entender. 
Debes detectar inteligentemente si la investigación describe UN SOLO trámite específico o VARIOS trámites necesarios para lograr un objetivo (ej. abrir una empresa, casarse).

Devuelve ÚNICA Y EXCLUSIVAMENTE un objeto JSON válido (sin formato markdown \`\`\`json, solo las llaves). No incluyas texto antes ni después.

CASO A: SI ES UN SOLO TRÁMITE ESPECÍFICO
Usa EXACTAMENTE esta estructura:
{
  "type": "single_procedure",
  "title": "Nombre del trámite (ej: Pago de impuesto municipal)",
  "institution": "Nombre de la institución (ej: Gobierno Autónomo Municipal)",
  "cost": "Costo aproximado (ej: Bs. 100-500 o Gratuito)",
  "time": "Tiempo estimado (ej: 1 día, 2 semanas)",
  "modality": "Modalidad (ej: Presencial / Virtual)",
  "iconEmoji": "Un solo emoji representativo (ej: 🏠, 📄, 🛂)",
  "steps": [
    "Paso 1 detallado...",
    "Paso 2 detallado..."
  ],
  "documents": [
    {
      "name": "Documento 1...",
      "requiresRequestLetter": false,
      "requestLetterFields": []
    },
    {
      "name": "Carta de Solicitud...",
      "requiresRequestLetter": true,
      "requestLetterFields": [
        { "name": "ciudad", "label": "Ciudad" },
        { "name": "destinatarioNombre", "label": "Nombre del destinatario" },
        { "name": "destinatarioCargo", "label": "Cargo del destinatario" },
        { "name": "referencia", "label": "Referencia o motivo de la carta" },
        { "name": "cuerpo", "label": "Cuerpo explicativo de la solicitud" },
        { "name": "remitenteNombre", "label": "Nombre del solicitante" },
        { "name": "remitenteCI", "label": "C.I. del solicitante" }
      ]
    }
  ],
  "recommendations": [
    "Recomendación 1...",
    "Recomendación 2..."
  ],
  "whoCanDoIt": "Descripción de quién puede hacerlo (ej: El titular o tercero con poder)",
  "whoCanDoItSubtitle": "Resumen corto (ej: Titular o tercero)",
  "whereToDoIt": [
    "Ubicación 1 o enlace web...",
    "Ubicación 2..."
  ],
  "sources": [
    {
      "title": "Nombre de la página o institución fuente",
      "url": "URL completa del sitio"
    }
  ],
  "hasDownloadableDocs": true/false,
  "downloadableFormUrl": "URL del PDF rellenable (si lo hay) o null",
  "hasDynamicFill": true/false
}

CASO B: SI SON MÚLTIPLES TRÁMITES PARA UN OBJETIVO (ej: "Abrir un restaurante")
Usa EXACTAMENTE esta estructura:
{
  "type": "procedure_list",
  "summary": "Para lograr tu objetivo, necesitas realizar los siguientes trámites en orden:",
  "procedures": [
    {
      "title": "Nombre del trámite 1 (ej. Licencia de Funcionamiento)",
      "description": "Breve descripción de para qué sirve este trámite o quién lo emite."
    },
    {
      "title": "Nombre del trámite 2 (ej. Registro en SEPREC)",
      "description": "Breve descripción..."
    }
  ]
}
`,
  outputKey: 'final_summary',
});