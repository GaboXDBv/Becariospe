'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const letters = ['A','B','C','D'];
  const R = window.ExamResults;
  let bank = [], session = null, lastSession = null, loadWarning = '';
  const clock = new ExamTimer.Clock(tick);
  const modesHelp = {
    entrenamiento: 'Lee la explicación y reconoce el patrón antes de avanzar a la siguiente pregunta.',
    simulacro: 'Administra tu tiempo, marca las dudas y revisa tus respuestas antes de finalizar.',
    contrarreloj: 'Responde antes de que termine el contador. Al responder o agotarse el tiempo, avanzarás automáticamente.'
  };
  function notice(message) { $('notice').textContent = message; $('notice').hidden = !message; }
  function shuffle(array, random = Math.random) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
    return copy;
  }
  function safeImage(path) {
    if (typeof path !== 'string' || !path.trim()) return '';
    const clean = path.trim().replace(/^\.\//, '');
    if (!clean.startsWith('img/') || clean.split('/').some(p => p === '..') || /[\\?#%:\x00-\x1f]/.test(clean) || !/\.(png|jpg|jpeg|svg|webp|gif)$/i.test(clean)) return null;
    return './' + clean;
  }
  function validate(data) {
    if (!Array.isArray(data)) throw new Error('El JSON debe contener una lista de preguntas.');
    const valid = [], errors = [], seen = new Set();
    data.forEach((q, i) => {
      const reasons = [];
      if (!q || typeof q !== 'object' || Array.isArray(q)) { errors.push(`Fila ${i+1}: no es un objeto.`); return; }
      const id = String(q.id ?? '').trim();
      const personality = q.evaluacion === 'personalidad';
      if (!id || seen.has(id) || !(typeof q.id === 'string' || Number.isSafeInteger(q.id))) reasons.push('ID ausente, no válido o repetido');
      if (typeof q.categoria !== 'string' || !q.categoria.trim()) reasons.push('categoría vacía');
      if (!['Fácil','Media','Difícil','Muy difícil'].includes(q.dificultad)) reasons.push('dificultad no válida');
      if (!['texto','imagen','texto_imagen'].includes(q.tipo)) reasons.push('tipo no válido');
      if (q.evaluacion !== undefined && !['cognitiva','personalidad'].includes(q.evaluacion)) reasons.push('evaluación no válida');
      if (typeof q.pregunta !== 'string' || !q.pregunta.trim()) reasons.push('enunciado vacío');
      if (typeof q.imagen !== 'string' || safeImage(q.imagen) === null) reasons.push('ruta de imagen no válida');
      if (q.tipo !== 'texto' && (typeof q.imagen !== 'string' || !q.imagen.trim())) reasons.push('falta imagen de la pregunta');
      if (!Array.isArray(q.opciones) || q.opciones.length !== 4 || q.opciones.some(o => !o || typeof o.texto !== 'string' || typeof o.imagen !== 'string' || (!o.texto.trim() && !o.imagen.trim()) || safeImage(o.imagen) === null)) reasons.push('se requieren cuatro alternativas completas');
      if (!personality && (!Number.isInteger(q.correcta) || q.correcta < 0 || q.correcta > 3)) reasons.push('correcta debe ser un entero de 0 a 3');
      if (!personality && (typeof q.explicacion !== 'string' || !q.explicacion.trim())) reasons.push('explicación vacía');
      if (q.explicacion !== undefined && typeof q.explicacion !== 'string') reasons.push('explicación no válida');
      if (typeof q.tiempo !== 'number' || !Number.isFinite(q.tiempo) || q.tiempo <= 0 || q.tiempo > 3600) reasons.push('tiempo debe estar entre 0 y 3600 segundos');
      if (reasons.length) { errors.push(`Pregunta ${id || i+1}: ${reasons.join('; ')}.`); return; }
      seen.add(id);
      valid.push({...q, categoria:q.categoria.trim(), evaluacion:personality?'personalidad':'cognitiva', correcta:personality?null:q.correcta});
    });
    return { valid, errors };
  }
  // Reparto por turnos entre categorías: agota grupos pequeños y redistribuye lo restante.
  function balanced(pool, count) {
    const groups = new Map();
    shuffle(pool).forEach(q => { if (!groups.has(q.categoria)) groups.set(q.categoria, []); groups.get(q.categoria).push(q); });
    let queues = shuffle([...groups.values()]);
    const picked = [];
    while (picked.length < count && queues.length) {
      for (const queue of queues) { if (picked.length >= count) break; if (queue.length) picked.push(queue.pop()); }
      queues = queues.filter(queue => queue.length);
    }
    return shuffle(picked);
  }
  function prepare(q, mix) {
    const indices = mix && q.evaluacion !== 'personalidad' ? shuffle([0,1,2,3]) : [0,1,2,3];
    return {...q, opciones:indices.map(i => ({...q.opciones[i], original:i})), correcta:q.evaluacion === 'personalidad' ? null : indices.indexOf(q.correcta)};
  }
  async function loadBank() {
    $('start').disabled = true; $('retry').hidden = true;
    $('availability').textContent = 'Cargando banco de preguntas…'; notice('');
    try {
      const response = await fetch('./data/preguntas.json', { cache:'no-store' });
      if (!response.ok) throw new Error(`No se encontró el banco de preguntas (HTTP ${response.status}).`);
      const data = await response.json();
      const {valid, errors} = validate(data);
      bank = valid;
      if (!bank.length) throw new Error(data.length ? 'No hay preguntas válidas. ' + errors.slice(0,3).join(' ') : 'El banco de preguntas está vacío.');
      loadWarning = errors.length ? `${errors.length} preguntas no válidas se excluyeron. ${errors.slice(0,3).join(' ')}` : '';
      $('bank-count').textContent = bank.length; notice(loadWarning); updateConfig();
    } catch(error) {
      bank = []; $('bank-count').textContent = '0'; $('start').disabled = true; $('retry').hidden = false;
      const local = location.protocol === 'file:';
      $('availability').textContent = 'No se pudo cargar el banco.';
      notice(local ? 'Para cargar las preguntas, abre la web desde GitHub Pages o un servidor HTTP local. El doble clic sobre index.html bloquea fetch en muchos navegadores. Consulta README.md.' : error instanceof SyntaxError ? 'El archivo preguntas.json no contiene JSON válido. Revisa las comas y comillas.' : error.message || 'No se pudo cargar el banco. Revisa la conexión y reintenta.');
    }
  }
  function selectedMode() { return document.querySelector('input[name="modo"]:checked').value; }
  function filtered() { return bank.filter(q => q.evaluacion === $('assessment').value && ($('difficulty').value === 'Mixta' || q.dificultad === $('difficulty').value)); }
  function updateConfig() {
    const personality = $('assessment').value === 'personalidad';
    if (personality) document.querySelector('input[value="entrenamiento"]').checked = true;
    document.querySelectorAll('input[name="modo"]').forEach(input => { input.disabled = personality && input.value !== 'entrenamiento'; });
    $('shuffle-options').disabled = personality;
    const mode = selectedMode();
    $('global-field').hidden = mode !== 'simulacro';
    $('minutes').disabled = mode !== 'simulacro';
    $('mode-help').textContent = personality ? 'Responde sin presión de tiempo. Las escalas conservan su orden y no reciben una calificación de acierto o error.' : modesHelp[mode];
    document.querySelector('.scoring').hidden = personality;
    $('personality-help').textContent = personality ? 'Cuestionario de práctica. No constituye un diagnóstico ni una medición psicológica validada.' : `Puntuación: +${R.number(R.PUNTOS_ACIERTO)} por acierto, −${R.number(R.PENALIZACION_ERROR)} por error. Práctica independiente, sin vínculo oficial con empresas.`;
    const available = filtered().length, requested = Number($('quantity').value), actual = Math.min(requested, available);
    $('availability').textContent = available ? `${actual} preguntas en esta sesión · ${available} disponibles con estos filtros.${requested > available ? ` Solicitaste ${requested}; se usarán ${actual} sin repetir.` : ''}` : 'No hay preguntas con estos filtros. Cambia la dificultad o el tipo de prueba.';
    $('start').disabled = !available;
    $('start').textContent = personality ? 'Comenzar cuestionario →' : `Comenzar ${mode} →`;
  }
  function view(name, focus = true) {
    document.querySelectorAll('.view').forEach(el => el.hidden = el.id !== name);
    document.querySelectorAll('nav .nav').forEach(el => el.classList.toggle('active', el.dataset.view === name));
    if (focus) { $('main').focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); }
  }
  function start(event) {
    event?.preventDefault(); if (session?.active || !bank.length) return;
    const pool = filtered(); if (!pool.length) return;
    const mode = selectedMode(), minutes = Number($('minutes').value);
    if (mode === 'simulacro' && (!Number.isInteger(minutes) || minutes < 1 || minutes > 180)) { notice('El tiempo global debe ser de 1 a 180 minutos.'); return; }
    const questions = balanced(pool, Math.min(Number($('quantity').value), pool.length)).map(q => prepare(q, $('shuffle-options').checked));
    const now = Date.now();
    session = {active:true, mode, questions, answers:questions.map(() => null), flags:questions.map(() => false), times:questions.map(() => 0), completed:questions.map(() => false), index:0, started:now, entered:now, globalDeadline:mode === 'simulacro' ? now + minutes*60000 : null, deadline:mode === 'contrarreloj' ? now + questions[0].tiempo*1000 : null};
    notice(''); view('examen'); renderQuestion(); clock.start();
  }
  function account(until = Date.now()) {
    if (!session?.active) return;
    let time = until;
    if (session.globalDeadline !== null) time = Math.min(time, session.globalDeadline);
    if (session.deadline !== null) time = Math.min(time, session.deadline);
    session.times[session.index] += Math.max(0, time - session.entered);
    session.entered = time;
  }
  function image(parent, path, alt, className = 'question-image') {
    if (!path) return;
    const src = safeImage(path); if (!src) return;
    const img = document.createElement('img'); img.src = src; img.alt = alt; img.className = className;
    img.addEventListener('error', () => { const label = document.createElement('span'); label.className='image-error'; label.textContent=`Imagen no disponible: ${alt}. Puedes omitir esta pregunta.`; img.replaceWith(label); }, {once:true});
    parent.append(img);
  }
  function renderQuestion() {
    if (!session?.active) return;
    const s = session, q = s.questions[s.index], answer = s.answers[s.index];
    $('exam-mode').textContent = R.modes[s.mode];
    $('question-number').textContent = `Pregunta ${s.index+1} de ${s.questions.length}`;
    $('question-number').focus({preventScroll:true});
    $('category').textContent=q.categoria; $('level').textContent=q.dificultad;
    $('recommended').textContent=q.evaluacion === 'personalidad' ? 'Sin límite de tiempo' : `Recomendado: ${q.tiempo} s`;
    $('question-text').textContent=q.pregunta; $('question-image').replaceChildren();
    image($('question-image'),q.imagen,q.imagen_alt || 'Figura del enunciado');
    $('options').replaceChildren();
    q.opciones.forEach((opt,i) => {
      const button=document.createElement('button'); button.type='button'; button.className='option';
      button.dataset.option=String(i); button.setAttribute('aria-pressed',String(answer===i));
      const key=document.createElement('span'); key.className='option-key'; key.textContent=letters[i];
      const body=document.createElement('span'); body.className='option-body';
      if (opt.texto) { const text=document.createElement('span'); text.textContent=opt.texto; body.append(text); }
      image(body,opt.imagen,opt.imagen_alt || `Figura de la alternativa ${letters[i]}`,'option-image');
      button.append(key,body); button.classList.toggle('selected',answer===i);
      if (s.mode==='entrenamiento' && answer!==null) {
        button.disabled=true;
        if(q.evaluacion!=='personalidad') {button.classList.toggle('correct',i===q.correcta);button.classList.toggle('incorrect',answer===i && i!==q.correcta);}
      }
      button.addEventListener('click',()=>choose(i)); $('options').append(button);
    });
    $('feedback').hidden=true;
    if(s.mode==='entrenamiento' && answer!==null) {
      const state=R.status(q,answer), title=q.evaluacion==='personalidad'?'Respuesta registrada':state==='correcta'?'Correcto.':'Esta vez no. La respuesta es '+letters[q.correcta]+'.';
      $('feedback').className='feedback '+(state==='correcta'?'correct':state==='incorrecta'?'incorrect':'');
      const strong=document.createElement('strong');strong.textContent=title;
      const p=document.createElement('p');p.textContent=q.explicacion || 'No hay respuestas correctas o incorrectas.';
      $('feedback').replaceChildren(strong,p);$('feedback').hidden=false;
    }
    $('previous').hidden=s.mode!=='simulacro';$('previous').disabled=s.index===0;
    $('flag').hidden=s.mode!=='simulacro';$('flag').setAttribute('aria-pressed',String(s.flags[s.index]));
    $('flag').textContent=s.flags[s.index]?'⚑ Marcada para revisar':'⚑ Revisar después';
    $('next').textContent=s.index===s.questions.length-1?'Finalizar →':s.mode==='contrarreloj'?'Omitir →':'Siguiente →';
    const answered=s.answers.filter(a=>a!==null).length, complete=s.mode==='simulacro'?answered:s.completed.filter(Boolean).length;
    $('answered-count').textContent=`${answered} respondidas · ${s.questions.length-answered} sin responder`;
    const percent=Math.round(complete/s.questions.length*100);$('progress').value=percent;$('progress-text').textContent=`${percent}% completado`;
    $('question-map').replaceChildren();
    s.questions.forEach((_,i)=>{const b=document.createElement('button');b.type='button';b.textContent=String(i+1)+(s.flags[i]?' ⚑':'');b.className=[s.answers[i]!==null?'answered':'',i===s.index?'current':'',s.flags[i]?'flagged':''].join(' ');b.disabled=s.mode!=='simulacro';b.setAttribute('aria-label',`Pregunta ${i+1}${s.answers[i]!==null?', respondida':', sin responder'}${s.flags[i]?', marcada':''}`);if(i===s.index)b.setAttribute('aria-current','step');b.addEventListener('click',()=>go(i));$('question-map').append(b);});
  }
  function tick(now = Date.now()) {
    if (!session?.active) return;
    if (session.mode==='simulacro' && now>=session.globalDeadline) { finish('Se agotó el tiempo global.',session.globalDeadline);return; }
    // Recupera también los vencimientos si el navegador suspendió la pestaña.
    if (session.mode==='contrarreloj') {
      let changed=false;
      while(session.active && now>=session.deadline) {
        const boundary=session.deadline;account(boundary);session.completed[session.index]=true;session.answers[session.index]=null;
        if(session.index===session.questions.length-1) {finish('Se agotó el tiempo de la última pregunta.',boundary);return;}
        session.index++;session.entered=boundary;session.deadline=boundary+session.questions[session.index].tiempo*1000;changed=true;
      }
      if(changed)renderQuestion();
    }
    if(!session.active)return;
    let seconds=(now-session.started)/1000,label='Tiempo transcurrido';
    if(session.mode==='simulacro'){seconds=(session.globalDeadline-now)/1000;label='Tiempo global restante';}
    if(session.mode==='contrarreloj'){seconds=(session.deadline-now)/1000;label='Tiempo de esta pregunta';}
    $('timer-label').textContent=label;$('timer').textContent=ExamTimer.format(seconds);
    document.querySelector('.clock').classList.toggle('urgent',session.mode!=='entrenamiento' && seconds<=5);
  }
  function guard() { if(!session?.active)return false;const before=session.index;tick();return session.active && before===session.index; }
  function choose(i) {
    if(!guard() || !Number.isInteger(i) || i<0 || i>3)return;
    if(session.mode==='entrenamiento' && session.answers[session.index]!==null)return;
    const now=Date.now();account(now);session.answers[session.index]=i;session.completed[session.index]=true;
    if(session.mode==='contrarreloj'){advance(now);return;}
    renderQuestion();
  }
  function advance(now = Date.now()) {
    account(now);session.completed[session.index]=true;
    if(session.index===session.questions.length-1){finish('',now);return;}
    session.index++;session.entered=now;
    if(session.mode==='contrarreloj')session.deadline=now+session.questions[session.index].tiempo*1000;
    renderQuestion();tick(now);
  }
  function go(index) {
    if(!guard() || session.mode!=='simulacro' || index<0 || index>=session.questions.length)return;
    account();session.index=index;session.entered=Date.now();renderQuestion();
  }
  function next() {
    if(!guard())return;
    if(session.mode==='contrarreloj'){advance();return;}
    if(session.index===session.questions.length-1){confirmFinish();return;}
    if(session.mode==='simulacro')go(session.index+1);else advance();
  }
  function confirmFinish() {
    if(!guard())return;
    const s=session, answered=s.answers.filter(a=>a!==null).length, flagged=s.flags.filter(Boolean).length;
    $('confirmation-stats').innerHTML=`<span><b>${answered}</b>Respondidas</span><span><b>${s.questions.length-answered}</b>Sin responder</span><span><b>${flagged}</b>Marcadas para revisar</span>`;
    $('flagged-list').replaceChildren();
    if(flagged){const p=document.createElement('p');p.textContent='Volver a una pregunta marcada:';const links=document.createElement('div');links.className='flagged-links';s.flags.forEach((flag,i)=>{if(!flag)return;const b=document.createElement('button');b.textContent=`Pregunta ${i+1}`;b.onclick=()=>{$('finish-dialog').close();go(i);};links.append(b);});$('flagged-list').append(p,links);}
    if(!$('finish-dialog').open)$('finish-dialog').showModal();
  }
  function finish(message='',endedAt=Date.now()) {
    if(!session?.active)return;
    account(endedAt);session.active=false;clock.stop();if($('finish-dialog').open)$('finish-dialog').close();
    lastSession=session;const result=R.summarize(session,endedAt);const warning=R.save(result);
    R.render(result,$('resultados'));$('review-toggle').addEventListener('click',()=>{const list=$('review-list');if(list.hidden && !list.children.length)renderReview(list,lastSession);list.hidden=!list.hidden;$('review-toggle').textContent=list.hidden?'Revisar respuestas':'Ocultar revisión';$('review-toggle').setAttribute('aria-expanded',String(!list.hidden));});
    notice([message,warning].filter(Boolean).join(' '));view('resultados');
  }
  function renderReview(parent,s) {
    const heading=document.createElement('h2');heading.textContent='Revisión de respuestas';parent.append(heading);
    s.questions.forEach((q,i)=>{
      const answer=s.answers[i],state=R.status(q,answer),card=document.createElement('article');card.className='review-card '+(state==='correcta'?'correct':state==='incorrecta'?'incorrect':'');
      const meta=document.createElement('p');meta.className='small';meta.textContent=`${i+1} · ${q.categoria} · ${state} · Tiempo dedicado: ${R.number(s.times[i]/1000)} s`;
      const h=document.createElement('h3');h.textContent=q.pregunta;card.append(meta,h);image(card,q.imagen,q.imagen_alt || 'Figura del enunciado');
      const opts=document.createElement('div');opts.className='review-options';
      q.opciones.forEach((o,j)=>{const d=document.createElement('div');d.className='review-choice'+(answer===j?' selected':'')+(q.evaluacion!=='personalidad' && j===q.correcta?' correct':'');const p=document.createElement('span');p.textContent=`${letters[j]}) ${o.texto}${answer===j?' · Tu respuesta':''}${q.evaluacion!=='personalidad' && j===q.correcta?' · Correcta':''}`;d.append(p);image(d,o.imagen,o.imagen_alt || `Figura de la alternativa ${letters[j]}`,'option-image');opts.append(d);});card.append(opts);
      const exp=document.createElement('p');exp.className='review-explanation';exp.textContent=q.explicacion || 'Sin calificación de acierto o error.';card.append(exp);parent.append(card);
    });
  }
  document.addEventListener('click',e=>{const target=e.target.closest('[data-view],.brand');if(!target)return;e.preventDefault();if(session?.active){notice('Finaliza la sesión actual antes de cambiar de pantalla.');return;}const name=target.dataset.view || 'inicio';notice(name==='inicio'?loadWarning:'');if(name==='historial')R.renderHistory($('historial'));if(name==='progreso')R.renderProgress($('progreso'));view(name);});
  $('config-form').addEventListener('submit',start);$('config-form').addEventListener('change',updateConfig);$('retry').onclick=loadBank;
  $('next').onclick=next;$('previous').onclick=()=>go(session.index-1);
  $('flag').onclick=()=>{if(!guard())return;session.flags[session.index]=!session.flags[session.index];renderQuestion();};
  $('finish').onclick=confirmFinish;$('back-to-exam').onclick=()=>$('finish-dialog').close();
  $('confirm-finish').onclick=()=>{if(!session?.active)return;tick();if(session.active)finish();};
  document.addEventListener('keydown',e=>{if(!session?.active || $('finish-dialog').open || e.repeat || e.ctrlKey || e.metaKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName))return;const key=e.key.toLowerCase();let choice=letters.map(x=>x.toLowerCase()).indexOf(key);if(choice<0 && /^[1-4]$/.test(key))choice=Number(key)-1;if(choice>=0){e.preventDefault();choose(choice);}else if(key==='enter' && e.target.tagName!=='BUTTON'){e.preventDefault();next();}});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
  window.addEventListener('beforeunload',e=>{if(session?.active){e.preventDefault();e.returnValue='';}});
  // Herramienta opcional de lectura: no modifica ni responde la evaluación.
  if(document.modelContext?.registerTool) {
    try { Promise.resolve(document.modelContext.registerTool({name:'read_practice_status',description:'Consultar el estado visible de la sesión y las preguntas disponibles, sin revelar respuestas correctas.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(input){if(!input || Object.keys(input).length)throw new Error('No se admiten parámetros.');return {available:bank.length,active:!!session?.active,mode:session?.active?session.mode:null,question:session?.active?session.index+1:null,total:session?.active?session.questions.length:null};}})).catch(()=>{}); } catch {}
  }
  // Funciones puras para validar el motor sin alterar la sesión.
  window.PsychometricEngine=Object.freeze({validate,balanced,prepare,shuffle,safeImage});
  loadBank();
})();
