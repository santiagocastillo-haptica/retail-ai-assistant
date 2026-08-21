const express = require('express');
const { client, MODEL } = require('../anthropicClient');
const { getAgent } = require('../agents');
const { RESPONSE_PROTOCOL } = require('../agents/responseProtocol');
const { JOURNEY_CONTEXT } = require('../agents/journeyContext');
const { logConversationTurn } = require('../firestore');

const router = express.Router();

router.post('/', async (req, res) => {
  const { agentId, message, conversationHistory } = req.body || {};

  if (!agentId || !message) {
    return res.status(400).json({ error: 'Faltan agentId o message.' });
  }

  let agent;
  try {
    agent = getAgent(agentId);
  } catch (err) {
    return res.status(404).json({ error: err.message });
  }

  const history = Array.isArray(conversationHistory) ? conversationHistory : [];
  const messages = [
    ...history.map((turn) => ({ role: turn.role, content: turn.content })),
    { role: 'user', content: message },
  ];

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const systemSections = [agent.systemPrompt, agent.surveySynthesis, JOURNEY_CONTEXT, RESPONSE_PROTOCOL].filter(
      Boolean
    );

    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 2048,
      system: systemSections.join('\n\n'),
      messages,
    });

    stream.on('text', (textDelta) => {
      send('delta', { text: textDelta });
    });

    const finalMessage = await stream.finalMessage();
    const fullText = finalMessage.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    send('done', { text: fullText });
    res.end();

    logConversationTurn({ agent, message, response: fullText });
  } catch (err) {
    console.error('Error en /api/chat:', err);
    send('error', { message: 'Ocurrió un error generando la respuesta.' });
    res.end();
  }
});

module.exports = router;
