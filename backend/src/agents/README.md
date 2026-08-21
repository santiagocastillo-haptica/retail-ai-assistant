# Configuración de agentes

`agentConfigs.json` contiene los 3 personajes de la plataforma, basados en la perfilación
de comportamiento de clientes de Rappi retail (segmento de compra de súper), según su
nivel de delegación en la app y su forma de planificar la compra: El Organizador del Mes,
El Explorador de Sabores y La Cazadora de Ofertas.

- Los 3 agentes están poblados con datos de perfilación de comportamiento (hábitos de
  compra, dolores principales, nivel de delegación por categoría y paradigma de interacción
  ideal), sintetizados en un `systemPrompt` por personaje siguiendo un patrón común. No son
  transcripciones de entrevista textuales — son personajes construidos a partir de esos
  perfiles de comportamiento.
- No hay `surveySynthesis` (patrones agregados de encuesta por segmento) todavía para
  ningún agente — se puede agregar más adelante si se cuenta con esa data, con el mismo
  formato que se usó en el proyecto de referencia (Nexu Sims).

No es necesario tocar `id`, `avatarColor`, `appearance`, `archetype`, `archetypeStat` ni
`voiceProfile` a menos que se quiera ajustar la identidad visual/sonora de cada personaje.
`appearance` controla el avatar ilustrado (`skinTone`, `hairColor`,
`hairStyle`: `"ponytail" | "short" | "long" | "bun" | "balding"`). `archetype`/`archetypeStat` son el
sello y estadística que se muestran en la tarjeta de selección de expediente.

`voiceProfile.elevenLabsVoiceId` es el Voice ID de ElevenLabs para ese personaje (ver
[Voice Library](https://elevenlabs.io/app/voice-library)). Hoy está vacío para los 4 — la
voz cae de vuelta a la Web Speech API del navegador usando `pitch`/`rate`. No rompe nada
dejarlo así mientras se eligen las voces.

## Capas del system prompt

`routes/chat.js` arma el `system` de cada llamada concatenando, en orden:

1. `agent.systemPrompt` — identidad y hechos concretos del personaje (agentConfigs.json).
2. `agent.surveySynthesis` (opcional) — patrones agregados de encuestas del segmento de
   ese arquetipo, si existen. Hoy ningún agente lo tiene. Para agregarlo, sumar el campo
   `surveySynthesis` a su entrada en `agentConfigs.json`.
3. `JOURNEY_CONTEXT` (`journeyContext.js`) — mapa compartido de las etapas del customer
   journey de compra de súper en Rappi (antes/durante/después), para que el agente ubique
   en qué momento del proceso está una situación y mantenga coherencia con su propio
   perfil. Es contexto de referencia, no algo para recitar tal cual.
4. `RESPONSE_PROTOCOL` (`responseProtocol.js`) — instrucciones de comportamiento
   compartidas (voz de cliente, no inventar información, estructura de
   reacción/percepción/cierre al validar una propuesta, etc.).

Las capas 3 y 4 son compartidas por los 4 agentes — se editan una sola vez y aplican a
todos. La capa 2 es específica de cada arquetipo cuando exista esa data.

## Activar/desactivar un personaje

Agrega `"active": false` al agente para ocultarlo de `/api/agents` (no aparece en la
pantalla de selección) y bloquear `/api/chat` para su `id` (responde 404). No borra nada
de su configuración — para reactivarlo, quita el campo o ponlo en `true`. Hoy los 3 agentes
están activos.
