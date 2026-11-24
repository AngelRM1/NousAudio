# NousAudio

Editor de audio y audio a video en el navegador, por NousLogic.
*La razón ordena el cosmos.*

NousAudio es la contraparte de audio de [NousPixel](../editor-imagenes/):
todo el procesado ocurre en el navegador del usuario con Web Audio API,
Canvas y MediaRecorder. Ningún audio sale de tu dispositivo y no hay
servidor: el proyecto se exporta como sitio 100% estático.

## Funciones (v1)

- **Subir varios audios** arrastrando y soltando o con el selector de
  archivos (MP3, WAV, OGG, M4A y más). También se puede soltar un **video
  MP4** y se extrae su pista de audio.
- **Grabadora de voz** directa en el navegador (micrófono, MediaRecorder).
- **Onda visible por pista**, reproducción con sonido, y recorte exacto
  escribiendo el tiempo (`m:ss`) de inicio y fin, con atajos de 30 s, 1, 3
  y 5 minutos.
- **Renombrar** un audio o **renombrar por lote** con patrón `{n}` y prefijo.
- **Procesado por lote**: volumen, velocidad, fundido de entrada y salida,
  normalizar, quitar silencios, invertir audio y dividir en partes por
  minutos.
- **Exportar en WAV**, un audio o todos juntos en un ZIP (JSZip).
- **Estudio Audio a Video**: vista previa en vivo con sonido, formatos
  16:9, 1:1 y 9:16, 6 fondos animados predefinidos o fondo propio con
  imagen fija o video en bucle, visualizador de barras, onda o círculo,
  título, subtítulo y barra de progreso. El video se graba en tiempo real
  con `canvas.captureStream` + MediaRecorder y se descarga en WebM o MP4
  según lo que soporte el navegador.

## Limitación de la v1

La exportación de audio es **solo WAV sin pérdida**. La conversión a MP3
quedó fuera de esta versión y está pendiente para la v2 (ffmpeg.wasm).

La velocidad en la vista previa conserva el tono (playbackRate con
`preservesPitch`). En la exportación WAV el cambio de velocidad se hace por
remuestreo y sí cambia el tono.

## Desarrollo

```bash
pnpm install
pnpm dev
```

## Build y despliegue

```bash
pnpm install
pnpm build
```

El build genera la carpeta `out/` con el sitio estático, listo para
publicar en Cloudflare Pages (o GitHub Pages). No necesita servidor ni
variables de entorno.

## Estructura

- `app/` — página principal (`page.tsx`), layout y estilos (Tailwind 4).
- `components/` — zona de subida con grabadora, lista de audios con onda,
  panel de configuración y renombre, estudio Audio a Video y donaciones.
- `lib/` — tipos, decodificación y procesado de audio (Web Audio API),
  codificador WAV y renombre por lote.

## Donaciones

Voluntarias, sin bloquear funciones: PayPal `paypal.me/engelarm`,
Buy Me a Coffee `engelarm` y `nouslogic.xyz/dona-un-cafe`.
