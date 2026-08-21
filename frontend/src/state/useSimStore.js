import { create } from 'zustand';

export const useSimStore = create((set) => ({
  agents: {},
  agentOrder: [],
  loaded: false,
  screen: 'select', // 'select' | 'room'
  activeChatAgentId: null,

  setAgents: (agentList) => {
    const agents = {};
    const agentOrder = [];
    agentList.forEach((agent) => {
      agentOrder.push(agent.id);
      agents[agent.id] = {
        ...agent,
        status: 'disponible',
        chatHistory: [],
      };
    });
    set({ agents, agentOrder, loaded: true });
  },

  setAgentStatus: (agentId, status) => {
    set((state) => {
      const agent = state.agents[agentId];
      if (!agent) return state;
      return { agents: { ...state.agents, [agentId]: { ...agent, status } } };
    });
  },

  selectAgent: (agentId) => set({ activeChatAgentId: agentId, screen: 'room' }),
  backToSelect: () => set({ screen: 'select' }),

  appendUserMessage: (agentId, text) => {
    set((state) => {
      const agent = state.agents[agentId];
      if (!agent) return state;
      const chatHistory = [...agent.chatHistory, { role: 'user', content: text }];
      return { agents: { ...state.agents, [agentId]: { ...agent, chatHistory } } };
    });
  },

  startAgentReply: (agentId) => {
    set((state) => {
      const agent = state.agents[agentId];
      if (!agent) return state;
      const chatHistory = [...agent.chatHistory, { role: 'assistant', content: '' }];
      return { agents: { ...state.agents, [agentId]: { ...agent, chatHistory } } };
    });
  },

  appendAgentDelta: (agentId, delta) => {
    set((state) => {
      const agent = state.agents[agentId];
      if (!agent) return state;
      const chatHistory = [...agent.chatHistory];
      const lastIndex = chatHistory.length - 1;
      if (lastIndex < 0 || chatHistory[lastIndex].role !== 'assistant') return state;
      chatHistory[lastIndex] = {
        ...chatHistory[lastIndex],
        content: chatHistory[lastIndex].content + delta,
      };
      return { agents: { ...state.agents, [agentId]: { ...agent, chatHistory } } };
    });
  },

  finalizeAgentReply: (agentId, fullText) => {
    set((state) => {
      const agent = state.agents[agentId];
      if (!agent) return state;
      const chatHistory = [...agent.chatHistory];
      const lastIndex = chatHistory.length - 1;
      if (lastIndex >= 0 && chatHistory[lastIndex].role === 'assistant') {
        chatHistory[lastIndex] = { ...chatHistory[lastIndex], content: fullText };
      }
      return { agents: { ...state.agents, [agentId]: { ...agent, chatHistory } } };
    });
  },

  appendMessageAudioSegment: (agentId, index, segment) => {
    set((state) => {
      const agent = state.agents[agentId];
      if (!agent || !agent.chatHistory[index]) return state;
      const chatHistory = [...agent.chatHistory];
      const existing = chatHistory[index].audioSegments || [];
      chatHistory[index] = { ...chatHistory[index], audioSegments: [...existing, segment] };
      return { agents: { ...state.agents, [agentId]: { ...agent, chatHistory } } };
    });
  },
}));
