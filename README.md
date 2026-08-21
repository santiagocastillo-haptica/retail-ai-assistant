# Retail AI Assistant — Plataforma de agentes IA (clientes Rappi retail)

Plataforma estilo videojuego (inspirada en Ace Attorney) para hablar 1 a 1 con agentes IA
(vía Claude) que representan arquetipos de comportamiento de clientes del segmento retail
(compra de súper) de Rappi. Elige un "expediente" en la pantalla principal y entra a la
sala de investigación a interrogar al personaje, con chat de texto en streaming.

Los 3 agentes están poblados con perfiles de comportamiento de compra (hábitos de
planificación, dolores principales, nivel de delegación por categoría y paradigma de
interacción ideal con un asistente IA): El Organizador del Mes, El Explorador de Sabores y
La Cazadora de Ofertas — ver
[backend/src/agents/README.md](backend/src/agents/README.md).

## Estructura

- `backend/` — Node.js + Express + `@anthropic-ai/sdk`. Streaming de chat vía SSE.
- `frontend/` — React + Vite + Zustand. Pantalla de selección de expediente, sala de
  investigación con diálogo tipo máquina de escribir (solo texto, sin voz).

## Setup local

```bash
# Backend
cd backend
npm install
cp .env.example .env   # agrega tu ANTHROPIC_API_KEY
npm run dev            # http://localhost:3001

# Frontend (en otra terminal)
cd frontend
npm install
npm run dev             # http://localhost:5173
```

Abre `http://localhost:5173`, elige un expediente y empieza a chatear.

## Registro de conversaciones (Firestore)

Si configuras `FIREBASE_SERVICE_ACCOUNT_BASE64` en el backend, cada pregunta y respuesta
se guarda en la colección `conversations` de Firestore (agentId, agentName, archetype,
message, response, createdAt). Si la variable no está configurada, el chat funciona igual
pero no se guarda nada — no es obligatoria.

Para configurarla:
1. En la consola de Firebase → ⚙️ Configuración del proyecto → **Cuentas de servicio** →
   **Generar nueva clave privada**. Se descarga un `.json` con credenciales de administrador
   — trátalo como un secreto, nunca lo subas al repo.
2. Codifícalo en base64 en una sola línea:
   - Windows (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes("ruta\a\tu-archivo.json")) | Set-Clipboard`
     (queda copiado en el portapapeles)
   - macOS/Linux: `base64 -i tu-archivo.json | pbcopy` (o redirige a un archivo)
3. Pega ese texto como el valor de `FIREBASE_SERVICE_ACCOUNT_BASE64` en tu `.env` local y/o
   en las variables de entorno del backend en Render.

## Deployment en vivo

Ver [DEPLOY.md](DEPLOY.md) para desplegar backend + frontend en Render.
