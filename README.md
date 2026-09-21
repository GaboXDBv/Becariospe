# Simulador psicotécnico

Aplicación estática en español para practicar razonamiento, rapidez y precisión. No representa a ninguna empresa ni reproduce un examen oficial. HTML, CSS y JavaScript sin frameworks, compilación, backend ni servicios externos obligatorios.

## Empezar

1. Extrae el ZIP.
2. Sube **el contenido de `simulador-psicotecnico`** a la raíz de tu repositorio de GitHub: `index.html`, `css`, `js`, `data`, `img` y este archivo. No subas solo el ZIP ni solo el HTML.
3. En la configuración de GitHub Pages del repositorio, selecciona la rama que contiene los archivos y su carpeta raíz como origen de publicación.
4. Abre la dirección de GitHub Pages que corresponda a tu repositorio.

Todas las rutas son relativas, por lo que también funciona en `https://usuario.github.io/nombre-repositorio/`. No se ha publicado ni conectado un repositorio automáticamente.

**El doble clic en `index.html` no es una forma fiable de abrirlo**: el navegador puede bloquear la lectura del JSON mediante `fetch` bajo `file://`. Para una prueba local, usa un servidor de archivos. Si ya tienes Python, ejecuta dentro de esta carpeta:

```sh
python -m http.server 8000
```

Luego abre `http://localhost:8000`. Python se usa solo en esta opción local, no en GitHub Pages. No se requiere Node.js para usar o publicar la web.

## Estructura

```text
simulador-psicotecnico/
  index.html
  css/styles.css
  js/app.js
  js/timer.js
  js/resultados.js
  data/preguntas.json
  img/preguntas/       ← imágenes de enunciados
  img/opciones/       ← imágenes de alternativas
  README.md
  VERIFICACION.md
  .nojekyll
```

- `app.js`: carga y validación, filtros, selección equilibrada, mezcla, sesión, navegación, teclado y revisión.
- `timer.js`: actualización del reloj y formato `MM:SS`.
- `resultados.js`: cálculo de puntuación, tablas, historial y estadísticas.
- `preguntas.json`: **única fuente de preguntas**; se lee con `fetch('./data/preguntas.json')`.

## Banco incluido

10 preguntas originales de demostración: 9 cognitivas y 1 de personalidad. Incluye series numéricas, lógica, cálculo rápido, analogías, atención, rotaciones, secuencias de figuras y matrices. Las 11 imágenes SVG incluidas funcionan como archivos reales, no como rutas ficticias pendientes. También se admiten PNG, JPEG, WebP y GIF.

La demo busca verificar el motor; no es un banco suficiente para preparar un proceso de selección completo. La dificultad declarada es orientativa, no una calibración psicométrica.

Puedes solicitar 10, 20, 30, 50 o 100 preguntas. Si los filtros dejan menos preguntas, se avisa y se usan las disponibles sin duplicarlas. El reparto usa turnos entre categorías, redistribuye las plazas cuando una se agota y mezcla el orden final. Las categorías se obtienen del banco, por lo que no necesitas editar el motor al incorporar otras.

## Modos

- **Entrenamiento:** sin límite; la primera respuesta queda registrada y bloqueada. Muestra corrección y explicación. Puedes omitir avanzando. El tiempo de sesión incluye leer las explicaciones.
- **Simulacro:** tiempo global configurable de 1 a 180 minutos. Puedes cambiar respuestas, ir a la anterior o siguiente, saltar mediante el mapa, marcar y regresar a preguntas. No revela soluciones hasta finalizar. La confirmación muestra preguntas marcadas y permite regresar a ellas. El reloj no se pausa con el diálogo abierto.
- **Contrarreloj:** aplica `tiempo` de cada pregunta. Responder u omitir avanza de inmediato. Si vence el plazo, se registra una omisión. Los plazos se calculan con marcas de tiempo: cambiar de pestaña no pausa el examen. Al regresar, se procesan las preguntas cuyos plazos también hayan vencido.

A–D y 1–4 responden. Enter avanza cuando el foco no está sobre un botón; en un botón mantiene su acción nativa. Mantener una tecla pulsada no responde múltiples preguntas. No hay sonidos.

Al salir o recargar una sesión activa, el navegador puede mostrar su advertencia nativa. **Las sesiones en curso no se restauran**; solo se guarda el resumen al final.

## Puntajes y métricas

Edita estas constantes al principio de `js/resultados.js`:

```js
const PUNTOS_ACIERTO = 1;
const PENALIZACION_ERROR = 0.5;
```

- Puntaje bruto = aciertos × puntos por acierto.
- Penalización = errores × penalización por error.
- Puntaje final = bruto − penalización. Puede ser negativo.
- Omitidas = 0 puntos.
- Precisión = aciertos / respondidas × 100; se muestra «—» si no hubo respuestas.
- Aciertos / total = aciertos / todas las preguntas × 100; también es la métrica por área e incluye las omisiones.
- Promedio por pregunta = duración completa / total de preguntas, incluidas las omitidas.
- Tiempo de revisión = suma de visitas a esa pregunta; en entrenamiento incluye lectura de la explicación. Una pregunta nunca visitada tiene 0 s.

«Mi progreso» combina los tres modos cognitivos y todas las dificultades. La precisión promedio es la media de las precisiones de las sesiones que tuvieron respuestas; el mejor resultado es la mayor precisión. El tiempo medio usa duración acumulada / preguntas acumuladas. Las áreas se ordenan por aciertos / total; los empates mantienen el orden de aparición. Estos indicadores son de práctica, no una medición validada de capacidad.

## Formato del banco

El JSON es un **array de objetos**. Las cuatro opciones siempre están en un array y la clave `correcta` empieza en cero:

```json
[
  {
    "id": 101,
    "categoria": "Series numéricas",
    "dificultad": "Difícil",
    "tipo": "texto",
    "pregunta": "2, 6, 15, 31, 56, ¿?",
    "imagen": "",
    "opciones": [
      {"texto": "82", "imagen": ""},
      {"texto": "87", "imagen": ""},
      {"texto": "92", "imagen": ""},
      {"texto": "96", "imagen": ""}
    ],
    "correcta": 2,
    "explicacion": "Las diferencias son 4, 9, 16, 25 y 36. Por eso 56 + 36 = 92.",
    "tiempo": 12
  }
]
```

| Campo | Regla |
|---|---|
| `id` | Número entero o texto no vacío, único. |
| `categoria` | Texto libre no vacío. Mantén nombres y tildes consistentes. |
| `dificultad` | `Fácil`, `Media`, `Difícil` o `Muy difícil`. `Mixta` solo es un filtro de la interfaz. |
| `tipo` | `texto`, `imagen` o `texto_imagen`. |
| `pregunta` | Texto no vacío; también acompaña a una pregunta visual. |
| `imagen` | `""` o una ruta relativa dentro de `img/`. Obligatoria para `imagen` y `texto_imagen`. |
| `opciones` | Exactamente 4 objetos con `texto` e `imagen`, ambos strings. Como mínimo uno debe tener contenido. |
| `correcta` | Entero 0–3 para cognitivas: A=0, B=1, C=2, D=3. |
| `explicacion` | Texto no vacío para cognitivas. |
| `tiempo` | Número positivo en segundos, máximo 3600. Puede ser 10, 12 o 15, por ejemplo. |
| `evaluacion` | Opcional: `cognitiva` por defecto, o `personalidad`. |
| `imagen_alt` | Opcional: descripción accesible de la figura; también disponible en cada opción. Describe la imagen sin revelar la solución. |

No uses URLs externas, rutas absolutas, `../` ni HTML en los campos. El texto se muestra de forma literal. Las rutas distinguen mayúsculas y minúsculas en el alojamiento. Si falta una imagen, se muestra un aviso accesible y puedes omitir la pregunta. Los registros inválidos se excluyen con un aviso; los válidos siguen funcionando. Un JSON inexistente, vacío o mal formado presenta una explicación y un botón para reintentar.

La mezcla conserva cada opción y su índice original, calcula la nueva posición de `correcta` y mantiene ese orden durante toda la sesión y la revisión.

## Personalidad y competencias

Usa `"evaluacion": "personalidad"` y `"correcta": null`. Mantén las cuatro alternativas como una escala ordenada. Estos ítems:

- se seleccionan por separado en «Tipo de prueba»;
- solo usan entrenamiento sin límite temporal;
- no mezclan el orden de la escala;
- no se califican ni se incluyen en métricas cognitivas;
- muestran las respuestas y omisiones, sin inferir perfiles, diagnósticos o resultados laborales.

Para liderazgo, responsabilidad, adaptación o trabajo en equipo, puedes incorporar nuevas categorías con este formato. Este motor no incorpora baremos ni puntuaciones de instrumentos psicológicos.

## Excel maestro → JSON (siguiente etapa)

No se incluye aún un Excel maestro ni un conversor: esta entrega deja acordado el contrato para esa etapa.

| Columna futura de Excel | Destino en JSON |
|---|---|
| ID | `id` |
| Categoria | `categoria` |
| Dificultad | `dificultad` |
| Tipo | `tipo` |
| Pregunta | `pregunta` |
| ImagenPregunta | `imagen` |
| OpcionA / ImagenA | `opciones[0].texto` / `.imagen` |
| OpcionB / ImagenB | `opciones[1].texto` / `.imagen` |
| OpcionC / ImagenC | `opciones[2].texto` / `.imagen` |
| OpcionD / ImagenD | `opciones[3].texto` / `.imagen` |
| Correcta | `correcta` (normalizar A–D a 0–3) |
| Explicacion | `explicacion` |
| Tiempo | `tiempo` como número |
| Evaluacion (opcional) | `evaluacion` |
| ImagenAlt (opcional) | `imagen_alt` |

Para evitar ambigüedades, se recomienda escribir **A, B, C o D en Excel** y convertirlas explícitamente. Los valores numéricos del JSON ya son 0–3. Convierte celdas vacías de texto a `""`, nunca a `NaN`. Exporta en UTF-8.

Las imágenes pegadas dentro de Excel **no se convierten automáticamente en rutas**. El futuro conversor deberá extraerlas como archivos o trabajar con rutas previamente guardadas en las columnas. Después se suben tanto las imágenes como `data/preguntas.json`.

Para añadir 300, 500 o 1000+ preguntas, conserva el esquema, usa IDs únicos, reemplaza `data/preguntas.json` y añade las imágenes correspondientes. No hace falta modificar el motor.

## Historial local

Se guardan los últimos 200 resúmenes en `localStorage`, clave `psicotecnico.historial.v1`: fecha, modo, tipo, cantidades, precisión, puntaje, duración, promedio y agregados por categoría. No se envían datos a un servidor. La revisión detallada de la sesión está disponible hasta iniciar otra o recargar; no se almacena el banco completo ni las respuestas individuales en el historial.

Los datos pertenecen a ese navegador y origen. Cambiar de dispositivo, dominio o navegador no los sincroniza. Borrar datos del sitio elimina el historial. Si el almacenamiento está bloqueado, lleno o dañado, la práctica y sus resultados siguen disponibles en pantalla con un aviso.

## Verificación

Consulta `VERIFICACION.md` para el alcance de las comprobaciones y el checklist visual previo a publicar. La web no requiere las herramientas utilizadas durante esas comprobaciones.
