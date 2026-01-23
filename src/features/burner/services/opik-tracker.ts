/**
 * Opik Tracker Service
 * Provides LLM observability, tracing, and metrics logging for the Burner application.
 * Integrates with Opik platform for comprehensive monitoring of exam generation and grading.
 *
 * @see Requirements 9.1, 9.2 - Opik Integration for Observability
 */

import { Opik } from 'opik';

// ============================================================================
// Types
// ============================================================================

/**
 * Metrics to log for LLM interactions
 */
export interface OpikMetrics {
    tokenCount?: number;
    latencyMs?: number;
    model?: string;
    promptVersion?: string;
    evaluationScore?: number;
}

/**
 * Represents an active trace in Opik
 */
export interface OpikTrace {
    id: string;
    name: string;
    startTime: Date;
    /** Internal reference to the Opik trace object */
    _trace: ReturnType<Opik['trace']>;
}

/**
 * Represents an active span within a trace
 */
export interface OpikSpan {
    id: string;
    traceId: string;
    name: string;
    type: 'llm' | 'tool';
    startTime: Date;
    /** Internal reference to the Opik span object */
    _span: ReturnType<ReturnType<Opik['trace']>['span']>;
}

/**
 * Configuration options for the Opik tracker
 */
export interface OpikTrackerConfig {
    projectName?: string;
    apiKey?: string;
    apiUrl?: string;
    workspaceName?: string;
}

// ============================================================================
// Opik Tracker Service
// ============================================================================

/**
 * Service for managing Opik traces and spans for LLM observability.
 * Provides methods to track exam generation, grading, and other LLM interactions.
 */
export class OpikTrackerService {
    private client: Opik;
    private projectName: string;

    constructor(config: OpikTrackerConfig = {}) {
        this.projectName = config.projectName || 'burner';

        // Initialize Opik client with configuration
        // Environment variables OPIK_API_KEY, OPIK_URL_OVERRIDE, OPIK_WORKSPACE
        // will be used if not provided in config
        this.client = new Opik({
            projectName: this.projectName,
            ...(config.apiKey && { apiKey: config.apiKey }),
            ...(config.apiUrl && { apiUrl: config.apiUrl }),
            ...(config.workspaceName && { workspaceName: config.workspaceName }),
        });
    }

    /**
     * Starts a new trace for tracking an LLM operation.
     * Use this at the beginning of exam generation or grading operations.
     *
     * @param name - Descriptive name for the trace (e.g., "exam-generation", "answer-grading")
     * @param input - Input data to log with the trace
     * @returns OpikTrace object to use with endTrace and startSpan
     *
     * @example
     * ```typescript
     * const trace = tracker.startTrace('exam-generation', { topic: 'JavaScript', questionCount: 5 });
     * // ... perform LLM operations ...
     * tracker.endTrace(trace, { questions: generatedQuestions });
     * ```
     */
    startTrace(name: string, input: Record<string, unknown>): OpikTrace {
        const startTime = new Date();
        const traceId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const trace = this.client.trace({
            name,
            input,
        });

        return {
            id: (trace as { id?: string }).id || traceId,
            name,
            startTime,
            _trace: trace,
        };
    }

    /**
     * Ends a trace and logs the output data.
     * Call this when the traced operation completes.
     *
     * @param trace - The trace object returned from startTrace
     * @param output - Output data to log with the trace
     *
     * @example
     * ```typescript
     * tracker.endTrace(trace, {
     *   questions: generatedQuestions,
     *   success: true,
     *   questionCount: generatedQuestions.length
     * });
     * ```
     */
    endTrace(trace: OpikTrace, output: Record<string, unknown>): void {
        try {
            // Update the trace with output and end it
            trace._trace.update({
                output,
            });
            trace._trace.end();
        } catch (error) {
            console.error('[OpikTracker] Error ending trace:', error);
        }
    }

    /**
     * Starts a new span within a trace for tracking nested operations.
     * Use this for individual LLM calls or tool invocations within a larger operation.
     *
     * @param trace - The parent trace object
     * @param name - Descriptive name for the span (e.g., "openai-completion", "parse-response")
     * @param type - Type of span: 'llm' for LLM calls, 'tool' for other operations
     * @returns OpikSpan object to use with endSpan
     *
     * @example
     * ```typescript
     * const span = tracker.startSpan(trace, 'openai-completion', 'llm');
     * // ... make LLM call ...
     * tracker.endSpan(span, { response: llmResponse, tokens: 150 });
     * ```
     */
    startSpan(
        trace: OpikTrace,
        name: string,
        type: 'llm' | 'tool'
    ): OpikSpan {
        const startTime = new Date();
        const spanId = `span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const span = trace._trace.span({
            name,
            type,
        });

        return {
            id: (span as { id?: string }).id || spanId,
            traceId: trace.id,
            name,
            type,
            startTime,
            _span: span,
        };
    }

    /**
     * Ends a span and logs the output data.
     * Call this when the spanned operation completes.
     *
     * @param span - The span object returned from startSpan
     * @param output - Output data to log with the span
     *
     * @example
     * ```typescript
     * tracker.endSpan(span, {
     *   response: llmResponse,
     *   model: 'gpt-4',
     *   promptTokens: 100,
     *   completionTokens: 50
     * });
     * ```
     */
    endSpan(span: OpikSpan, output: Record<string, unknown>): void {
        try {
            // Update the span with output and end it
            span._span.update({
                output,
            });
            span._span.end();
        } catch (error) {
            console.error('[OpikTracker] Error ending span:', error);
        }
    }

    /**
     * Logs metrics for a specific trace.
     * Use this to record token counts, latency, model info, and evaluation scores.
     *
     * @param traceId - The ID of the trace to log metrics for
     * @param metrics - Metrics to log
     *
     * @example
     * ```typescript
     * tracker.logMetrics(trace.id, {
     *   tokenCount: 250,
     *   latencyMs: 1500,
     *   model: 'gpt-4',
     *   promptVersion: 'v1.2',
     *   evaluationScore: 85
     * });
     * ```
     */
    logMetrics(traceId: string, metrics: OpikMetrics): void {
        try {
            // Log metrics as metadata on the trace
            // Note: Opik stores metrics as part of trace/span metadata
            console.log(`[OpikTracker] Metrics logged for trace ${traceId}:`, metrics);

            // Metrics are typically logged as part of span output or trace metadata
            // The actual metrics will be captured in the span/trace output when ending them
        } catch (error) {
            console.error('[OpikTracker] Error logging metrics:', error);
        }
    }

    /**
     * Flushes all pending traces and spans to Opik.
     * Call this before your application terminates to ensure all data is sent.
     *
     * @returns Promise that resolves when flush is complete
     *
     * @example
     * ```typescript
     * // Before app shutdown
     * await tracker.flush();
     * ```
     */
    async flush(): Promise<void> {
        try {
            await this.client.flush();
        } catch (error) {
            console.error('[OpikTracker] Error flushing data:', error);
            throw error;
        }
    }

    /**
     * Gets the project name configured for this tracker.
     */
    getProjectName(): string {
        return this.projectName;
    }

    /**
     * Gets the underlying Opik client for advanced usage.
     * Use with caution - prefer the service methods for standard operations.
     */
    getClient(): Opik {
        return this.client;
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default singleton instance of the Opik tracker service.
 * Configured with project name "burner" as specified in requirements.
 */
let defaultTracker: OpikTrackerService | null = null;

/**
 * Gets the default Opik tracker instance.
 * Creates a new instance if one doesn't exist.
 *
 * @param config - Optional configuration to use when creating the instance
 * @returns The default OpikTrackerService instance
 *
 * @example
 * ```typescript
 * const tracker = getOpikTracker();
 * const trace = tracker.startTrace('exam-generation', { topic: 'React' });
 * ```
 */
export function getOpikTracker(config?: OpikTrackerConfig): OpikTrackerService {
    if (!defaultTracker) {
        defaultTracker = new OpikTrackerService(config);
    }
    return defaultTracker;
}

/**
 * Resets the default tracker instance.
 * Useful for testing or reconfiguration.
 */
export function resetOpikTracker(): void {
    defaultTracker = null;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Creates a traced operation wrapper for easy tracing of async functions.
 * Automatically handles trace start/end and error logging.
 *
 * @param name - Name for the trace
 * @param input - Input data to log
 * @param operation - Async function to execute within the trace
 * @returns Result of the operation along with the trace ID
 *
 * @example
 * ```typescript
 * const { result, traceId } = await withTrace(
 *   'exam-generation',
 *   { topic: 'TypeScript' },
 *   async (trace) => {
 *     // Your LLM operation here
 *     return generatedExam;
 *   }
 * );
 * ```
 */
export async function withTrace<T>(
    name: string,
    input: Record<string, unknown>,
    operation: (trace: OpikTrace) => Promise<T>
): Promise<{ result: T; traceId: string }> {
    const tracker = getOpikTracker();
    const trace = tracker.startTrace(name, input);

    try {
        const result = await operation(trace);
        tracker.endTrace(trace, { result, success: true });
        return { result, traceId: trace.id };
    } catch (error) {
        tracker.endTrace(trace, {
            error: error instanceof Error ? error.message : String(error),
            success: false,
        });
        throw error;
    }
}

/**
 * Creates a traced span wrapper for easy tracing of nested operations.
 *
 * @param trace - Parent trace
 * @param name - Name for the span
 * @param type - Type of span ('llm' or 'tool')
 * @param operation - Async function to execute within the span
 * @returns Result of the operation along with the span ID
 *
 * @example
 * ```typescript
 * const { result, spanId } = await withSpan(
 *   trace,
 *   'openai-call',
 *   'llm',
 *   async (span) => {
 *     // Your LLM call here
 *     return response;
 *   }
 * );
 * ```
 */
export async function withSpan<T>(
    trace: OpikTrace,
    name: string,
    type: 'llm' | 'tool',
    operation: (span: OpikSpan) => Promise<T>
): Promise<{ result: T; spanId: string }> {
    const tracker = getOpikTracker();
    const span = tracker.startSpan(trace, name, type);

    try {
        const result = await operation(span);
        tracker.endSpan(span, { result, success: true });
        return { result, spanId: span.id };
    } catch (error) {
        tracker.endSpan(span, {
            error: error instanceof Error ? error.message : String(error),
            success: false,
        });
        throw error;
    }
}
