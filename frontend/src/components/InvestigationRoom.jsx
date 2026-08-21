import { useEffect, useRef, useState } from 'react';
import { useSimStore } from '../state/useSimStore';
import { streamChat } from '../lib/api';
import SimAvatar from './SimAvatar';

const DEFAULT_APPEARANCE = { skinTone: '#e7b48c', hairColor: '#3b2a1e', hairStyle: 'short' };

export default function InvestigationRoom() {
  const activeChatAgentId = useSimStore((state) => state.activeChatAgentId);
  const agent = useSimStore((state) =>
    activeChatAgentId ? state.agents[activeChatAgentId] : null
  );
  const backToSelect = useSimStore((state) => state.backToSelect);

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const transcriptEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agent?.chatHistory]);

  if (!agent) return null;

  const appearance = agent.appearance || DEFAULT_APPEARANCE;

  const handleBack = () => {
    backToSelect();
  };

  const handleSend = async () => {
    const message = input.trim();
    if (!message || isSending) return;

    const store = useSimStore.getState();
    const history = agent.chatHistory.map(({ role, content }) => ({ role, content }));

    store.appendUserMessage(agent.id, message);
    store.setAgentStatus(agent.id, 'pensando');
    store.startAgentReply(agent.id);
    setInput('');
    setIsSending(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    cancelledRef.current = false;

    await streamChat(
      { agentId: agent.id, message, conversationHistory: history },
      {
        signal: controller.signal,
        onDelta: (delta) => {
          useSimStore.getState().appendAgentDelta(agent.id, delta);
        },
        onDone: (fullText) => {
          useSimStore.getState().finalizeAgentReply(agent.id, fullText);
          useSimStore.getState().setAgentStatus(agent.id, 'disponible');
          setIsSending(false);
        },
        onError: (msg) => {
          useSimStore.getState().finalizeAgentReply(agent.id, `⚠️ ${msg}`);
          useSimStore.getState().setAgentStatus(agent.id, 'disponible');
          setIsSending(false);
        },
      }
    );
  };

  const handleStop = () => {
    cancelledRef.current = true;
    abortControllerRef.current?.abort();
    useSimStore.getState().setAgentStatus(agent.id, 'disponible');
    setIsSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDownload = () => {
    const lines = agent.chatHistory.map((m) => `${m.role === 'user' ? 'Tú' : agent.name}: ${m.content}`);
    const blob = new Blob([lines.join('\n\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversacion_${agent.name.toLowerCase().replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="investigation-room">
      <button className="investigation-room__back" onClick={handleBack}>
        ← Expedientes
      </button>

      <div className="investigation-room__layout">
        <div className="avatar-panel">
          <div className="avatar-panel__circle">
            <SimAvatar
              bodyColor={agent.avatarColor}
              skinTone={appearance.skinTone}
              hairColor={appearance.hairColor}
              hairStyle={appearance.hairStyle}
            />
          </div>
          <p className="avatar-panel__name">{agent.name}</p>
          {agent.archetype && <div className="avatar-panel__archetype">{agent.archetype}</div>}

          {agent.status === 'pensando' && (
            <div className="avatar-panel__speaking-badge avatar-panel__speaking-badge--thinking">
              <span>Pensando...</span>
            </div>
          )}

          <button
            className="avatar-panel__btn avatar-panel__btn--secondary"
            onClick={handleDownload}
            disabled={agent.chatHistory.length === 0}
          >
            ⬇ Descargar conversación
          </button>
          <button
            className="avatar-panel__btn avatar-panel__btn--secondary"
            onClick={handleStop}
            disabled={!isSending}
          >
            ■ Detener
          </button>
        </div>

        <div className="conversation-panel">
          <div className="transcript">
            {agent.chatHistory.length === 0 && (
              <div className="transcript__empty">Escríbele algo a {agent.name} para empezar.</div>
            )}
            {agent.chatHistory.map((msg, index) => (
              <div key={index} className={`bubble bubble--${msg.role}`}>
                {msg.content || '…'}
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>

          <div className="conversation-panel__input-row">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Escribe tu pregunta para ${agent.name}`}
            />
            <button className="conversation-panel__send" onClick={handleSend} disabled={isSending}>
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
