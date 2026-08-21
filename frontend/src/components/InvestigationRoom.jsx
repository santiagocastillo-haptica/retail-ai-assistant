import { useEffect, useRef, useState } from 'react';
import { useSimStore } from '../state/useSimStore';
import { streamChat } from '../lib/api';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import {
  buildTtsUrl,
  prepareAudio,
  playPreparedAudio,
  playSequence,
  splitReadySentences,
  stopSpeaking,
} from '../lib/voiceProvider';
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
  const [voiceFallback, setVoiceFallback] = useState(false);
  const transcriptEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const cancelledRef = useRef(false);

  const { isSupported: micSupported, isListening, transcript, startListening, stopListening } =
    useSpeechRecognition();

  useEffect(() => {
    if (transcript) setInput(transcript);
  }, [transcript]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agent?.chatHistory]);

  useEffect(() => {
    return () => stopSpeaking();
  }, [activeChatAgentId]);

  if (!agent) return null;

  const appearance = agent.appearance || DEFAULT_APPEARANCE;

  const handleBack = () => {
    stopSpeaking();
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
    setVoiceFallback(false);

    const messageIndex = useSimStore.getState().agents[agent.id].chatHistory.length - 1;
    const voiceProfile = agent.voiceProfile;

    // Reproduce el audio oración por oración conforme va llegando el texto, en vez de
    // esperar la respuesta completa — así el audio arranca mucho antes. La precarga se
    // limita a 1 oración por delante de la que está sonando (no todas de golpe): pedirle
    // a ElevenLabs demasiadas oraciones al mismo tiempo excede el límite de peticiones
    // concurrentes del plan y hace que falle con 429, aunque sobre crédito disponible.
    let sentenceBuffer = '';
    let audioQueue = Promise.resolve();
    let voiceUnavailable = false;
    const sentenceQueue = [];
    let prefetchedUpTo = -1;

    const ensurePrefetched = (uptoIndex) => {
      while (prefetchedUpTo < uptoIndex && prefetchedUpTo + 1 < sentenceQueue.length) {
        prefetchedUpTo += 1;
        const item = sentenceQueue[prefetchedUpTo];
        item.audio = item.url ? prepareAudio(item.url) : null;
      }
    };

    const queueSentence = (rawText) => {
      const text = rawText.trim();
      if (!text) return;
      const url = buildTtsUrl(text, voiceProfile.elevenLabsVoiceId);
      useSimStore.getState().appendMessageAudioSegment(agent.id, messageIndex, { text, url });
      const item = { url, audio: null };
      const index = sentenceQueue.length;
      sentenceQueue.push(item);
      if (voiceUnavailable) return;
      ensurePrefetched(index); // precarga como máximo hasta 1 oración por delante
      audioQueue = audioQueue.then(async () => {
        if (cancelledRef.current || voiceUnavailable) return;
        useSimStore.getState().setAgentStatus(agent.id, 'hablando');
        ensurePrefetched(index + 1); // ya que le toca sonar, adelanta la siguiente
        const ok = item.audio ? await playPreparedAudio(item.audio) : false;
        if (cancelledRef.current) return;
        if (!ok) {
          // No hay respaldo de voz del navegador: si falla ElevenLabs (ej. límite de
          // peticiones concurrentes o crédito agotado), la conversación sigue solo en
          // modo texto en vez de sonar distinto.
          voiceUnavailable = true;
          setVoiceFallback(true);
        }
      });
    };

    await streamChat(
      { agentId: agent.id, message, conversationHistory: history },
      {
        signal: controller.signal,
        onDelta: (delta) => {
          useSimStore.getState().appendAgentDelta(agent.id, delta);
          sentenceBuffer += delta;
          const { sentences, remainder } = splitReadySentences(sentenceBuffer);
          sentenceBuffer = remainder;
          sentences.forEach(queueSentence);
        },
        onDone: (fullText) => {
          useSimStore.getState().finalizeAgentReply(agent.id, fullText);
          setIsSending(false);
          if (sentenceBuffer.trim()) queueSentence(sentenceBuffer);
          audioQueue.then(() => {
            if (!cancelledRef.current) useSimStore.getState().setAgentStatus(agent.id, 'disponible');
          });
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
    stopSpeaking();
    useSimStore.getState().setAgentStatus(agent.id, 'disponible');
    setIsSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleMic = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const toPlaySequenceItems = (msg) =>
    msg.audioSegments && msg.audioSegments.length > 0
      ? msg.audioSegments.map((seg) => ({ content: seg.text, audioUrl: seg.url, voiceProfile: agent.voiceProfile }))
      : [{ content: msg.content, audioUrl: null, voiceProfile: agent.voiceProfile }];

  const handleReplayLast = () => {
    const lastAssistant = [...agent.chatHistory].reverse().find((m) => m.role === 'assistant');
    if (!lastAssistant) return;
    setVoiceFallback(false);
    useSimStore.getState().setAgentStatus(agent.id, 'hablando');
    playSequence(toPlaySequenceItems(lastAssistant)).then((ok) => {
      if (!ok) setVoiceFallback(true);
      useSimStore.getState().setAgentStatus(agent.id, 'disponible');
    });
  };

  const handleReplayAll = () => {
    const assistantMessages = agent.chatHistory.filter((m) => m.role === 'assistant');
    if (assistantMessages.length === 0) return;
    setVoiceFallback(false);
    useSimStore.getState().setAgentStatus(agent.id, 'hablando');
    playSequence(assistantMessages.flatMap(toPlaySequenceItems)).then((ok) => {
      if (!ok) setVoiceFallback(true);
      useSimStore.getState().setAgentStatus(agent.id, 'disponible');
    });
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

  const hasAssistantMessages = agent.chatHistory.some((m) => m.role === 'assistant');

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
              talking={agent.status === 'hablando'}
            />
          </div>
          <p className="avatar-panel__name">{agent.name}</p>
          {agent.archetype && <div className="avatar-panel__archetype">{agent.archetype}</div>}

          {agent.status === 'hablando' && (
            <div className="avatar-panel__speaking-badge">
              <span className="avatar-panel__bar" style={{ height: 8 }} />
              <span className="avatar-panel__bar" style={{ height: 14 }} />
              <span className="avatar-panel__bar" style={{ height: 6 }} />
              <span>Hablando...</span>
            </div>
          )}
          {agent.status === 'pensando' && (
            <div className="avatar-panel__speaking-badge avatar-panel__speaking-badge--thinking">
              <span>Pensando...</span>
            </div>
          )}
          {voiceFallback && (
            <div className="avatar-panel__voice-warning">
              Conversación por voz no disponible. ¡Escríbeme!
            </div>
          )}

          <button
            className="avatar-panel__btn avatar-panel__btn--primary"
            onClick={handleReplayLast}
            disabled={!hasAssistantMessages}
          >
            ↻ Última respuesta
          </button>
          <button
            className="avatar-panel__btn avatar-panel__btn--secondary"
            onClick={handleReplayAll}
            disabled={!hasAssistantMessages}
          >
            ▶ Toda la conversación
          </button>
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
            disabled={!isSending && agent.status !== 'hablando'}
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
            {micSupported && (
              <button
                className={`conversation-panel__mic ${isListening ? 'conversation-panel__mic--active' : ''}`}
                onClick={toggleMic}
                title="Hablar"
              >
                🎤
              </button>
            )}
            <button className="conversation-panel__send" onClick={handleSend} disabled={isSending}>
              ➤
            </button>
          </div>
          {isListening && <p className="conversation-panel__mic-hint">Escuchando…</p>}
        </div>
      </div>
    </div>
  );
}
