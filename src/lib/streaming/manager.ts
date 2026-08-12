export type StreamEventType = 
  | 'token'
  | 'operation_start'
  | 'operation_progress'
  | 'operation_complete'
  | 'operation_error'
  | 'entity_created'
  | 'entity_updated'
  | 'entity_deleted'
  | 'tool_call'
  | 'tool_result'
  | 'error';

interface StreamData {
  type?: string;
  content?: string;
  tool_call?: unknown;
  tool_result?: unknown;
  [key: string]: unknown;
}

export interface StreamEvent {
  type: StreamEventType;
  data: unknown;
  timestamp: number;
}

export interface StreamOptions {
  onToken?: (token: string) => void;
  onEvent?: (event: StreamEvent) => void;
  onError?: (error: Error) => void;
  onComplete?: () => void;
}

export class StreamingManager {
  private options: StreamOptions;
  private buffer: string = '';
  private eventBuffer: StreamEvent[] = [];

  constructor(options: StreamOptions) {
    this.options = options;
  }

  processChunk(chunk: string): void {
    this.buffer += chunk;

    const lines = this.buffer.split('\n\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          this.handleData(data);
        } catch {
          if (line.includes('tool_call:')) {
            const toolCall = line.replace('tool_call: ', '');
            try {
              const parsed = JSON.parse(toolCall);
              this.emitEvent({
                type: 'tool_call',
                data: parsed,
                timestamp: Date.now(),
              });
            } catch {
              this.emitEvent({
                type: 'token',
                data: line,
                timestamp: Date.now(),
              });
            }
          } else {
            this.emitEvent({
              type: 'token',
              data: line,
              timestamp: Date.now(),
            });
          }
        }
      }
    }
  }

  private handleData(data: StreamData): void {
    if (data.type === 'token' && this.options.onToken) {
      this.options.onToken(data.content || '');
    } else if (data.tool_call) {
      this.emitEvent({
        type: 'tool_call',
        data: data.tool_call,
        timestamp: Date.now(),
      });
    } else if (data.tool_result) {
      this.emitEvent({
        type: 'tool_result',
        data: data.tool_result,
        timestamp: Date.now(),
      });
    } else if (data.error) {
      this.emitEvent({
        type: 'error',
        data: data.error,
        timestamp: Date.now(),
      });
      if (this.options.onError) {
        this.options.onError(new Error(String(data.error)));
      }
    } else if (data.operation_progress) {
      this.emitEvent({
        type: 'operation_progress',
        data: data.operation_progress,
        timestamp: Date.now(),
      });
    } else if (data.entity_created) {
      this.emitEvent({
        type: 'entity_created',
        data: data.entity_created,
        timestamp: Date.now(),
      });
    }
  }

  private emitEvent(event: StreamEvent): void {
    this.eventBuffer.push(event);
    if (this.options.onEvent) {
      this.options.onEvent(event);
    }
  }

  complete(): void {
    if (this.buffer.trim()) {
      this.emitEvent({
        type: 'token',
        data: this.buffer,
        timestamp: Date.now(),
      });
    }
    if (this.options.onComplete) {
      this.options.onComplete();
    }
  }

  getEvents(): StreamEvent[] {
    return [...this.eventBuffer];
  }

  clear(): void {
    this.buffer = '';
    this.eventBuffer = [];
  }
}

export function createStreamingManager(options: StreamOptions): StreamingManager {
  return new StreamingManager(options);
}

export function createSSEStream(
  url: string,
  options: StreamOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    const manager = createStreamingManager(options);

    fetch(url, { method: 'POST' })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        const readerRef = reader;

        function read(): void {
          readerRef.read().then(({ done, value }) => {
            if (done) {
              manager.complete();
              resolve();
              return;
            }

            const chunk = decoder.decode(value, { stream: true });
            manager.processChunk(chunk);
            read();
          }).catch(reject);
        }

        read();
      })
      .catch(err => {
        if (options.onError) {
          options.onError(err);
        }
        reject(err);
      });
  });
}