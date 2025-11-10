/* ========= Costanti & Storage ========= */
const STATE_V = 'v1';
const STORAGE_LAST20 = `quizIT_last20_${STATE_V}`;
const STORAGE_BEST   = `quizIT_best_${STATE_V}`;
const STORAGE_SETTINGS = `quizIT_settings_${STATE_V}`;

/* ========= Stato ========= */
let settings = loadSettings();
let dataset = { version: 1, medie:[], licei:[], universita:[] };
let level = 'medie';
let pool = [];           // tutte le domande (livello)
let game = [];           // domande della partita
let idx = 0;
let score = 0;
let best = parseInt(localStorage.getItem(STORAGE_BEST) || '0', 10);
let lifelineUsed = false;
let hiddenOptions = [];
let timer = null;
let timeLeft = 30;

/* ========= Elementi ========= */
const $ = (id)=>document.getElementById(id);
const els = {
  intro: $('intro'), quiz: $('quiz'), results: $('results'),
  qIndex: $('qIndex'), levelBadge: $('levelBadge'), progressFill: $('progressFill'),
  category: $('category'), question: $('question'), options: $('options'),
  explanation: $('explanation'), timer: $('timer'),
  btnStart: $('btnStart'), btnNext: $('btnNext'), btnQuit: $('btnQuit'),
  btnNew: $('btnNewGame'), btnShare: $('btnShare'), btn5050: $('btn5050'),
  btnSettings: $('btnSettings'), sheet: $('settingsSheet'),
  toggleTimer: $('toggleTimer'), toggleHaptics: $('toggleHaptics'), btnCloseSettings: $('btnCloseSettings'),
  bestLabel: $('bestLabel')
};

/* ========= Init ========= */
document.querySelectorAll('.segment').forEach(b=>{
  b.addEventListener('click', ()=>{
    document.querySelectorAll('.segment').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    level = b.dataset.level;
  });
});

els.btnStart.addEventListener('click', start);
els.btnNext.addEventListener('click', next);
els.btnQuit.addEventListener('click', showIntro);
els.btnNew.addEventListener('click', showIntro);
els.btnShare.addEventListener('click', shareScore);

els.btnSettings.addEventListener('click', ()=>els.sheet.classList.remove('hidden'));
els.btnCloseSettings.addEventListener('click', ()=>els.sheet.classList.add('hidden'));
els.sheet.addEventListener('click', (e)=>{ if(e.target===els.sheet) els.sheet.classList.add('hidden'); });

els.toggleTimer.checked = settings.timer;
els.toggleHaptics.checked = settings.haptics;
els.toggleTimer.addEventListener('change', ()=>{ settings.timer = els.toggleTimer.checked; saveSettings(); });
els.toggleHaptics.addEventListener('change', ()=>{ settings.haptics = els.toggleHaptics.checked; saveSettings(); });

els.bestLabel.textContent = `${best}/20`;

async function start(){
  await loadData();
  const last = loadLast20();
  const filtered = pool.filter(q => !last.includes(q.id));
  const TOTAL = Math.min(20, (filtered.length || pool.length));
  const source = (filtered.length >= TOTAL) ? filtered : pool;

  game = shuffle(source).slice(0, TOTAL);
  idx = 0; score = 0; lifelineUsed = false; hiddenOptions = [];
  show(els.quiz); hide(els.results); hide(els.intro);
  render();
}

/* ========= Data ========= */
async function loadData(){
  try{
    const r = await fetch('data/questions.sample.json', { cache: 'no-store' });
    dataset = await r.json();
    pool = (dataset[level] || []).slice();
  }catch(e){
    console.warn('Impossibile caricare il dataset:', e);
    dataset = { version: 1, medie:[], licei:[], universita:[] };
    pool = [];
  }
}

/* ========= Render ========= */
function render(){
  if (idx >= game.length) return showResults();
  const q = game[idx];
  const TOTAL = game.length;
  els.qIndex.textContent = `Domanda ${idx+1}/${TOTAL}`;
  els.levelBadge.textContent = titleCase(level);
  els.progressFill.style.width = `${((idx+1)/TOTAL)*100}%`;
  els.category.textContent = q.cat || '';
  els.question.textContent = q.q || '';

  // opzioni
  els.options.innerHTML = '';
  q.opts.forEach((o,i)=>{
    if (hiddenOptions.includes(i)) return;
    const b=document.createElement('button');
    b.className='opt';
    b.textContent=o;
    b.onclick=()=>select(i);
    b.onkeydown=(ev)=>{ if(ev.key==='Enter' || ev.key===' '){ ev.preventDefault(); select(i); } };
    b.setAttribute('role','button');
    b.setAttribute('aria-pressed','false');
    els.options.appendChild(b);
  });

  els.explanation.classList.add('hidden');
  els.btnNext.classList.add('hidden');

  // timer
  setupTimer();
}

/* ========= Timer ========= */
function setupTimer(){
  clearInterval(timer);
  if(!settings.timer){ els.timer.classList.add('hidden'); return; }
  timeLeft = 30;
  els.timer.textContent = '30″';
  els.timer.classList.remove('hidden');
  timer = setInterval(()=>{
    timeLeft--;
    els.timer.textContent = `${timeLeft}″`;
    if(timeLeft<=0){
      clearInterval(timer);
      vibrate(true);
      revealOnlyCorrect();
      showExplanation(game[idx].exp);
    }
  }, 1000);
}

/* ========= Selezione ========= */
function select(i){
  clearInterval(timer);
  const q = game[idx];
  const btns = els.options.querySelectorAll('button');
  btns.forEach((b,ix)=>{
    if(ix===q.ans) b.classList.add('correct');
    else if(ix===i) b.classList.add('wrong');
    b.disabled = true;
  });
  if(i===q.ans){ score++; vibrate(false); } else { vibrate(true); }
  showExplanation(q.exp);
}
function revealOnlyCorrect(){
  const q = game[idx];
  const btns = els.options.querySelectorAll('button');
  btns.forEach((b,ix)=>{ if(ix===q.ans) b.classList.add('correct'); b.disabled = true; });
}
function showExplanation(text){
  els.explanation.textContent = text || '';
  els.explanation.classList.remove('hidden');
  els.btnNext.classList.remove('hidden');
}

/* ========= 50:50 ========= */
els.btn5050.addEventListener('click', ()=>{
  if(lifelineUsed) return;
  lifelineUsed = true;
  const q = game[idx];
  const wrong = [0,1,2].filter(i=>i!==q.ans);
  hiddenOptions = shuffle(wrong).slice(0,2);
  render();
});

/* ========= Avanzamento ========= */
function next(){
  idx++; hiddenOptions=[]; clearInterval(timer);
  if(idx>=game.length){ showResults(); return; }
  render();
}

/* ========= Risultati ========= */
function showResults(){
  saveLast20(game.map(q=>q.id).slice(-20));
  const TOTAL = game.length;
  const pct = Math.round((score/TOTAL)*100);
  $('percent').textContent = `${pct}%`;
  $('rightCount').textContent = `${score}`;
  $('wrongCount').textContent = `${TOTAL-score}`;
  if(score>best){ best=score; localStorage.setItem(STORAGE_BEST, String(best)); }
  $('bestScore').textContent = `${best}/${TOTAL}`;
  hide(els.quiz); show(els.results); hide(els.intro);
}

/* ========= Share ========= */
function shareScore(){
  const TOTAL = game.length || 20;
  const msg = `Quiz Italiano — ${Math.round((score/TOTAL)*100)}% (${score}/${TOTAL}) — Livello ${titleCase(level)}`;
  if(navigator.share) navigator.share({title:'Risultato Quiz', text:msg});
  else { navigator.clipboard.writeText(msg); alert('Punteggio copiato!'); }
}

/* ========= Utils ========= */
function show(el){ el.classList.remove('hidden'); el.setAttribute('aria-hidden','false'); }
function hide(el){ el.classList.add('hidden'); el.setAttribute('aria-hidden','true'); }
function shuffle(a){ return a.sort(()=>Math.random()-.5); }
function titleCase(s){ return s.charAt(0).toUpperCase() + s.slice(1); }

function vibrate(fail){
  try{
    if(!settings.haptics) return;
    if(navigator.vibrate) navigator.vibrate(fail ? [25,60,25] : 20);
  }catch(e){}
}

function loadSettings(){
  try{ const s = JSON.parse(localStorage.getItem(STORAGE_SETTINGS)||'{}');
    return { timer: s.timer ?? true, haptics: s.haptics ?? true };
  }catch{ return { timer:true, haptics:true }; }
}
function saveSettings(){ localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings)); }
function loadLast20(){ try{ return JSON.parse(localStorage.getItem(STORAGE_LAST20)||'[]'); }catch{return [];} }
function saveLast20(ids){ localStorage.setItem(STORAGE_LAST20, JSON.stringify(ids||[])); }
