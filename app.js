// Stato
let level = 'medie';
let questions = [];
let index = 0;
let score = 0;
let TOTAL = 0;

// Elementi
const el = (id)=>document.getElementById(id);
const $intro   = el('intro');
const $quiz    = el('quiz');
const $results = el('results');

// Selettori livello (attivi solo nella schermata intro)
document.querySelectorAll('.segment').forEach(b=>{
  b.addEventListener('click', ()=>{
    document.querySelectorAll('.segment').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    level = b.dataset.level;
  });
});

// Pulsanti globali
el('btnHome').onclick = () => showIntro();
el('btnQuit').onclick = () => showIntro();
el('btnNewGame').onclick = () => showIntro();

// Avvio partita
el('btnStart').onclick = async ()=>{
  await loadData();
  if (TOTAL === 0) { alert('Nessuna domanda in questo livello.'); return; }
  index = 0; score = 0;
  $intro.classList.add('hidden'); $results.classList.add('hidden'); $quiz.classList.remove('hidden');
  render();
};

// Carica dati
async function loadData(){
  try{
    const r = await fetch('data/questions.sample.json', { cache: 'no-store' });
    const d = await r.json();
    questions = (d[level] || []).slice();         // set del livello
    // shuffle semplice
    questions.sort(()=>Math.random() - 0.5);
    TOTAL = Math.min(20, questions.length);
  }catch(e){
    console.warn('Dataset non disponibile:', e);
    questions = []; TOTAL = 0;
  }
}

// Render domanda corrente
function render(){
  const q = questions[index];
  el('qIndex').textContent = `Domanda ${index+1}/${TOTAL}`;
  el('levelBadge').textContent = level.charAt(0).toUpperCase() + level.slice(1);
  el('progressFill').style.width = ((index+1)/TOTAL*100)+'%';

  el('category').textContent = q.cat || '';
  el('question').textContent = q.q || '';

  const box = el('options'); box.innerHTML = '';
  q.opts.forEach((o,i)=>{
    const b = document.createElement('button');
    b.textContent = o;
    b.onclick = ()=>select(i);
    box.appendChild(b);
  });

  el('explanation').classList.add('hidden');
  el('btnNext').classList.add('hidden');
}

// Selezione risposta
function select(i){
  const q = questions[index];
  const btns = document.querySelectorAll('#options button');

  btns.forEach((b,ix)=>{
    if(ix===q.ans) b.classList.add('correct');
    else if(ix===i) b.classList.add('wrong');
    b.disabled = true;
  });

  if(i===q.ans) score++;

  el('explanation').textContent = q.exp || '';
  el('explanation').classList.remove('hidden');
  el('btnNext').classList.remove('hidden');
}

// Prossima domanda
el('btnNext').onclick = ()=>{
  index++;
  if(index>=TOTAL){ return showResults(); }
  render();
};

// Schermate
function showIntro(){
  $quiz.classList.add('hidden'); $results.classList.add('hidden'); $intro.classList.remove('hidden');
}
function showResults(){
  $quiz.classList.add('hidden'); $results.classList.remove('hidden'); $intro.classList.add('hidden');
  el('percent').textContent = `Punteggio: ${score}/${TOTAL}`;
}
