
let level='medie',questions=[],index=0,score=0;

document.querySelectorAll('.segment').forEach(b=>{
  b.onclick=()=>{document.querySelectorAll('.segment').forEach(x=>x.classList.remove('active'));b.classList.add('active');level=b.dataset.level;}
});

async function load(){
  const r=await fetch('./data/questions.sample.json'); const d=await r.json();
  questions=d[level];
}

document.getElementById('btnStart').onclick = async ()=>{
  await load(); index=0; score=0;
  document.getElementById('intro').classList.add('hidden');
  document.getElementById('quiz').classList.remove('hidden');
  show();
};

function show(){
  const q=questions[index];
  document.getElementById('qIndex').textContent=`Domanda ${index+1}/20`;
  document.getElementById('progressFill').style.width=((index+1)/20*100)+'%';
  document.getElementById('category').textContent=q.cat;
  document.getElementById('question').textContent=q.q;
  const box=document.getElementById('options'); box.innerHTML='';
  q.opts.forEach((o,i)=>{
    const b=document.createElement('button'); b.textContent=o;
    b.onclick=()=>sel(i);
    box.appendChild(b);
  });
  document.getElementById('explanation').classList.add('hidden');
  document.getElementById('btnNext').classList.add('hidden');
}

function sel(i){
  const q=questions[index];
  const btns=document.querySelectorAll('#options button');
  btns.forEach((b,ix)=>{
    if(ix===q.ans) b.classList.add('correct');
    else if(ix===i) b.classList.add('wrong');
    b.disabled=true;
  });
  if(i===q.ans) score++;
  document.getElementById('explanation').textContent=q.exp;
  document.getElementById('explanation').classList.remove('hidden');
  document.getElementById('btnNext').classList.remove('hidden');
}

document.getElementById('btnNext').onclick=()=>{
  index++;
  if(index>=20){ end(); return; }
  show();
};

function end(){
  document.getElementById('quiz').classList.add('hidden');
  document.getElementById('results').classList.remove('hidden');
  document.getElementById('percent').textContent=`Punteggio: ${score}/20`;
}

document.getElementById('btnNewGame').onclick=()=>location.reload();
