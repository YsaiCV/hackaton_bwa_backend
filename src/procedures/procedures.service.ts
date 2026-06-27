import { Injectable, Logger } from '@nestjs/common';
import { InMemoryRunner } from '@google/adk';
import { Content } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';

import { rootAgent } from 'src/agents/root.agent';
import { CitizenshipQueryDto, CitizenshipResponseDto, AgentEventDto } from 'src/agents/dto/citizenship.dto';

/**
 * CitizenshipService
 *
 * Gestiona el ciclo de vida de las sesiones ADK y orquesta
 * la ejecución del pipeline multi-agente para trámites de ciudadanía.
 *
 * Arquitectura ADK usada:
 *   InMemoryRunner → rootAgent (LlmAgent)
 *                       └── CitizenshipPipeline (SequentialAgent)
 *                               ├── ResearchAgent (LlmAgent + GOOGLE_SEARCH)
 *                               └── SummaryAgent  (LlmAgent)
 *
 * Tipos correctos:
 *   - InMemoryRunner  → de '@google/adk'  (incluye sessionService internamente)
 *   - Content         → de '@google/genai' (tipo del mensaje del usuario)
 *   - runner.runAsync({ userId, sessionId, newMessage }) → objeto, no posicional
 *   - event.turnComplete → booleano para detectar la respuesta final del turno
 */
@Injectable()
export class CitizenshipService {
    private readonly logger = new Logger(CitizenshipService.name);

    private readonly appName = process.env.ADK_APP_NAME ?? 'citizenship_assistant';

    /**
     * InMemoryRunner encapsula tanto el Runner como el InMemorySessionService
     * en un solo objeto conveniente. Es la forma idiomática en ADK TypeScript.
     *
     * Se instancia una vez por servicio (singleton NestJS) para reutilizar
     * el sessionService interno entre requests del mismo proceso.
     */
    private readonly runner = new InMemoryRunner({
        agent: rootAgent,
        appName: this.appName,
    });

    /**
     * Ejecuta el pipeline de agentes para una consulta de ciudadanía.
     * Crea o reutiliza una sesión ADK según el sessionId recibido.
     */
    async processQuery(dto: CitizenshipQueryDto): Promise<CitizenshipResponseDto> {
        const startTime = Date.now();
        const userId = dto.userId ?? 'anonymous';
        const sessionId = dto.sessionId ?? uuidv4();

        this.logger.log(`[${sessionId}] Procesando consulta: "${dto.query}"`);

        // ── 1. Crear la sesión ADK con estado inicial ───────────────────────────
        //    research_topic se inyecta en session.state para que los agentes
        //    puedan leerlo con la sintaxis {research_topic} en sus instrucciones.
        await this.runner.sessionService.createSession({
            appName: this.appName,
            userId,
            sessionId,
            state: {
                research_topic: dto.query,
            },
        });

        this.logger.debug(`[${sessionId}] Sesión ADK creada — userId: ${userId}`);

        // ── 2. Construir el mensaje del usuario ────────────────────────────────
        //    Content viene de '@google/genai', no de '@google/adk'
        const userMessage: Content = {
            role: 'user',
            parts: [{ text: dto.query }],
        };

        // ── 3. Ejecutar el pipeline y recolectar eventos ───────────────────────
        //    runAsync recibe un OBJETO { userId, sessionId, newMessage }
        //    (no argumentos posicionales como en Python)
        const events: AgentEventDto[] = [];
        let finalSummary = '';

        const runStream = this.runner.runAsync({
            userId,
            sessionId,
            newMessage: userMessage,
        });

        for await (const event of runStream) {
            const agentName: string = event.author ?? 'unknown';
            const content = event.content?.parts?.[0]?.text ?? '';

            if (event.errorCode) {
                throw new Error(`Error del Agente: ${event.errorMessage} (Código: ${event.errorCode})`);
            }

            if (!content) continue; // saltar eventos sin texto (tool calls intermedios)

            this.logger.debug(
                `[${sessionId}] [${agentName}] ${content.slice(0, 100)}...`,
            );

            // Clasificar el evento según el agente que lo emitió
            const eventType: AgentEventDto['type'] =
                agentName === 'ResearchAgent' ? 'tool_call' : 'text';

            events.push({ agent: agentName, type: eventType, content });

            // event.turnComplete === true marca la respuesta final del turno completo
            if (event.turnComplete) {
                finalSummary = content;
                events[events.length - 1].type = 'final';
            }
        }

        // Fallback: si turnComplete no se emitió, usar el último evento con texto
        if (!finalSummary && events.length > 0) {
            finalSummary = events[events.length - 1].content ?? '';
            events[events.length - 1].type = 'final';
        }

        const processingTimeMs = Date.now() - startTime;
        this.logger.log(`[${sessionId}] Completado en ${processingTimeMs}ms`);

        return {
            sessionId,
            summary: finalSummary,
            events,
            processingTimeMs,
        };
    }
}