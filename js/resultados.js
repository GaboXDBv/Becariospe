'use strict';
window.ExamResults = (() => {
  const PUNTOS_ACIERTO = 1;
  const PENALIZACION_ERROR = 0.5;
  const STORAGE_KEY = 'psicotecnico.historial.v1';
  const MAX_HISTORY = 200;
  const modes = { entrenamiento: 'Entrenamiento', simulacro: 'Simulacro', contrarreloj: 'Contrarreloj' };
  const number = n => new Intl.NumberFormat('es-PE', { maximumFractionDigits: 1 }).format(n);
  const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const status = (q, answer) => answer === null ? 'omitida' : q.evaluacion === 'personalidad' ? 'registrada' : answer === q.correcta ? 'correcta' : 'incorrecta';
  function summarize(session, endedAt) {
    const cognitive = session.questions[0].evaluacion !== 'personalidad';
    let correct = 0, wrong = 0, omitted = 0;
    const areas = new Map();
    session.questions.forEach((q, i) => {
      if (!areas.has(q.categoria)) areas.set(q.categoria, { name: q.categoria, total: 0, correct: 0, wrong: 0, omitted: 0, answered: 0 });
      const area = areas.get(q.categoria);
      area.total++;
      const state = status(q, session.answers[i]);
      if (state === 'omitida') { omitted++; area.omitted++; }
      else { area.answered++; if (state === 'correcta') { correct++; area.correct++; } else if (state === 'incorrecta') { wrong++; area.wrong++; } }
    });
    const total = session.questions.length, answered = total - omitted;
    const elapsed = Math.max(0, (endedAt - session.started) / 1000);
    return { version: 1, date: new Date(endedAt).toISOString(), mode: session.mode, assessment: cognitive ? 'cognitiva' : 'personalidad', total, correct, wrong, omitted, answered, raw: cognitive ? correct * PUNTOS_ACIERTO : null, penalty: cognitive ? wrong * PENALIZACION_ERROR : null, score: cognitive ? correct * PUNTOS_ACIERTO - wrong * PENALIZACION_ERROR : null, accuracy: cognitive && answered ? correct / answered * 100 : null, coverage: answered / total * 100, success: cognitive ? correct / total * 100 : null, elapsed, average: elapsed / total, responseAverage: answered ? session.times.reduce((sum, t, i) => sum + (session.answers[i] === null ? 0 : t), 0) / answered / 1000 : null, areas: [...areas.values()] };
  }
  function validRecord(r) {
    return r && r.version === 1 && ['cognitiva', 'personalidad'].includes(r.assessment) && Object.hasOwn(modes, r.mode) && Number.isFinite(Date.parse(r.date)) && Number.isInteger(r.total) && r.total > 0 && ['correct', 'wrong', 'omitted', 'answered', 'elapsed', 'average'].every(k => Number.isFinite(r[k]) && r[k] >= 0) && r.answered + r.omitted === r.total && (r.accuracy === null || Number.isFinite(r.accuracy) && r.accuracy >= 0 && r.accuracy <= 100) && (r.assessment === 'personalidad' || Number.isFinite(r.score)) && Array.isArray(r.areas) && r.areas.every(a => a && typeof a.name === 'string' && ['total','correct','wrong','omitted','answered'].every(k => Number.isFinite(a[k]) && a[k] >= 0));
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { rows: [], warning: '' };
      const value = JSON.parse(raw);
      if (!Array.isArray(value)) throw new Error('Invalid history');
      const rows = value.filter(validRecord).slice(-MAX_HISTORY);
      return { rows, warning: rows.length !== value.length ? 'Algunos registros antiguos no son compatibles y se han omitido.' : '' };
    } catch { return { rows: [], warning: 'No se pudo leer el historial. El navegador puede estar bloqueando el almacenamiento o los datos pueden estar dañados.' }; }
  }
  function save(result) {
    const history = load();
    // No sobrescribir un historial ilegible: la sesión sigue disponible en pantalla.
    if (history.warning && !history.rows.length) return history.warning + ' Este resultado no se guardó.';
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...history.rows, result].slice(-MAX_HISTORY))); return history.warning; }
    catch { return 'El resultado está disponible aquí, pero no se pudo guardar en este navegador (almacenamiento bloqueado o lleno).'; }
  }
  const metric = (label, value) => `<div class="metric"><b>${escape(value)}</b><span>${escape(label)}</span></div>`;
  function areaTable(areas, cognitive = true) {
    return `<div class="table-wrap"><table><thead><tr><th>Área</th><th>Total</th>${cognitive ? '<th>Aciertos</th><th>Errores</th>' : '<th>Respondidas</th>'}<th>Omitidas</th>${cognitive ? '<th>Aciertos / total</th>' : ''}</tr></thead><tbody>${areas.map(a => `<tr><td>${escape(a.name)}</td><td>${a.total}</td>${cognitive ? `<td>${a.correct}</td><td>${a.wrong}</td>` : `<td>${a.answered}</td>`}<td>${a.omitted}</td>${cognitive ? `<td>${number(a.correct / a.total * 100)}%<div class="area-bar"><span style="width:${a.correct / a.total * 100}%"></span></div></td>` : ''}</tr>`).join('')}</tbody></table></div>`;
  }
  function render(result, container) {
    const cognitive = result.assessment === 'cognitiva';
    container.innerHTML = `<div class="result-banner"><div><p class="eyebrow">SESIÓN COMPLETADA · ${escape(modes[result.mode].toUpperCase())}</p><h1>${cognitive ? 'Un paso más en tu preparación.' : 'Tus respuestas están registradas.'}</h1><p class="subtitle">${cognitive ? 'Revisa tus errores y descubre qué puedes mejorar.' : 'Este cuestionario no asigna respuestas correctas ni diagnósticos.'}</p></div><div><div class="result-value">${cognitive ? result.accuracy === null ? '—' : number(result.accuracy) + '%' : result.answered + '/' + result.total}</div><p>${cognitive ? 'precisión' : 'respondidas'}</p></div></div>
    <div class="metrics">${metric('Total de preguntas', result.total)}${cognitive ? metric('Aciertos', result.correct) + metric('Errores', result.wrong) : metric('Respondidas', result.answered)}${metric('Omitidas', result.omitted)}${cognitive ? metric('Puntaje bruto', number(result.raw)) + metric('Penalización', '−' + number(result.penalty)) + metric('Puntaje final', number(result.score)) : ''}${metric('Tiempo total', ExamTimer.format(result.elapsed))}${metric('Promedio por pregunta', number(result.average) + ' s')}${cognitive ? metric('Aciertos / total', number(result.success) + '%') : ''}</div>
    <p class="small">${cognitive ? 'Precisión = aciertos / respondidas. Aciertos / total incluye las omisiones. El promedio divide el tiempo de toda la sesión entre todas las preguntas; en entrenamiento incluye la lectura de explicaciones.' : 'Responde según tu experiencia. No se infieren rasgos ni se mezclan estos datos con tus métricas cognitivas.'}</p>
    <section class="panel"><h2>Desempeño por área</h2>${areaTable(result.areas, cognitive)}</section><div class="result-controls"><button id="review-toggle">Revisar respuestas</button><button data-view="inicio" class="primary">Nueva sesión →</button></div><div id="review-list" hidden></div>`;
  }
  function renderHistory(container) {
    const { rows, warning } = load();
    container.innerHTML = `<div class="page-heading"><div><p class="eyebrow">TU RECORRIDO</p><h1>Historial de simulacros</h1><p class="subtitle">Sesiones de los tres modos · últimos ${MAX_HISTORY} intentos</p></div><button data-view="inicio" class="primary">Nueva sesión</button></div>${warning ? `<p class="notice">${escape(warning)}</p>` : ''}${rows.length ? `<div class="panel table-wrap"><table><thead><tr><th>Fecha</th><th>Modo / prueba</th><th>Preguntas</th><th>Aciertos</th><th>Errores</th><th>Omitidas</th><th>Precisión</th><th>Puntaje</th><th>Promedio</th></tr></thead><tbody>${rows.slice().reverse().map(r => `<tr><td>${escape(new Date(r.date).toLocaleString('es-PE'))}</td><td>${modes[r.mode]}<br><span class="small">${r.assessment === 'cognitiva' ? 'Cognitiva' : 'Personalidad'}</span></td><td>${r.total}</td><td>${r.assessment === 'cognitiva' ? r.correct : '—'}</td><td>${r.assessment === 'cognitiva' ? r.wrong : '—'}</td><td>${r.omitted}</td><td>${r.accuracy === null ? '—' : number(r.accuracy) + '%'}</td><td>${r.score === null ? '—' : number(r.score)}</td><td>${number(r.average)} s</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><h2>Tu primera sesión te espera.</h2><p>Al terminar una práctica, verás aquí el resultado.</p></div>'}`;
  }
  function renderProgress(container) {
    const history = load();
    const rows = history.rows.filter(r => r.assessment === 'cognitiva');
    const answeredRows = rows.filter(r => r.accuracy !== null);
    const areas = new Map();
    rows.forEach(r => r.areas.forEach(a => { if (!areas.has(a.name)) areas.set(a.name, {name: a.name, total: 0, correct: 0, wrong: 0, omitted: 0, answered: 0}); const dest = areas.get(a.name); ['total','correct','wrong','omitted','answered'].forEach(k => dest[k] += a[k]); }));
    const ranked = [...areas.values()].sort((a,b) => b.correct / b.total - a.correct / a.total);
    const mean = answeredRows.length ? answeredRows.reduce((s,r) => s + r.accuracy, 0) / answeredRows.length : null;
    const total = rows.reduce((s,r) => s + r.total, 0);
    container.innerHTML = `<div class="page-heading"><div><p class="eyebrow">MEJORA CON CADA INTENTO</p><h1>Mi progreso</h1><p class="subtitle">Solo aptitudes cognitivas · datos de este navegador</p></div></div>${history.warning ? `<p class="notice">${escape(history.warning)}</p>` : ''}${rows.length ? `<div class="metrics">${metric('Sesiones cognitivas', rows.length)}${metric('Simulacros realizados', rows.filter(r => r.mode === 'simulacro').length)}${metric('Precisión promedio', mean === null ? '—' : number(mean) + '%')}${metric('Mejor precisión', answeredRows.length ? number(Math.max(...answeredRows.map(r => r.accuracy))) + '%' : '—')}${metric('Tiempo promedio por pregunta', number(rows.reduce((s,r) => s + r.elapsed, 0) / total) + ' s')}</div><div class="progress-areas"><div class="panel"><p class="eyebrow">ÁREA MÁS FUERTE</p><h2>${escape(ranked[0]?.name || '—')}</h2><p class="small">${ranked.length ? number(ranked[0].correct / ranked[0].total * 100) + '% de aciertos sobre el total' : 'Sin datos'}</p></div><div class="panel"><p class="eyebrow">ÁREA A REFORZAR</p><h2>${escape(ranked.length > 1 ? ranked[ranked.length - 1].name : 'Aún falta variedad')}</h2><p class="small">${ranked.length > 1 ? number(ranked[ranked.length - 1].correct / ranked[ranked.length - 1].total * 100) + '% de aciertos sobre el total' : 'Practica otras categorías para comparar.'}</p></div></div><section class="panel" style="margin-top:24px"><h2>Últimas sesiones</h2><div class="trend">${rows.slice(-12).map((r,i) => `<div class="trend-column" title="${escape(modes[r.mode])}: ${r.accuracy === null ? 'sin respuestas' : number(r.accuracy) + '%'}"><span>${r.accuracy === null ? '—' : number(r.accuracy) + '%'}</span><i style="height:${(r.accuracy || 0) * .75}px"></i><span>${i + 1}</span></div>`).join('')}</div><p class="small">Precisión por intento; se combinan los tres modos y dificultades.</p></section><section class="panel" style="margin-top:24px"><h2>Desempeño acumulado por área</h2>${areaTable(ranked)}</section><p class="small" style="margin-top:16px">El promedio de precisión es la media de sesiones con respuestas. Las áreas se comparan por aciertos / total; los empates conservan el orden de aparición.</p>` : '<div class="empty"><h2>Aún no hay sesiones cognitivas.</h2><p>Completa una para conocer tus primeras métricas.</p></div>'}`;
  }
  return { PUNTOS_ACIERTO, PENALIZACION_ERROR, modes, number, escape, status, summarize, save, load, render, renderHistory, renderProgress };
})();
