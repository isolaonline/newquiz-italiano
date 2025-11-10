// app.js - vanilla ES6 modules
const STATE = {
  level: 'medie',
  questions: [],
  usedIds: [],
  current: 0,
  score: 0,
  streak: 0,
  timerEnabled: true,
  timerInterval: null,
  timeLeft: 30
};

const DOM = {
  home: document.getElementById('home'),
  settings: document.getElementById('settings'),
  quiz: document.getElementById('quiz'),
  result: document.getElementById('result'),
  offline: document.getElementById('offline'),
  levelBtns: document.querySelectorAll('[data-level]'),
  startBtn: document.getElementById('start-btn'),
  timerToggle: document.getElementById('timer-toggle'),
  questionEl: document.getElementById('question'),
  optionsEl: document.getElementById('options'),
  feedbackEl: document.getElementById('feedback'),
  currentEl: document.getElementById('current'),
  totalEl: document.getElementById('total'),
  timerEl: document.getElementById('timer'),
  scoreEl: document.getElementById('score'),
  evaluationEl: document.getElementById('evaluation'),
  streakEl: document.getElementById('streak').querySelector('span'),
  recordEl: document.getElementById('record').querySelector('span')
};

// Init
document.addEventListener('DOMContentLoaded', init);

async function init() {
  loadSettings();
  setupEventListeners();
  await loadQuestions();
  if (!STATE.questions.length) showScreen('offline');
}

function setupEventListeners() {
  DOM.levelBtns.forEach(b => b.addEventListener('click', e => {
    DOM.levelBtns.forEach(x => x.classList.remove('active'));
    e.target.classList.add('active');
    STATE.level = e.target.dataset.level;
  }));

  DOM.startBtn.addEventListener('click', startQuiz);
  document.getElementById('settings-btn').addEventListener('click', () => showScreen('settings'));
  document.getElementById('back-home').addEventListener('click', () => showScreen('home'));
  DOM.timerToggle.addEventListener('change', e => {
    STATE.timerEnabled = e.target.checked;
    localStorage.setItem('quiz-timer', STATE.timerEnabled);
  });
  document.getElementById('restart-btn').addEventListener('click', () => showScreen('home'));
  document.getElementById('share-btn').addEventListener('click', shareScore);
  document.getElementById('retry-offline').addEventListener('click', () => location.reload());
}

async function loadQuestions() {
  try {
    const res = await fetch('data/questions.sample.json?v=' + Date.now());
    const data = await res.json();
    STATE.questions = data.questions.filter(q => q.level === STATE.level);
    const saved = localStorage.getItem('quiz-used-' + data.version);
    if (saved) STATE.usedIds = JSON.parse(saved);
  } catch (e) {
    const cached = await caches.match('data/questions.sample.json');
    if (cached) {
      const data = await cached.json();
      STATE.questions = data.questions.filter(q => q.level === STATE.level);
    }
  }
}

function startQuiz() {
  STATE.current = 0;
  STATE.score = 0;
  STATE.streak = 0;
  STATE.timeLeft = 30;
  const pool = STATE.questions.filter(q => !STATE.usedIds.includes(q.id));
  STATE.gameQuestions = shuffle(pool).slice(0, 20);
  if (STATE.gameQuestions.length < 20) {
    STATE.usedIds = [];
    localStorage.removeItem('quiz-used-' + getVersion());
    STATE.gameQuestions = shuffle(STATE.questions).slice(0, 20);
  }
  DOM.totalEl.textContent = STATE.gameQuestions.length;
  showScreen('quiz');
  showQuestion();
}

function showQuestion() {
  const q = STATE.gameQuestions[STATE.current];
  DOM.currentEl.textContent = STATE.current + 1;
  DOM.questionEl.textContent = q.text;
  DOM.optionsEl.innerHTML = '';
  DOM.feedbackEl.classList.add('hidden');
  DOM.feedbackEl.innerHTML = '';

  const options = shuffle([...q.incorrect, q.correct]);
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option';
    btn.textContent = opt;
    btn.addEventListener('click', () => selectAnswer(opt, q.correct, q.explanation));
    DOM.optionsEl.appendChild(btn);
  });

  if (STATE.timerEnabled) startTimer();
}

function selectAnswer(selected, correct, explanation) {
  if (DOM.optionsEl.dataset.answered) return;
  DOM.optionsEl.dataset.answered = 'true';
  clearInterval(STATE.timerInterval);

  const correctBtn = [...DOM.optionsEl.children].find(b => b.textContent === correct);
  const selectedBtn = [...DOM.optionsEl.children].find(b => b.textContent === selected);

  const isCorrect = selected === correct;
  if (isCorrect) {
    STATE.score++;
    STATE.streak++;
    selectedBtn.classList.add('correct');
    hapticSuccess();
  } else {
    STATE.streak = 0;
    selectedBtn.classList.add('wrong');
    correctBtn.classList.add('correct');
    hapticError();
  }

  DOM.feedbackEl.innerHTML = `<p><strong>${isCorrect ? 'Corretto!' : 'Sbagliato'}</strong></p><p>${explanation}</p>`;
  DOM.feedbackEl.classList.remove('hidden');

  setTimeout(() => {
    STATE.current++;
    if (STATE.current < STATE.gameQuestions.length) {
      DOM.optionsEl.dataset.answered = '';
      STATE.timeLeft = 30;
      DOM.timerEl.textContent = 30;
      showQuestion();
    } else {
      endQuiz();
    }
  }, 3000);
}

function startTimer() {
  clearInterval(STATE.timerInterval);
  DOM.timerEl.textContent = STATE.timeLeft;
  STATE.timerInterval = setInterval(() => {
    STATE.timeLeft--;
    DOM.timerEl.textContent = STATE.timeLeft;
    if (STATE.timeLeft <= 0) {
      clearInterval(STATE.timerInterval);
      selectAnswer('', STATE.gameQuestions[STATE.current].correct, "Tempo scaduto!");
    }
  }, 1000);
}

function endQuiz() {
  const percentage = Math.round((STATE.score / STATE.gameQuestions.length) * 100);
  DOM.scoreEl.textContent = percentage + '%';
  DOM.streakEl.textContent = STATE.streak;
  const record = localStorage.getItem('quiz-record-' + STATE.level) || 0;
  if (percentage > record) {
    localStorage.setItem('quiz-record-' + STATE.level, percentage);
    DOM.recordEl.textContent = percentage + '% (nuovo!)';
  } else {
    DOM.recordEl.textContent = record + '%';
  }

  const evalText = percentage >= 90 ? 'Eccellente!' :
                   percentage >= 70 ? 'Molto bene!' :
                   percentage >= 50 ? 'Discreto' : 'Riprovaci!';
  DOM.evaluationEl.textContent = evalText;

  // Save used IDs
  const version = getVersion();
  const newUsed = STATE.gameQuestions.map(q => q.id);
  STATE.usedIds.push(...newUsed);
  if (STATE.usedIds.length > 500) STATE.usedIds = STATE.usedIds.slice(-400);
  localStorage.setItem('quiz-used-' + version, JSON.stringify(STATE.usedIds));

  showScreen('result');
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function loadSettings() {
  const saved = localStorage.getItem('quiz-timer');
  if (saved !== null) {
    STATE.timerEnabled = saved === 'true';
    DOM.timerToggle.checked = STATE.timerEnabled;
  }
}

async function shareScore() {
  const text = `Ho ottenuto ${DOM.scoreEl.textContent} al Quiz Italiano (${STATE.level})!`;
  if (navigator.share) {
    try {
      await navigator.share({ text });
    } catch {}
  } else {
    navigator.clipboard.writeText(text);
    alert('Punteggio copiato negli appunti!');
  }
}

function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getVersion() {
  return document.querySelector('link[rel="manifest"]')?.href.includes('sample') ? 'sample' : 'v1';
}

// Haptics (iOS only)
function hapticSuccess() {
  if (navigator.vibrate) navigator.vibrate(50);
}
function hapticError() {
  if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
}
