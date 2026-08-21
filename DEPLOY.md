# Deployment en vivo (Render)

El repo ya está listo para desplegarse en [Render](https://render.com) usando el
`render.yaml` de la raíz (backend Node persistente + frontend estático). Estos pasos
requieren tu cuenta de Render y tu autorización a GitHub — no los puedo hacer yo.

## Opción A — Blueprint (recomendado, un solo flujo)

1. Entra a [dashboard.render.com](https://dashboard.render.com) (crea cuenta si no tienes).
2. **New +** → **Blueprint**.
3. Conecta tu cuenta de GitHub si no lo has hecho, y selecciona el repo
   `santiagocastillo-haptica/retail-ai-assistant`.
4. Render va a detectar `render.yaml` y proponer 2 servicios:
   - `retail-ai-assistant-backend` (web service, Node)
   - `retail-ai-assistant-frontend` (static site)
5. Te va a pedir valores para las variables marcadas `sync: false`:
   - `ANTHROPIC_API_KEY` → tu API key real de Anthropic.
   - `FRONTEND_ORIGIN` y `VITE_API_URL` → **déjalas vacías por ahora** (todavía no
     existen las URLs finales, se resuelven en el paso 2 de abajo).
6. Dale **Apply** / **Create**. Espera a que ambos servicios terminen de desplegar.

## Opción B — Manual (si prefieres no usar blueprints)

1. **New +** → **Web Service** → conecta el repo → Root Directory: `backend` →
   Build Command: `npm install` → Start Command: `npm start`.
2. **New +** → **Static Site** → mismo repo → Root Directory: `frontend` →
   Build Command: `npm install && npm run build` → Publish Directory: `dist`.

## Paso 2 — conectar las dos URLs (obligatorio en ambas opciones)

Cuando Render termine el primer deploy, cada servicio tiene su propia URL
(`https://retail-ai-assistant-backend-XXXX.onrender.com` y
`https://retail-ai-assistant-frontend-XXXX.onrender.com`). Ahora:

1. En **retail-ai-assistant-backend** → pestaña **Environment** → agrega/edita:
   - `FRONTEND_ORIGIN` = la URL completa del frontend (con `https://`, sin `/` final).
2. En **retail-ai-assistant-frontend** → pestaña **Environment** → agrega/edita:
   - `VITE_API_URL` = la URL completa del backend (con `https://`, sin `/` final).
3. Guarda y dispara un **Manual Deploy** en **ambos** servicios (el frontend necesita
   reconstruirse porque Vite incrusta `VITE_API_URL` en el build, no lo lee en runtime).

## Verificación

- Abre la URL del frontend. Deberías ver la pantalla de expedientes.
- Abre la consola del navegador — si ves errores de CORS, revisa que
  `FRONTEND_ORIGIN` en el backend coincida EXACTO (protocolo + dominio, sin slash final)
  con la URL real del frontend.
- Prueba el chat con un personaje para confirmar que `ANTHROPIC_API_KEY` quedó bien
  configurada en el backend.

## Notas

- El plan free de Render "duerme" el backend tras ~15 min sin tráfico; el primer
  request después de eso tarda unos segundos en despertar. Normal para un demo/taller.
- Nunca pongas `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY` ni `FIREBASE_SERVICE_ACCOUNT_BASE64`
  en `render.yaml` ni en el repo — solo en el dashboard de Render (por eso están como
  `sync: false`). Si agregas una variable nueva a `render.yaml` para un servicio que ya
  existe, Render no la pide sola — tienes que agregarla a mano en la pestaña **Environment**
  de ese servicio y disparar un **Manual Deploy**.
