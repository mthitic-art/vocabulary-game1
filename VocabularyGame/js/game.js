/* ============================================================
   game.js  ·  [GAME LAYER]
   Visual FX, shared question engine, all game modes, the
   progress dashboard, and boot/wiring. Depends on:
     vocabulary.js (data)  audio.js (sound)  progress.js (save/SRS)
   ============================================================ */

/* ---------- [FX] confetti + floating stars ---------- */
const FX = (() => {
  const cv = document.getElementById('fx'), c = cv.getContext('2d');
  let parts = [], running = false;
  function size(){ cv.width = innerWidth; cv.height = innerHeight; }
  addEventListener('resize', size); size();
  // rAF loop runs ONLY while particles exist (perf: self-stops when idle).
  function loop(){
    if (!parts.length){ running = false; c.clearRect(0,0,cv.width,cv.height); return; }
    running = true; c.clearRect(0,0,cv.width,cv.height);
    parts.forEach(p => {
      p.vy += 0.25; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
      c.save(); c.translate(p.x,p.y); c.rotate(p.rot);
      c.globalAlpha = Math.max(0, p.life/p.max); c.fillStyle = p.col;
      c.fillRect(-p.s/2,-p.s/2,p.s,p.s); c.restore();
    });
    parts = parts.filter(p => p.life>0 && p.y < cv.height+40);
    requestAnimationFrame(loop);
  }
  const COLORS = ["#F5A300","#E84A5F","#1FA39A","#7B3FC4","#4E9A2E","#E8527F"];
  return {
    confetti(n=120){
      for (let i=0;i<n;i++) parts.push({
        x: cv.width/2 + (Math.random()-.5)*120, y: cv.height*0.35,
        vx:(Math.random()-.5)*9, vy:-Math.random()*9-3,
        s:6+Math.random()*8, col:COLORS[i%COLORS.length],
        rot:Math.random()*6, vr:(Math.random()-.5)*.3, life:90+Math.random()*40, max:130
      });
      if (!running) loop();
    },
    star(x,y){
      const el = document.createElement('div');
      el.className = 'floatstar'; el.textContent = Math.random()<.5?'⭐':'✨';
      el.style.left = (x-16)+'px'; el.style.top = (y-16)+'px';
      document.body.appendChild(el); setTimeout(()=>el.remove(),1000);
    }
  };
})();

/* ---------- Image rendering with fallback ----------
   Loads a real image if the entry has one; on error swaps to
   emoji. Emoji-only entries render emoji directly (no network). */
function pic(lv, w, cls){
  const e = entryOf(lv, w);
  const emo = e.emoji || "🔡";
  if (e.image){
    return `<span class="${cls}"><img src="${e.image}" alt="${w}" loading="lazy"
      onerror="this.parentNode.innerHTML='${emo}'"></span>`;
  }
  return `<span class="${cls}" role="img" aria-label="${w}">${emo}</span>`;
}

/* ---------- Toast (achievements / unlocks) ---------- */
let toastTimer = null;
function toast(emoji, msg){
  const t = document.getElementById('toast');
  t.querySelector('.te').textContent = emoji;
  document.getElementById('toastMsg').textContent = msg;
  t.classList.add('show'); clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> t.classList.remove('show'), 2600);
}

/* ---------- HUD chips + level locks ---------- */
function refreshChips(){
  document.getElementById('streakChip').textContent = DB.streak;
  document.getElementById('starChip').textContent  = DB.stars;
  document.getElementById('badgeChip').textContent = Object.keys(DB.badges).length;
}
function refreshLocks(){
  // Levels are never locked now — nothing to grey out.
}

/* ---------- [ENGINE] shared state ---------- */
const $ = s => document.querySelector(s);
const shuffle = a => a.map(x=>[Math.random(),x]).sort((p,q)=>p[0]-q[0]).map(p=>p[1]);
let LV = "K1", MODE = "", score = 0, qi = 0, queue = [], total = 0, reviewMode = false;

function showScreen(){ $('#home').style.display='none'; $('#dash').classList.remove('show'); $('#screen').classList.add('show'); }
function goHome(){ if (window.speechSynthesis) speechSynthesis.cancel();
  $('#screen').classList.remove('show'); $('#dash').classList.remove('show');
  $('#home').style.display='block'; refreshChips(); refreshLocks(); }
function setScore(){ $('#score').textContent = '⭐ ' + score; }
function setProg(p){ $('#progbar').style.width = p + '%'; }

function afterRound(){ // shared post-round bookkeeping
  Gamify.checkUnlocks(lv => toast("🔓", lv + " unlocked!"));
  Gamify.checkAchievements(a => toast(a.e, "Badge: " + a.n));
  refreshChips(); refreshLocks();
}

/* ============================================================
   MODE 1 · QUIZ (adaptive choices + SRS) — also powers REVIEW
   ============================================================ */
function startQuiz(useReview){
  reviewMode = !!useReview; MODE = useReview ? "review" : "quiz";
  score = 0; qi = 0;
  const pool = useReview ? SRS.wrongList(LV) : SRS.pickWeighted(LV, 10);
  if (useReview && pool.length === 0){
    showScreen();
    $('#play').innerHTML =
      `<div class="done"><div class="trophy">🎉</div><h2>Nothing to review!</h2>
       <p class="res">No wrong words in ${LV}. Great memory!</p>
       <button class="btn alt" onclick="goHome()">🏠 Home</button></div>`;
    setProg(100); return;
  }
  queue = shuffle(pool).slice(0,10); total = queue.length;
  showScreen(); setScore(); nextQuiz();
}
function nextQuiz(){
  if (qi >= total) return finishRound();
  setProg(qi/total*100);
  const word = queue[qi];
  const n = CHOICES[LV] || 4;
  const wrongs = shuffle(wordsOf(LV).filter(w=>w!==word)).slice(0, n-1);
  const choices = shuffle([word, ...wrongs]);
  $('#play').innerHTML = `
    <div class="prompt">
      <button class="speak" id="sp" aria-label="Play word sound">🔊</button>
      <p class="hint">Listen, then tap the right picture${reviewMode?' · Review round':''}</p>
    </div>
    <div class="opts n${n}" id="opts" role="group" aria-label="Answer choices">
      ${choices.map(c=>`<button class="opt" data-w="${c}" tabindex="0" aria-label="${c}">${pic(LV,c,'oimg')}</button>`).join('')}
    </div>
    <div class="fb" id="fb" aria-live="assertive"></div>`;
  $('#sp').onclick = () => Audio2.speak(word);
  setTimeout(()=>Audio2.speak(word),350);
  bindOptions(word, nextQuiz);
}

/* Shared option handler (mouse + keyboard). [A11Y] */
function bindOptions(word, advance){
  const opts = [...document.querySelectorAll('.opt')];
  opts.forEach((o,idx)=>{
    o.onclick = () => choose(o, word, advance);
    o.onkeydown = e => {
      if (e.key==='Enter'||e.key===' '){ e.preventDefault(); o.click(); }
      if (e.key==='ArrowRight'){ (opts[idx+1]||opts[0]).focus(); }
      if (e.key==='ArrowLeft'){ (opts[idx-1]||opts[opts.length-1]).focus(); }
    };
  });
  opts[0] && opts[0].focus();
}
function choose(el, word, advance){
  document.querySelectorAll('.opt').forEach(o=> o.style.pointerEvents='none');
  const ok = el.dataset.w === word;
  SRS.record(LV, word, ok);
  if (ok){
    el.classList.add('right'); score++; setScore();
    Audio2.good(); Audio2.speak(word);
    $('#fb').textContent = '🎉 ' + praise(); $('#fb').style.color = 'var(--grass)';
    const r = el.getBoundingClientRect();
    for (let i=0;i<5;i++) setTimeout(()=>FX.star(r.left+r.width/2+(Math.random()-.5)*60, r.top+30), i*70);
  } else {
    el.classList.add('wrong'); Audio2.bad();
    document.querySelectorAll('.opt').forEach(o=>{ if (o.dataset.w===word) o.classList.add('right'); });
    $('#fb').textContent = '💪 Keep trying'; $('#fb').style.color = 'var(--coral)';
  }
  qi++; setTimeout(advance, 1250);
}

/* ============================================================
   MODE 2 · FLASHCARD — flip, hear, self-paced
   ============================================================ */
function startFlash(){
  MODE = "flashcard"; queue = shuffle(SRS.pickWeighted(LV, wordsOf(LV).length)); qi = 0;
  showScreen(); renderFlash();
}
function renderFlash(){
  setProg((qi+1)/queue.length*100);
  const w = queue[qi];
  $('#score').textContent = '🃏 ' + (qi+1) + '/' + queue.length;
  $('#play').innerHTML = `
    <div class="flash"><div class="flashinner" id="fi" tabindex="0" role="button" aria-label="Flashcard, tap to flip">
      <div class="fface">${pic(LV,w,'wordimg')}<p class="hint">Tap to see the word</p></div>
      <div class="fface fback"><span class="bigword">${w}</span>
        <button class="speak" id="fsp" aria-label="Play sound">🔊</button></div>
    </div></div>
    <div class="flashnav">
      <button class="btn alt" id="fprev">⬅️ Back</button>
      <span class="score">${qi+1}/${queue.length}</span>
      <button class="btn" id="fnext">Next ➡️</button>
    </div>`;
  const fi = $('#fi');
  fi.onclick = () => { fi.classList.toggle('flip'); if (fi.classList.contains('flip')) Audio2.speak(w); };
  fi.onkeydown = e => { if (e.key==='Enter'||e.key===' '){ e.preventDefault(); fi.click(); } };
  $('#fsp').onclick = e => { e.stopPropagation(); Audio2.speak(w); };
  $('#fprev').onclick = () => { if (qi>0){ qi--; renderFlash(); } };
  $('#fnext').onclick = () => { if (qi<queue.length-1){ qi++; renderFlash(); } else finishRound(true); };
  setTimeout(()=>Audio2.speak(w),300);
}

/* ============================================================
   MODE 3 · ADVENTURE (RPG) — 10 stages × 5 words = 50 words.
   Each stage is a monster battle; stage 10 is the BOSS. Answering
   a word correctly damages the monster; a wrong answer lets it
   strike back (lose a heart). Clear all monsters to win.
   ============================================================ */
const ADV_STAGES = 10;          // 10 stages
const ADV_WORDS_PER = 5;        // 5 words each  -> 50 words total
const ADV_START_HEARTS = 3;     // player lives per stage

// Monster lineup. Last one is the boss. Pure emoji art — no assets needed.
const MONSTERS = [
  {e:"🐛", n:"Wiggly"},   {e:"🐌", n:"Snaily"},  {e:"🦗", n:"Hoppy"},
  {e:"🕷️", n:"Webby"},   {e:"🦂", n:"Pinchy"},  {e:"🐍", n:"Hissy"},
  {e:"🦇", n:"Flappy"},   {e:"👻", n:"Boo"},     {e:"🦖", n:"Rex"},
  {e:"🐉", n:"DRAGON BOSS"}
];

let advStage = 0;          // 0-based current stage index
let advHearts = 0;         // player hearts in current stage
let monHP = 0, monMax = 0; // monster hit points

function startAdventure(){ MODE = "adventure"; advStage = 0; renderAdvMap(); }

/* The world map: shows all 10 stages, which are cleared, which is current. */
function renderAdvMap(){
  showScreen(); setProg(advStage/ADV_STAGES*100);
  $('#score').textContent = '🗺️ ' + advStage + '/' + ADV_STAGES + ' cleared';
  let nodes = '';
  for (let i=0;i<ADV_STAGES;i++){
    const m = MONSTERS[i];
    const state = i<advStage ? 'done' : i===advStage ? 'cur' : 'next';
    const isBoss = i===ADV_STAGES-1;
    nodes += `<button class="advnode ${state} ${isBoss?'boss':''}" data-i="${i}">
      <span class="num">${i+1}</span>
      <span style="flex:1;text-align:left;font-weight:600">${isBoss?'BOSS · ':''}${m.n}</span>
      <span style="font-size:1.6rem">${i<advStage?'✅':m.e}</span></button>`;
  }
  $('#play').innerHTML = `<p class="hint" style="text-align:center;margin-bottom:8px">
      Defeat all 10 monsters! Each battle has 5 words.</p>
    <div class="advmap">${nodes}</div>`;
  // All stages are tappable (no hard locking) so kids can replay any battle,
  // but the "current" one is highlighted as the suggested next step.
  document.querySelectorAll('.advnode').forEach(nd=>{
    nd.onclick = () => startBattle(parseInt(nd.dataset.i,10));
  });
}

/* Begin a single monster battle. */
function startBattle(stageIdx){
  advStage = stageIdx;
  score = 0; qi = 0; total = ADV_WORDS_PER;
  advHearts = ADV_START_HEARTS;
  monMax = ADV_WORDS_PER; monHP = ADV_WORDS_PER;   // 5 correct hits = defeated
  queue = shuffle(SRS.pickWeighted(LV, ADV_WORDS_PER));
  nextBattleWord();
}

function battleBar(){
  const m = MONSTERS[advStage];
  const isBoss = advStage===ADV_STAGES-1;
  const hp = Math.max(0, Math.round(monHP/monMax*100));
  const hearts = '❤️'.repeat(advHearts) + '🤍'.repeat(ADV_START_HEARTS-advHearts);
  return `
    <div class="battle">
      <div class="mon ${isBoss?'bossmon':''}" id="mon">
        <div class="mon-emoji" id="monEmoji">${m.e}</div>
        <div class="mon-name">${isBoss?'⚔️ ':''}${m.n}</div>
        <div class="hpbar"><div id="monHP" style="width:${hp}%"></div></div>
      </div>
      <div class="hearts">${hearts}</div>
    </div>`;
}

function nextBattleWord(){
  if (advHearts<=0){ return battleLost(); }
  if (monHP<=0 || qi>=total){ return battleWon(); }
  setProg(advStage/ADV_STAGES*100 + (qi/total)*(100/ADV_STAGES));
  const word = queue[qi]; const n = CHOICES[LV] || 4;
  const wrongs = shuffle(wordsOf(LV).filter(w=>w!==word)).slice(0, n-1);
  const choices = shuffle([word, ...wrongs]);
  $('#score').textContent = '⚔️ Stage ' + (advStage+1) + '/' + ADV_STAGES;
  $('#play').innerHTML = battleBar() + `
    <div class="prompt"><button class="speak" id="sp" aria-label="Play sound">🔊</button>
      <p class="hint">Listen and hit the monster with the right word!</p></div>
    <div class="opts n${n}" role="group">${choices.map(c=>
      `<button class="opt" data-w="${c}" tabindex="0" aria-label="${c}">${pic(LV,c,'oimg')}</button>`).join('')}</div>
    <div class="fb" id="fb" aria-live="assertive"></div>`;
  $('#sp').onclick = () => Audio2.speak(word); setTimeout(()=>Audio2.speak(word),300);
  // custom option handler for battle (damage / counterattack)
  const opts=[...document.querySelectorAll('.opt')];
  opts.forEach((o,idx)=>{
    o.onclick=()=>battleChoose(o,word);
    o.onkeydown=e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();o.click();}
      if(e.key==='ArrowRight')(opts[idx+1]||opts[0]).focus();
      if(e.key==='ArrowLeft')(opts[idx-1]||opts[opts.length-1]).focus(); };
  });
  opts[0]&&opts[0].focus();
}

function battleChoose(el,word){
  document.querySelectorAll('.opt').forEach(o=>o.style.pointerEvents='none');
  const ok = el.dataset.w===word; SRS.record(LV,word,ok);
  const monEl = document.getElementById('mon');
  if (ok){
    el.classList.add('right'); score++; monHP--; Audio2.good(); Audio2.speak(word);
    if (monEl){ monEl.classList.add('mon-hurt'); setTimeout(()=>monEl.classList.remove('mon-hurt'),400); }
    const hpEl=document.getElementById('monHP'); if(hpEl) hpEl.style.width=Math.max(0,Math.round(monHP/monMax*100))+'%';
    $('#fb').textContent='💥 '+praise(); $('#fb').style.color='var(--grass)';
    const r=el.getBoundingClientRect();
    for(let i=0;i<4;i++) setTimeout(()=>FX.star(r.left+r.width/2+(Math.random()-.5)*50,r.top+20),i*70);
  } else {
    el.classList.add('wrong'); advHearts--; Audio2.hit();
    document.querySelectorAll('.opt').forEach(o=>{ if(o.dataset.w===word)o.classList.add('right'); });
    if (monEl){ monEl.classList.add('mon-attack'); setTimeout(()=>monEl.classList.remove('mon-attack'),400); }
    $('#fb').textContent='🛡️ Ouch! Lost a heart'; $('#fb').style.color='var(--coral)';
  }
  qi++;
  setTimeout(nextBattleWord, 1250);
}

function battleWon(){
  const isBoss = advStage===ADV_STAGES-1;
  if (advStage+1 > advStageCleared()) {/* track via history below */}
  FX.confetti(isBoss?200:90); Audio2.win();
  Gamify.recordRound("adventure", LV, score, total); afterRound();
  const wasLast = advStage>=ADV_STAGES-1;
  const nextIdx = advStage+1;
  $('#play').innerHTML = `<div class="done">
    <div class="trophy">${isBoss?'👑':'⚔️'}</div>
    <h2>${isBoss?'BOSS DEFEATED!':'Monster defeated!'}</h2>
    <div class="res">${MONSTERS[advStage].e} ${MONSTERS[advStage].n} is beaten · +${score} ⭐</div>
    ${wasLast
      ? `<p class="hint" style="margin-bottom:10px">You cleared all 10 stages! 🎉</p>
         <button class="btn" onclick="startAdventure()">🔁 Play Again</button>`
      : `<button class="btn" id="nextStage">➡️ Next Monster</button>
         <button class="btn alt" onclick="renderAdvMap()">🗺️ Map</button>`}
    <button class="btn alt" onclick="goHome()">🏠 Home</button></div>`;
  const ns=document.getElementById('nextStage');
  if (ns) ns.onclick=()=>startBattle(nextIdx);
}
// helper: highest stage cleared from history (so the map shows progress)
function advStageCleared(){
  return DB.history.filter(h=>h.mode==='adventure'&&h.lv===LV).length;
}

function battleLost(){
  Audio2.bad();
  $('#play').innerHTML = `<div class="done">
    <div class="trophy">💔</div><h2>Out of hearts!</h2>
    <div class="res">${MONSTERS[advStage].e} ${MONSTERS[advStage].n} was too strong this time.</div>
    <button class="btn" id="retry">🔄 Try Again</button>
    <button class="btn alt" onclick="renderAdvMap()">🗺️ Map</button>
    <button class="btn alt" onclick="goHome()">🏠 Home</button></div>`;
  document.getElementById('retry').onclick=()=>startBattle(advStage);
}

/* ============================================================
   MODE 4 · MEMORY MATCH — pair word card with picture card
   ============================================================ */
let memFlipped = [], memLock = false, memPairs = 0;
function startMemory(){
  MODE = "memory"; memFlipped = []; memLock = false;
  const pool = shuffle(SRS.pickWeighted(LV, 6)); memPairs = pool.length;
  let deck = [];
  pool.forEach(w => { deck.push({w,type:'word'}); deck.push({w,type:'pic'}); });
  deck = shuffle(deck);
  showScreen(); setProg(0); $('#score').textContent = '🧠 0/' + memPairs;
  const cols = 4;
  $('#play').innerHTML = `<p class="hint" style="text-align:center;margin-bottom:8px">Match each word with its picture!</p>
    <div class="memgrid" id="memgrid" style="grid-template-columns:repeat(${cols},1fr)"></div>`;
  const g = $('#memgrid');
  deck.forEach((card,i)=>{
    const face = card.type==='word'
      ? `<div class="memface memback"><span>${card.w}</span></div>`
      : `<div class="memface memback">${pic(LV,card.w,'oimg')}</div>`;
    const el = document.createElement('div');
    el.className = 'memcard'; el.dataset.w = card.w; el.dataset.i = i; el.tabIndex = 0;
    el.setAttribute('role','button'); el.setAttribute('aria-label','Memory card');
    el.innerHTML = `<div class="memface memfront">?</div>${face}`;
    el.onclick = () => memTap(el);
    el.onkeydown = e => { if (e.key==='Enter'||e.key===' '){ e.preventDefault(); memTap(el); } };
    g.appendChild(el);
  });
}
function memTap(el){
  if (memLock || el.classList.contains('flip') || el.classList.contains('done')) return;
  el.classList.add('flip');
  if (el.querySelector('.memback span')) Audio2.speak(el.dataset.w);
  memFlipped.push(el);
  if (memFlipped.length === 2){
    memLock = true;
    const [a,b] = memFlipped;
    if (a.dataset.w === b.dataset.w && a.dataset.i !== b.dataset.i){
      setTimeout(()=>{
        a.classList.add('done'); b.classList.add('done'); Audio2.good();
        const r = a.getBoundingClientRect(); FX.star(r.left+r.width/2, r.top);
        memFlipped = []; memLock = false;
        const done = document.querySelectorAll('.memcard.done').length/2;
        $('#score').textContent = '🧠 ' + done + '/' + memPairs; setProg(done/memPairs*100);
        if (done >= memPairs){ score = memPairs; total = memPairs; setTimeout(()=>finishRound(),500); }
      },420);
    } else {
      Audio2.bad();
      setTimeout(()=>{ a.classList.remove('flip'); b.classList.remove('flip'); memFlipped=[]; memLock=false; },800);
    }
  }
}

/* ============================================================
   Completion — stars, confetti, history, unlocks/achievements
   ============================================================ */
function finishRound(silent){
  setProg(100);
  if (silent){ // flashcards: friendly end card, no scoring
    Gamify.recordRound(MODE, LV, 0, 0); afterRound();
    $('#play').innerHTML = `<div class="done"><div class="trophy">🃏</div>
      <h2>All done!</h2><p class="res">You reviewed every card.</p>
      <button class="btn" onclick="startFlash()">🔁 Again</button>
      <button class="btn alt" onclick="goHome()">🏠 Home</button></div>`;
    return;
  }
  const max = (MODE === 'memory') ? memPairs : total;
  const pct = max ? score/max : 0;
  const starsEarned = pct>=.8 ? 3 : pct>=.5 ? 2 : 1;
  Gamify.addStars(starsEarned + score);
  Gamify.recordRound(MODE, LV, score, max);
  afterRound();
  if (pct >= .5){ FX.confetti(140); }
  Audio2.win();
  const msg = pct>=.8 ? 'Amazing!' : pct>=.5 ? 'Good job!' : 'Keep practising!';
  const stars = '⭐'.repeat(starsEarned) + '☆'.repeat(3-starsEarned);
  $('#play').innerHTML = `<div class="done">
    <div class="trophy">🏆</div><h2>${msg}</h2>
    <div class="starline">${[...stars].map((s,i)=>`<span style="animation-delay:${i*.15}s">${s}</span>`).join('')}</div>
    <div class="res">Score: ${score} / ${max} · +${starsEarned+score} ⭐</div>
    <button class="btn" id="again">🔁 Play Again</button>
    <button class="btn alt" onclick="goHome()">🏠 Home</button></div>`;
  $('#again').onclick = () => routeGame(MODE);
}

/* ============================================================
   [DASH] progress dashboard
   ============================================================ */
function openDash(){
  $('#home').style.display='none'; $('#screen').classList.remove('show');
  $('#dash').classList.add('show'); renderDash();
}
function renderDash(){
  const totSeen = Object.values(DB.mastery).reduce((a,m)=>a+m.seen,0);
  const totCorrect = Object.values(DB.mastery).reduce((a,m)=>a+m.correct,0);
  const mastered = Object.values(DB.mastery).filter(m=>m.seen>=3 && m.correct/m.seen>=.9).length;
  const acc = totSeen ? Math.round(totCorrect/totSeen*100) : 0;
  $('#dashStats').innerHTML =
    stat(DB.stars,'Total Stars') + stat(DB.streak+'🔥','Day Streak') +
    stat(acc+'%','Accuracy') + stat(mastered,'Words Mastered') +
    stat(DB.history.length,'Rounds Played') +
    stat(Object.keys(DB.badges).length+'/'+ACHIEVEMENTS.length,'Badges');
  $('#dashBadges').innerHTML = ACHIEVEMENTS.map(a=>
    `<div class="badge ${DB.badges[a.id]?'earned':''}"><div class="be">${a.e}</div><div class="bn">${a.n}</div></div>`).join('');
  renderJourney(mastered);
  $('#curLvLabel').textContent = LV;
  $('#dashMastery').innerHTML = wordsOf(LV).map(w=>{
    const p = Math.round(SRS.pct(LV,w)*100);
    return `<div class="mrow"><span class="w">${emojiOf(LV,w)} ${w}</span>
      <span class="mbar"><div style="width:${p}%"></div></span><span class="mpct">${p}%</span></div>`;
  }).join('') || '<p class="hint">Play this level to see word mastery.</p>';
}
function stat(v,l){ return `<div class="stat"><div class="v">${v}</div><div class="l">${l}</div></div>`; }

/* Learning journey — shows kids what they achieve by playing, as a
   4-step path that fills in as they progress. Each step has a clear
   "what you get" so effort feels rewarded (addresses tester point #3). */
function renderJourney(mastered){
  const bossCleared = DB.history.some(h=>h.mode==='adventure' && h.score===h.max && h.max>0);
  const steps = [
    {icon:"🎮", title:"Start playing",   goal:"Play your first game",        done: DB.history.length>=1},
    {icon:"⭐", title:"Collect stars",   goal:"Earn 10 stars",               done: DB.stars>=10},
    {icon:"🧠", title:"Master words",    goal:"Master 20 words (90%+)",      done: mastered>=20},
    {icon:"👑", title:"Beat the Boss",   goal:"Win an Adventure battle",     done: bossCleared},
  ];
  const reached = steps.filter(s=>s.done).length;
  $('#dashJourney').innerHTML = `<div class="journey">
    ${steps.map((s,i)=>`
      <div class="jstep ${s.done?'done':''} ${i===reached?'current':''}">
        <div class="jicon">${s.done?s.icon:'🔒'}</div>
        <div class="jbody">
          <div class="jtitle">${s.title}</div>
          <div class="jgoal">${s.goal}</div>
        </div>
        <div class="jcheck">${s.done?'✅':''}</div>
      </div>
      ${i<steps.length-1?'<div class="jline"></div>':''}
    `).join('')}
  </div>`;
}

/* ============================================================
   [BOOT] level pills, routing, wiring, async init
   ============================================================ */
function buildLevelPills(){
  const box = $('#levels');
  box.innerHTML = LEVELS.map((lv,i)=>{
    const on = i===0 ? 'on' : '';
    const sel = i===0 ? 'true' : 'false';
    return `<button class="pill ${on}" data-lv="${lv}" role="tab" aria-selected="${sel}">${lv}</button>`;
  }).join('');
  box.querySelectorAll('.pill').forEach(b=> b.onclick = () => pickLevel(b));
}
function pickLevel(b){
  const lv = b.dataset.lv;
  document.querySelectorAll('.pill').forEach(p=>{ p.classList.remove('on'); p.setAttribute('aria-selected','false'); });
  b.classList.add('on'); b.setAttribute('aria-selected','true'); LV = lv;
}
function routeGame(g){
  // No level locking: every grade can play its own level right away.
  if (!hasLevelWords(LV)){ toast("📭","No words for "+LV+" this month."); return; }
  // K1 (youngest) sees a quick bilingual how-to-play card the first time
  // they open a game in a session.
  if (LV==="K1" && !sessionInstShown[g]){ sessionInstShown[g]=true; return showK1Instructions(g); }
  ({ quiz:()=>startQuiz(false), review:()=>startQuiz(true), flashcard:startFlash,
     adventure:startAdventure, memory:startMemory }[g] || (()=>{}))();
}

/* ---- Bilingual (EN/TH) instructions for the youngest learners (K1) ---- */
const sessionInstShown = {};   // show once per game per session
const K1_INSTRUCTIONS = {
  quiz:      {en:"Listen to the word, then tap the matching picture.", th:"ฟังเสียงคำ แล้วแตะรูปที่ตรงกัน"},
  flashcard: {en:"Tap the card to flip it and hear the word.",        th:"แตะการ์ดเพื่อพลิกดูคำและฟังเสียง"},
  adventure: {en:"Beat monsters! Tap the right word to attack.",      th:"สู้มอนสเตอร์! แตะคำที่ถูกเพื่อโจมตี"},
  memory:    {en:"Find the word and its picture pair.",               th:"จับคู่คำกับรูปภาพให้ตรงกัน"},
  review:    {en:"Practise the words you missed before.",             th:"ฝึกคำที่เคยตอบผิด"}
};
function showK1Instructions(g){
  const ins = K1_INSTRUCTIONS[g] || K1_INSTRUCTIONS.quiz;
  showScreen();
  $('#score').textContent = '🎈 K1';
  setProg(0);
  $('#play').innerHTML = `<div class="done">
    <div class="trophy">🎮</div>
    <h2>How to play</h2>
    <p class="res" style="margin-bottom:4px">${ins.en}</p>
    <p class="res" style="font-size:1.1rem;color:var(--sky);margin-bottom:18px">${ins.th}</p>
    <button class="btn" id="startNow">▶️ Start / เริ่มเลย</button>
    <button class="btn alt" onclick="goHome()">🏠 Home</button></div>`;
  document.getElementById('startNow').onclick = () => {
    ({ quiz:()=>startQuiz(false), review:()=>startQuiz(true), flashcard:startFlash,
       adventure:startAdventure, memory:startMemory }[g] || (()=>{}))();
  };
}

async function boot(){
  try { await loadVocabulary(); }
  catch(e){
    document.getElementById('play') &&
      (document.getElementById('home').innerHTML =
        `<div class="done"><div class="trophy">⚠️</div><h2>Could not load words</h2>
         <p class="res">${e.message}</p>
         <p class="hint">Tip: this game must be served over http(s). Use GitHub Pages,
         Netlify, or run a local server (e.g. <code>python -m http.server</code>) —
         opening the file directly can block loading data/vocabulary.json.</p></div>`);
    return;
  }
  buildLevelPills();
  document.querySelectorAll('.card').forEach(c=> c.onclick = () => routeGame(c.dataset.game));
  $('#back').onclick = goHome; $('#navHome').onclick = goHome;
  $('#navDash').onclick = openDash; $('#dashBack').onclick = goHome;
  $('#resetBtn').onclick = () => {
    if (confirm('Erase all stars, badges and progress?')){
      DB = Store.reset(); refreshChips(); refreshLocks(); renderDash(); toast("🗑️","Progress reset");
    }
  };
  Gamify.touchStreak();
  Gamify.checkAchievements(a=>{});
  refreshChips(); refreshLocks();
}
document.addEventListener('DOMContentLoaded', boot);
