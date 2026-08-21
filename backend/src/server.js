require('dotenv').config();
const express = require('express');
const cors = require('cors');

const chatRouter = require('./routes/chat');
const ttsRouter = require('./routes/tts');
const { agentConfigs } = require('./agents');

const app = express();
const PORT = process.env.PORT || 3001;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const LOCALHOST_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[warn] ANTHROPIC_API_KEY no está configurada. Copia .env.example a .env y agrega tu clave.');
}
if (!process.env.ELEVENLABS_API_KEY) {
  console.warn('[warn] ELEVENLABS_API_KEY no está configurada. La voz caerá al Web Speech API del navegador.');
}

// Acepta el origen configurado explícitamente, más cualquier puerto local
// (Vite cae a otro puerto si 5173 está ocupado). Nunca se permiten orígenes externos.
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === FRONTEND_ORIGIN || LOCALHOST_ORIGIN_RE.test(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Origen no permitido por CORS.'));
      }
    },
  })
);
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.get('/api/agents', (req, res) => {
  const publicAgents = agentConfigs
    .filter((agent) => agent.active !== false)
    .map(({ id, name, avatarColor, appearance, voiceProfile, personalitySummary, archetype, archetypeStat }) => ({
      id,
      name,
      avatarColor,
      appearance,
      voiceProfile,
      personalitySummary,
      archetype,
      archetypeStat,
    }));
  res.json(publicAgents);
});

app.use('/api/chat', chatRouter);
app.use('/api/tts', ttsRouter);

app.listen(PORT, () => {
  console.log(`Backend de agentes-sims escuchando en http://localhost:${PORT}`);
});
