export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function fetchAgents() {
  const res = await fetch(`${API_URL}/api/agents`);
  if (!res.ok) throw new Error('No se pudo cargar la lista de agentes.');
  return res.json();
}

/**
 * Envía un mensaje al agente y consume la respuesta en streaming (SSE).
 * @param {{ agentId: string, message: string, conversationHistory: Array<{role: string, content: string}> }} params
 * @param {{ onDelta?: (text: string) => void, onDone?: (fullText: string) => void, onError?: (message: string) => void }} callbacks
 */
export async function streamChat({ agentId, message, conversationHistory }, { onDelta, onDone, onError, signal } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, message, conversationHistory }),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') return;
    onError?.('No se pudo conectar con el agente.');
    return;
  }

  if (!res.ok || !res.body) {
    onError?.('No se pudo conectar con el agente.');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const rawEvent of events) {
        const lines = rawEvent.split('\n');
        let eventName = 'message';
        let dataLine = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) eventName = line.slice('event: '.length).trim();
          if (line.startsWith('data: ')) dataLine = line.slice('data: '.length);
        }
        if (!dataLine) continue;

        let payload;
        try {
          payload = JSON.parse(dataLine);
        } catch {
          continue;
        }

        if (eventName === 'delta') onDelta?.(payload.text);
        if (eventName === 'done') onDone?.(payload.text);
        if (eventName === 'error') onError?.(payload.message);
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') throw err;
  }
}
