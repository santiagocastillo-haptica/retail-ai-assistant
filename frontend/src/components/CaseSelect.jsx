import { useSimStore } from '../state/useSimStore';
import SimAvatar from './SimAvatar';

const DEFAULT_APPEARANCE = { skinTone: '#e7b48c', hairColor: '#3b2a1e', hairStyle: 'short' };

export default function CaseSelect() {
  const agents = useSimStore((state) => state.agents);
  const agentOrder = useSimStore((state) => state.agentOrder);
  const selectAgent = useSimStore((state) => state.selectAgent);

  return (
    <div className="case-select">
      <header className="case-select__header">
        <h1>Expedientes de clientes — Rappi</h1>
        <p>Elige un expediente para llevarte al personaje a la sala de investigación.</p>
      </header>

      <div className="case-select__grid">
        {agentOrder.map((agentId) => {
          const agent = agents[agentId];
          const appearance = agent.appearance || DEFAULT_APPEARANCE;
          return (
            <button key={agentId} className="case-card" onClick={() => selectAgent(agentId)}>
              <div className="case-card__portrait">
                <SimAvatar
                  bodyColor={agent.avatarColor}
                  skinTone={appearance.skinTone}
                  hairColor={appearance.hairColor}
                  hairStyle={appearance.hairStyle}
                />
              </div>
              <div className="case-card__name">{agent.name}</div>
              <div className="case-card__cta">Investigar →</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
