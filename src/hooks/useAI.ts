'use client';

import { useState, useCallback, useRef } from 'react';
import type { WorkspaceOperation } from '@/types/operations';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

interface UseAIOptions {
  onToolCall?: (toolName: string, result: unknown) => void;
  onStream?: (chunk: string) => void;
}

interface UseAIReturn {
  sendMessage: (content: string, context?: UserContext) => Promise<void>;
  sendMessageStream: (content: string, context?: UserContext) => Promise<void>;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  clearMessages: () => void;
}

interface UserContext {
  subjects?: string[];
  grade?: string;
  state?: string;
  analogyIntensity?: number;
  selectedModel?: string;
}

export function useAI(options?: UseAIOptions): UseAIReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(async (content: string, context?: UserContext) => {
    setIsLoading(true);
    setError(null);

    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          userContext: context,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message || '',
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const sendMessageStream = useCallback(async (content: string, context?: UserContext) => {
    setIsLoading(true);
    setError(null);

    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);

    const assistantMessage: Message = {
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          userContext: context,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        if (options?.onStream) {
          options.onStream(chunk);
        }

        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
          }
          return prev;
        });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request cancelled');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to send message');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [messages, options]);

  return {
    sendMessage,
    sendMessageStream,
    messages,
    isLoading,
    error,
    clearMessages,
  };
}

export function useAIOperations() {
  const [operations, setOperations] = useState<WorkspaceOperation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOperations = useCallback(async (status?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);

      const response = await fetch(`/api/ai/operations?${params}`);
      const data = await response.json();
      setOperations(data.operations || []);
    } catch (err) {
      console.error('Failed to fetch operations:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createOperation = useCallback(async (
    type: string,
    entityType: string,
    payload: Record<string, unknown>,
    entityId?: string
  ) => {
    const response = await fetch('/api/ai/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, entityType, payload, entityId }),
    });

    const data = await response.json();
    return data;
  }, []);

  const rollbackOperation = useCallback(async (operationId: string) => {
    const response = await fetch(`/api/ai/operations/${operationId}/rollback`, {
      method: 'POST',
    });
    return response.json();
  }, []);

  return {
    operations,
    isLoading,
    fetchOperations,
    createOperation,
    rollbackOperation,
  };
}

interface ExecutionResult {
  message: string;
  tools_used: string[];
  tool_results?: Array<{ tool: string; result: unknown }>;
}

export function useAIExecution() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);

  const execute = useCallback(async (
    messages: Array<{ role: string; content: string }>,
    userContext?: UserContext
  ) => {
    setIsExecuting(true);
    setResult(null);

    try {
      const response = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, userContext }),
      });

      const data = await response.json();
      setResult(data);
      return data;
    } catch (err) {
      console.error('Execution failed:', err);
      throw err;
    } finally {
      setIsExecuting(false);
    }
  }, []);

  return { execute, isExecuting, result };
}