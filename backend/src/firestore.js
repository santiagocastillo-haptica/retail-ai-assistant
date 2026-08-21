const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

let db = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  try {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8')
    );
    initializeApp({ credential: cert(serviceAccount) });
    db = getFirestore();
  } catch (err) {
    console.error('[error] No se pudo inicializar Firebase Admin (revisa FIREBASE_SERVICE_ACCOUNT_BASE64):', err.message);
  }
} else {
  console.warn('[warn] FIREBASE_SERVICE_ACCOUNT_BASE64 no está configurada. Las conversaciones no se guardarán en Firestore.');
}

/**
 * Guarda un turno de conversación (pregunta + respuesta) en Firestore. No lanza si
 * Firestore no está configurado o si la escritura falla — el chat nunca debe romperse
 * por un problema de logging.
 */
async function logConversationTurn({ agent, message, response }) {
  if (!db) return;
  try {
    await db.collection('conversations').add({
      agentId: agent.id,
      agentName: agent.name,
      archetype: agent.archetype || null,
      message,
      response,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('[error] No se pudo guardar la conversación en Firestore:', err.message);
  }
}

module.exports = { logConversationTurn };
