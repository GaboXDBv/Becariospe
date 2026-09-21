# Verificación de esta entrega

## Comprobaciones ejecutadas

- Sintaxis de los tres archivos JavaScript.
- 34 comprobaciones automatizadas del motor, con DOM, reloj, `fetch` y almacenamiento simulados.
- 20 000 mezclas de alternativas: se preservó el texto, imagen e identidad de la respuesta correcta.
- Distribución de 50 preguntas a partir de 1000 registros de prueba, equilibrada por categoría y sin duplicados; redistribución cuando una categoría se agota.
- Entrenamiento: explicación inmediata, bloqueo de la primera respuesta, omisiones y revisión.
- Simulacro: navegación, cambio de respuesta, tiempos acumulados, marcas, confirmación y vencimiento global con diálogo abierto.
- Contrarreloj: respuesta con avance inmediato, omisiones por tiempo, recuperación de plazos tras suspensión y rechazo de una respuesta tardía destinada a la pregunta anterior.
- Puntuación con aciertos, errores, omisiones, puntajes negativos y precisión indefinida cuando no se responde.
- Personalidad: escala ordenada, sin puntaje, sin corrección y excluida del progreso cognitivo.
- Historial: persistencia, datos dañados y almacenamiento bloqueado.
- Banco inexistente, vacío, JSON mal formado, registros inválidos, opciones incompletas y claves fuera de rango.
- Aviso de imagen ausente; campos vacíos sin imagen reservada.
- HTML: IDs únicos, referencias de scripts y estilos existentes y controles usados por JavaScript presentes.
- Existencia y sintaxis XML de los 11 SVG incluidos.
- Comprobación manual de las 9 soluciones cognitivas de demostración.
- Revisión del CSS: columnas adaptables, imágenes con ancho máximo, tablas con desplazamiento, puntos de adaptación a 900 y 650 px, controles de teclado y reducción de movimiento.

## Alcance y límites

Las pruebas de comportamiento se ejecutaron en un entorno JavaScript con DOM simulado, **no en un navegador real**. No se realizó una prueba visual renderizada a 1920×1080, 1366×768, tablet o teléfono, ni una comprobación de alojamiento real en GitHub Pages. La carga de JSON se probó mediante respuestas `fetch` simuladas, incluidas sus condiciones de error.

La herramienta opcional de lectura de estado para WebMCP se comprobó con un registro simulado. Su compatibilidad en un navegador que implemente esa API no se ha validado; los navegadores sin esa API la ignoran y mantienen todas las funciones de la aplicación.

## Checklist visual al abrir la web

1. Revisar escritorio, tablet y teléfono: legibilidad, ausencia de solapamientos y botones accesibles.
2. Completar entrenamiento y comprobar imágenes y explicaciones.
3. Hacer un simulacro de un minuto, marcar una pregunta y dejar vencer el plazo con la confirmación abierta.
4. Dejar vencer una pregunta de contrarreloj y comprobar el avance.
5. Responder con A–D y 1–4; comprobar la navegación con Tab.
6. Revisar resultados, historial y progreso; recargar para confirmar que el historial continúa disponible.

El Excel maestro y su conversor pertenecen a la siguiente etapa, tal como indica el prompt. Esta entrega contiene el motor y el banco JSON de demostración.
