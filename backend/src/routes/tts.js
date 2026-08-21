const express = require('express');
const { Readable } = require('stream');

const router = express.Router();

const ELEVENLABS_MODEL_ID = 'eleven_multilingual_v2';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchFromElevenLabs(text, voiceId) {
  return fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({ text, model_id: ELEVENLABS_MODEL_ID }),
  });
}

router.get('/', async (req, res) => {
  const { text, voiceId } = req.query || {};

  if (!text || !voiceId) {
    return res.status(400).json({ error: 'Faltan text o voiceId.' });
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(503).json({ error: 'ELEVENLABS_API_KEY no está configurada en el backend.' });
  }

  try {
    // Si varias oraciones piden audio casi al mismo tiempo, ElevenLabs puede responder
    // 429 por exceder el límite de peticiones concurrentes del plan (no por falta de
    // crédito). En ese caso vale la pena reintentar un par de veces con una pequeña
    // espera, en vez de rendirse y apagar la voz para el resto de la respuesta.
    let elevenRes;
    let errText = '';
    for (let attempt = 0; attempt < 3; attempt += 1) {
      elevenRes = await fetchFromElevenLabs(text, voiceId);
      if (elevenRes.ok && elevenRes.body) break;
      errText = await elevenRes.text().catch(() => '');
      if (elevenRes.status !== 429) break;
      console.warn(`ElevenLabs 429 (concurrencia), reintento ${attempt + 1}/3`);
      await sleep(400 * (attempt + 1));
    }

    if (!elevenRes.ok || !elevenRes.body) {
      console.error('Error de ElevenLabs:', elevenRes.status, errText);
      return res.status(502).json({ error: 'No se pudo generar el audio.' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    // Mismo texto + voz siempre produce el mismo audio: el navegador puede cachearlo y
    // así "repetir" no vuelve a llamar a ElevenLabs ni gasta créditos de nuevo.
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    Readable.fromWeb(elevenRes.body).pipe(res);
  } catch (err) {
    console.error('Error en /api/tts:', err);
    res.status(500).json({ error: 'Ocurrió un error generando el audio.' });
  }
});

module.exports = router;
