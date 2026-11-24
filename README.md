# NousAudio

Editor de audio en el navegador, por NousLogic. La razón ordena el cosmos.

Prototipo v1, 100% en el navegador: nada se sube a ningún servidor, todo el
procesado es local con Web Audio API, Canvas y MediaRecorder.

## Qué hace

- Subir varios audios arrastrando y soltando, y extraer el audio de un video MP4
- Grabadora de voz directa en el navegador
- Onda visible por pista y recorte exacto escribiendo el tiempo (`m:ss`),
  con atajos de 30 s, 1, 3 y 5 min
- Renombrar uno por uno o en lote con patrón y prefijo
- Volumen, velocidad, fundido, normalizar, quitar silencios, invertir
  y dividir en partes por minutos
- Exportar en WAV, uno por uno o todos juntos

## Audio a video

- Vista previa en vivo con sonido
- Formatos 16:9, 1:1 y 9:16
- 6 fondos animados predefinidos, o imagen fija o video propio en bucle
- Visualizador de barras, onda o círculo, con título, subtítulo
  y barra de progreso
- Descarga el video grabado en tiempo real (WebM o MP4 según el navegador)

## Uso

Es una página estática de un solo archivo. Abre `index.html` en el navegador,
o publícala tal cual en GitHub Pages o Cloudflare Pages.

## Limitación de la v1

La exportación de audio es WAV sin pérdida. La conversión a MP3 quedó
pendiente para la v2 (ffmpeg.wasm).
