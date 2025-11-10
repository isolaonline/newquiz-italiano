/* eslint-disable no-console */
const STORAGE_KEY = 'QUIZ_IT_v1';
const CACHE_NAME = STORAGE_KEY;
const TOTAL_PER_GAME = 20;

let questions = [];
let level = 'medie';
let pool = [];          // domande non ancora usate globalmente
let game = [];          // domande della partita corrente
let index = 0;
let score = 0;
let streak = 0;
let timer = null;
let timerEnabled = true;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

/* ---------- UTILS ---------- */
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function vibrate(){if(navigator.vibrate)navigator.vibrate(40)}
function saveLastPlayed(ids){localStorage.setItem(`${STORAGE_KEY}_last`, JSON.stringify(ids))}
function loadLastPlayed(){try{return JSON.parse(localStorage.getItem(`${STORAGE_KEY}_last}`)||'[]')}catch{return[]}}

/* ---------- ROUTING ---------- */
function render(view){$('#mainContent').innerHTML=view}
function goHome(){render(''); $('#startBtn').style.display='block'}

/* ---------- FETCH DATA ---------- */
async function loadQuestions(){
  const last = loadLastPlayed();
  const req = await fetch('data/questions.json').catch(()=>fetch('data/questions.sample.json'));
  const data = await req.json();
  if(data.version){ /* busta cache se cambia version */ }
  questions = shuffle(data[level]).filter(q=>!last.includes(q.id));
  pool = [...questions];
}

/* ---------- START GAME ---------- */
async function startGame(){
  $('#startBtn').disabled=true;
  await loadQuestions();
  if(pool.length<TOTAL_PER_GAME){ /* reset controllato */ pool=shuffle([...questions]); }
  game = pool.splice(0,TOTAL_PER_GAME);
  index=0; score=0; streak=0;
  saveLastPlayed(game.map(q=>q.id));
  renderQuestion();
}
function renderQuestion(){
  const q = game[index];
  render(`
    ${timerEnabled?'<div class="timer-bar"></div>':''}
    <div class="card">
      <p style="margin-bottom:.6rem;color:var(--subtle)">${q.category}</p>
      <h2 class="question">${q.text}</h2>
      <div class="options">${q.options.map((o,i)=>`
        <button class="option-btn" data-i="${i}">${o}</button>`).join('')}</div>
      <div id="explain"></div>
    </div>
    <div style="margin-top:auto;padding-top:1rem">
      <p>Domanda ${index+1} di ${TOTAL_PER_GAME} • Punti: ${score} • Racha: ${streak}</p>
    </div>
  `);
  if(timerEnabled){timer=setTimeout(()=>handleAnswer(-1),30000)}
  $$('.option-btn').forEach(b=>b.addEventListener('click',e=>handleAnswer(+e.target.dataset.i)));
}
function handleAnswer(selected){
  clearTimeout(timer);
  const q=game[index];
  const correct=q.answer;
  const buttons=$$('.option-btn');
  buttons[correct].classList.add('correct');
  if(selected!==correct && selected!==-1){buttons[selected].classList.add('wrong');vibrate()}
  else if(selected===correct){score+=1+Math.min(streak,5);streak+=1}
  else{streak=0} // timeout
  $('#explain').innerHTML=`<div class="explain">${q.explain}</div>`;
  buttons.forEach(b=>b.disabled=true);
  setTimeout(nextQuestion,1800);
}
function nextQuestion(){
  index++;
  if(index>=TOTAL_PER_GAME)return endGame();
  renderQuestion();
}
function endGame(){
  const pct=Math.round((score/TOTAL_PER_GAME)*100);
  render(`
    <div class="card" style="text-align:center">
      <h2>Partita terminata</h2>
      <p style="font-size:3rem;font-weight:700;margin:.6rem 0">${pct}%</p>
      <p>${pct>=80?'Ottimo!':pct>=60?'Buono':'Ripassa un po\''}</p>
      <button class="btn-primary" onclick="shareScore(${score},${pct})">Condividi</button>
      <button class="btn-primary" style="margin-top:.8rem;background:var(--subtle)" onclick="goHome()">Rigioca</button>
    </div>
  `);
}

/* ---------- SHARE ---------- */
window.shareScore=(s,p)=>{
  const text=`Ho fatto ${p}% (${s}/${TOTAL_PER_GAME}) al Quiz Italiano!`;
  if(navigator.share)navigator.share({title:'Quiz Italiano',text});
  else{navigator.clipboard.writeText(text);alert('Punteggio copiato!')}
}

/* ---------- LEVEL SELECTOR ---------- */
$('#levelSelector').addEventListener('click',e=>{
  if(e.target.tagName!=='BUTTON')return;
  $$('.segmented button').forEach(b=>b.classList.remove('active'));
  e.target.classList.add('active');
  level=e.target.dataset.level;
});

/* ---------- START ---------- */
$('#startBtn').addEventListener('click',startGame);

/* ---------- PWA INSTALL PROMPT (Chrome) ---------- */
let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{deferredPrompt=e});
