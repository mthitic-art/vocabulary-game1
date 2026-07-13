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
/* คำแปลไทยของคำศัพท์ (มีเฉพาะ K1-K3) */
function thaiOf(lv, w){
  const e = entryOf(lv, w);
  return e && e.th ? e.th : '';
}

function pic(lv, w, cls){
  const e = entryOf(lv, w);
  const emo = e.emoji || "🔡";
  if (e.image){
    // ลองนามสกุลอื่นถ้าไฟล์แรกไม่เจอ: เริ่มจากที่ระบุใน JSON แล้วไล่ที่เหลือ
    const base = e.image.replace(/\.(png|jpe?g|webp)$/i, '');
    const exts = ['png','jpeg','jpg','webp'];
    const given = (e.image.match(/\.(png|jpe?g|webp)$/i)||['','png'])[1].toLowerCase();
    const order = [given, ...exts.filter(x=>x!==given)];
    // eager + async decode → แสดงทันที ไม่ delay (การ์ดอยู่ในจอแล้ว)
    return `<div class="${cls}"><img src="${base}.${order[0]}" alt="${w}"
      loading="eager" decoding="async" fetchpriority="high"
      class="autoimg" data-base="${base}" data-exts="${order.join(',')}" data-i="0"
      data-emo="${emo}"></div>`;
  }
  return `<div class="${cls}" role="img" aria-label="${w}"><span>${emo}</span></div>`;
}

/* Preload ภาพล่วงหน้า — เรียกตอนเริ่มเล่นแต่ละระดับ
   ทำให้ภาพขึ้นทันทีไม่ต้องรอโหลดทีละข้อ */
const _preloadedLevels = {};
function preloadLevelImages(lv){
  const ck = (typeof MONTH!=='undefined'?MONTH:'') + '::' + lv;
  if(_preloadedLevels[ck]) return;
  _preloadedLevels[ck] = true;
  try{
    const words = wordsOf(lv);
    words.forEach(w=>{
      const e = entryOf(lv, w);
      if(e && e.image){
        const img = new Image();
        img.src = e.image;   // browser cache ไว้ล่วงหน้า
      }
    });
  }catch(err){ /* เงียบไว้ ถ้า preload ไม่ได้ก็ไม่เป็นไร */ }
}

/* ผูก fallback ให้ <img class="autoimg"> ทุกตัวที่ยังไม่ได้ผูก
   ลองนามสกุลถัดไปเรื่อยๆ ถ้าหมดแล้วยังไม่เจอ → แทนด้วย styled placeholder
   harden: เช็คภาพที่ error ไปแล้วก่อน JS ผูกทัน (complete && naturalWidth===0) */
function wireImgFallback(root){
  (root||document).querySelectorAll('img.autoimg:not([data-wired])').forEach(img=>{
    img.setAttribute('data-wired','1');
    const tryNext = () => {
      const exts = (img.dataset.exts||'').split(',').filter(Boolean);
      let n = +img.dataset.i || 0;
      if (n+1 < exts.length){
        img.dataset.i = n+1;
        img.src = img.dataset.base + '.' + exts[n+1];
      } else {
        // Fallback: แสดง "?" ในวงกลมสี แทน emoji abcd ที่ไม่มีประโยชน์
        const el = document.createElement('div');
        el.className = 'img-fallback';
        const emo = img.dataset.emo || '🔡';
        // ถ้า emoji เป็น default 🔡 → แสดง ? แทน
        el.textContent = (emo === '🔡') ? '?' : emo;
        if (img.parentNode) img.replaceWith(el);
      }
    };
    img.onerror = tryNext;
    // delay check: images inside backface-visibility:hidden (memory cards)
    // report naturalWidth=0 even when loaded — wait before deciding
    if (img.complete && img.naturalWidth === 0) {
      setTimeout(() => { if (img.naturalWidth === 0 && img.parentNode) tryNext(); }, 200);
    }
  });
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

/* ---------- HUD chips + hero + stats ---------- */
const CEFR_MAP = { K1:"Pre A1", K2:"Pre A1", K3:"A1", P1:"A1", P2:"A1",
                   P3:"A1+", P4:"A1+", P5:"A2", P6:"A2" };

function refreshChips(){
  document.getElementById('streakChip').textContent = DB.streak;
  document.getElementById('starChip').textContent  = DB.stars;
  /* Level badge (XP-based explorer level) */
  const xp = DB.stars * 10;
  const lvThresholds = [0,50,120,220,350,520,730,990,1300,1660,2100];
  let lv = 1;
  for(let i=1;i<lvThresholds.length;i++){ if(xp>=lvThresholds[i]) lv=i+1; }
  const lvB = document.getElementById('lvBadge');
  if(lvB) lvB.textContent = 'Lv.'+lv+' Explorer';
  refreshHero();
}
function refreshLocks(){ /* levels never locked */ }

/* Hero — Learning Coach + Words Mastered ของระดับปัจจุบัน */
function refreshHero(){
  /* CEFR badge ตามระดับที่เลือก */
  const cefrEl = document.getElementById('heroCefr');
  if(cefrEl) cefrEl.textContent = 'CEFR ' + (CEFR_MAP[LV] || 'Pre A1');

  /* Words mastered ของ LV ปัจจุบัน
     - learned = เคยเจอคำ (seen>=1)
     - mastered = ตอบถูกอย่างน้อย 1 ครั้ง (correct>=1)  */
  const words = wordsOf(LV);
  const totalWords = words.length;
  let masteredCount = 0, learnedCount = 0;
  words.forEach(w=>{
    const m = DB.mastery[SRS.key(LV, w)];
    if(m && m.seen>=1) learnedCount++;
    if(m && m.correct>=1) masteredCount++;
  });
  const xpf = document.getElementById('xpFill');
  if(xpf) xpf.style.width = totalWords? Math.round(masteredCount/totalWords*100)+'%' : '0%';
  const mt = document.getElementById('masteryTxt');
  if(mt) mt.textContent = masteredCount+' / '+totalWords+' words';

  /* Coach bubble — แสดงความก้าวหน้าที่แม่นยำ ไม่ใช่แค่ตัวเลขสุ่ม */
  const cb = document.getElementById('coachBubble');
  if(cb){
    let msg = '';
    if(totalWords === 0){
      msg = `Let's start<br><b>learning! 🚀</b>`;
    } else if(masteredCount === 0){
      // ยังไม่เคยเล่นเลย — บอก lesson แรก
      const size = lessonSize(LV);
      msg = `Start with<br><b>Lesson 1 · ${size} words 📖</b>`;
    } else if(masteredCount >= totalWords){
      // เรียนครบทั้งระดับแล้ว
      msg = `${LV} complete!<br><b>Amazing! 🏆</b>`;
    } else {
      // กำลังเรียนอยู่ — บอกความก้าวหน้าจริง
      const lessons = lessonsFor(LV);
      const curIdx = lessons.findIndex(ls => !lessonPassed(LV, ls));
      const remain = totalWords - masteredCount;
      if(curIdx >= 0){
        const prog = lessonProgress(LV, lessons[curIdx]);
        const size = lessons[curIdx].length;
        const inLesson = prog > 0;
        if(inLesson){
          msg = `Lesson ${curIdx+1}: <b>${prog}/${size} done! 💪</b>`;
        } else {
          msg = `Next: Lesson ${curIdx+1}<br><b>${size} words ready 📖</b>`;
        }
      } else {
        msg = `<b>${masteredCount}/${totalWords}</b> words mastered! ⭐`;
      }
    }
    cb.innerHTML = msg;
    // trigger wave animation ตอนข้อความเปลี่ยน
    triggerQuestyWave();
  }

  /* Quick stats — รวมทุกระดับ
     Words Learned = คำที่เคยเจอทั้งหมด (seen>=1) */
  const allEntries = Object.values(DB.mastery);
  const totSeen = allEntries.reduce((a,m)=>a+m.seen,0);
  const totCorrect = allEntries.reduce((a,m)=>a+m.correct,0);
  const allLearned = allEntries.filter(m=>m.seen>=1).length;
  const acc = totSeen ? Math.round(totCorrect/totSeen*100)+'%' : '–';
  const qw=document.getElementById('qsWords'); if(qw) qw.textContent=allLearned;
  const qa=document.getElementById('qsAcc'); if(qa) qa.textContent=acc;
  const qs=document.getElementById('qsStreak'); if(qs) qs.textContent=DB.streak;
}

/* ============================================================
   QUESTY ANIMATION — idle bob + wave trigger
   ============================================================ */
let questyWaveTimer = null;

function triggerQuestyWave(){
  const q = document.querySelector('.questy-hero, .questy-fallback');
  if(!q) return;
  // หยุด idle ชั่วคราว เปลี่ยนเป็น wave
  q.classList.remove('questy-wave');
  void q.offsetWidth;  // reflow เพื่อ restart animation
  q.classList.add('questy-wave');
  // กลับ idle หลัง wave จบ (1.2s)
  clearTimeout(questyWaveTimer);
  questyWaveTimer = setTimeout(() => q.classList.remove('questy-wave'), 1200);
}

/* Auto-wave ทุก 5 วินาที ตอนอยู่หน้า home */
let questyAutoWave = null;
function startQuestyIdle(){
  stopQuestyIdle();
  questyAutoWave = setInterval(() => {
    // wave เฉพาะตอนอยู่หน้า home ที่มองเห็น
    if(document.getElementById('home').style.display !== 'none'){
      triggerQuestyWave();
    }
  }, 5000);
}
function stopQuestyIdle(){ clearInterval(questyAutoWave); }
const $ = s => document.querySelector(s);
const shuffle = a => a.map(x=>[Math.random(),x]).sort((p,q)=>p[0]-q[0]).map(p=>p[1]);
let LV = "K1", MODE = "", score = 0, qi = 0, queue = [], total = 0, reviewMode = false;

function showScreen(){
  stopQuestyIdle();
  MusicPlayer.fadeOut();   // เพลงค่อยๆ หายตอนเข้าเกม
  $('#home').style.display='none'; $('#dash').classList.remove('show'); $('#screen').classList.add('show');
}
function goHome(){ if (window.speechSynthesis) speechSynthesis.cancel();
  QuestyReact.hide();
  inActiveGame = false;
  $('#screen').classList.remove('show'); $('#dash').classList.remove('show');
  $('#home').style.display=''; refreshChips(); refreshLocks(); updateSubjectBar();
  startQuestyIdle();
  MusicPlayer.fadeIn();   // เพลงค่อยๆ กลับมาตอนถึงหน้า home
}

/* ยืนยันก่อนออกจากเกมที่กำลังเล่น (กันความคืบหน้าหาย) */
let inActiveGame = false;
function confirmExit(){
  // ถ้าไม่ได้อยู่กลางเกม (เช่น หน้าเลือกบท/หน้าจบ) ออกได้เลย
  if (!inActiveGame){ return goHome(); }
  showExitDialog();
}
function showExitDialog(){
  // ลบ dialog เก่าถ้ามี
  const old = document.getElementById('exitDialog'); if(old) old.remove();
  const dlg = document.createElement('div');
  dlg.id = 'exitDialog';
  dlg.className = 'exit-overlay';
  dlg.innerHTML = `
    <div class="exit-box">
      <div class="exit-emoji">🦊</div>
      <div class="exit-title">Leave the game?</div>
      <div class="exit-sub">ออกจากเกมเลยไหม? · ความคืบหน้ารอบนี้จะหาย</div>
      <div class="exit-btns">
        <button class="btn warn" id="exitYes">Leave · ออก</button>
        <button class="btn" id="exitNo">Stay · เล่นต่อ</button>
      </div>
    </div>`;
  document.body.appendChild(dlg);
  document.getElementById('exitYes').onclick = () => { dlg.remove(); goHome(); };
  document.getElementById('exitNo').onclick = () => dlg.remove();
  dlg.onclick = (e) => { if(e.target===dlg) dlg.remove(); };  // คลิกนอกกล่อง = ปิด (เล่นต่อ)
}
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
/* ============================================================
   LESSON SYSTEM — แบ่งคำเป็นบท เพื่อให้เด็กเล่นครบทุกคำ
   K1-K3: บทละ 5 คำ  ·  P1-P6: บทละ 10 คำ
   บทถือว่า "ผ่าน" เมื่อทุกคำในบท correct>=1
   ============================================================ */
function lessonSize(lv){ return ['K1','K2','K3'].includes(lv) ? 5 : 10; }

function lessonsFor(lv){
  const words = wordsFiltered(lv);   // เคารพ subject filter (P1)
  const size = lessonSize(lv);
  const lessons = [];
  for(let i=0;i<words.length;i+=size){
    lessons.push(words.slice(i, i+size));
  }
  return lessons;
}

/* บทนี้ผ่านหรือยัง — ทุกคำ correct>=1 */
function lessonPassed(lv, lessonWords){
  return lessonWords.every(w=>{
    const m = DB.mastery[SRS.key(lv, w)];
    return m && m.correct>=1;
  });
}
/* นับคำที่ทำถูกในบท */
function lessonProgress(lv, lessonWords){
  return lessonWords.filter(w=>{
    const m = DB.mastery[SRS.key(lv, w)];
    return m && m.correct>=1;
  }).length;
}

/* หน้าเลือกบทเรียน */
function showLessonSelect(){
  MODE = "quiz"; inActiveGame = false;
  showScreen();
  const lessons = lessonsFor(LV);
  $('#score').textContent = '📖 ' + LV;
  setProg(0);

  if(!lessons.length){
    $('#play').innerHTML = `<div class="done"><div class="trophy">📭</div>
      <h2>No words yet</h2><button class="btn alt" onclick="goHome()">🏠 Home</button></div>`;
    return;
  }

  // หาบทแรกที่ยังไม่ผ่าน (current)
  let curIdx = lessons.findIndex(ls=>!lessonPassed(LV, ls));
  if(curIdx<0) curIdx = lessons.length; // ผ่านหมดแล้ว

  const cards = lessons.map((ls,i)=>{
    const passed = lessonPassed(LV, ls);
    const prog = lessonProgress(LV, ls);
    const isCur = i===curIdx;
    const cls = passed ? 'done' : isCur ? 'cur' : (i<curIdx ? 'done' : 'lock');
    const icon = passed ? '✅' : isCur ? '▶️' : (i<curIdx?'✅':'🔒');
    const num = i+1;
    return `<button class="lesson-card ${cls}" data-lesson="${i}">
      <div class="lesson-icon">${icon}</div>
      <div class="lesson-body">
        <div class="lesson-title">Lesson ${num}</div>
        <div class="lesson-sub">${prog} / ${ls.length} words · ${ls.length} คำ</div>
      </div>
      <div class="lesson-stars">${passed?'⭐':''}</div>
    </button>`;
  }).join('');

  const allDone = curIdx>=lessons.length;
  $('#play').innerHTML = `
    <div class="lesson-head">
      <div class="lesson-head-title">📚 Word Quiz · ${LV}</div>
      <div class="lesson-head-sub">${allDone
        ? '🎉 All lessons complete! เล่นซ้ำได้เลย'
        : 'Choose a lesson · เลือกบทเรียน'}</div>
    </div>
    <div class="lesson-list">${cards}</div>
    <div style="text-align:center;margin-top:12px">
      <button class="btn alt" onclick="goHome()">🏠 Home</button>
    </div>`;

  document.querySelectorAll('.lesson-card').forEach(b=>{
    b.onclick = () => {
      const idx = +b.dataset.lesson;
      // เล่นได้เฉพาะบทที่ปลดล็อค (ผ่านแล้ว หรือบทปัจจุบัน)
      if(idx > curIdx){ toast("🔒","Finish earlier lessons first"); return; }
      startQuizLesson(idx);
    };
  });
}

function startQuizLesson(lessonIdx){
  const lessons = lessonsFor(LV);
  const lessonWords = lessons[lessonIdx];
  if(!lessonWords){ return showLessonSelect(); }
  reviewMode = false; MODE = "quiz";
  score = 0; qi = 0;
  currentLesson = lessonIdx;
  queue = shuffle(lessonWords.slice()); total = queue.length;
  showScreen(); setScore(); nextQuiz();
}
let currentLesson = 0;

function startQuiz(useReview){
  reviewMode = !!useReview; MODE = useReview ? "review" : "quiz";
  score = 0; qi = 0;
  if (!useReview){
    // โหมดปกติ → ไปหน้าเลือกบทเรียน
    return showLessonSelect();
  }
  // Review mode → เล่นเฉพาะคำที่เคยตอบผิด
  const pool = SRS.wrongList(LV, wordsFiltered(LV));
  if (pool.length === 0){
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
  inActiveGame = true;
  setProg(qi/total*100);
  const word = queue[qi];
  const n = CHOICES[LV] || 4;
  const wrongs = shuffle(wordsFiltered(LV).filter(w=>w!==word)).slice(0, n-1);
  const choices = shuffle([word, ...wrongs]);
  // K1-K2: ไม่แสดงคำ เน้นฟัง / K3-P6: แสดงคำ + เสียง
  const showWord = !['K1','K2'].includes(LV);
  // K1-K3: มีปุ่มเสียงไทยกำกับช่วยให้เด็กเข้าใจความหมาย
  const thaiWord = thaiOf(LV, word);
  const hasThaiBtn = ['K1','K2','K3'].includes(LV) && thaiWord;
  const LABELS = ['A','B','C','D','E','F'];
  const BORDER_COLORS = ['#F5A300','#1FA39A','#E84A5F','#7B3FC4','#4E9A2E','#185FA5'];
  $('#play').innerHTML = `
    <div class="prompt">
      <div class="sound-btns">
        <button class="speak" id="sp" aria-label="Play word in English">🔊</button>
        ${hasThaiBtn
          ? `<button class="speak speak-th" id="spth" aria-label="ฟังคำแปลภาษาไทย">🇹🇭</button>`
          : ''}
      </div>
      ${showWord
        ? `<div class="wordbox-pill"><span class="word-display">${word}</span></div>`
        : `<p class="hint">Listen, then tap the right picture${reviewMode?' · Review':''}` }
    </div>
    <div class="opts n${n}" id="opts" role="group" aria-label="Answer choices">
      ${choices.map((c,i)=>`
        <button class="opt" data-w="${c}" tabindex="0" aria-label="${c}"
          style="--card-border:${BORDER_COLORS[i%BORDER_COLORS.length]}">
          <span class="opt-label">${LABELS[i]}</span>
          ${pic(LV,c,'oimg')}
        </button>`).join('')}
    </div>
    <div class="fb" id="fb" aria-live="assertive"></div>`;
  $('#sp').onclick = () => Audio2.speak(word);
  const spth = document.getElementById('spth');
  if(spth) spth.onclick = () => Audio2.speakThai(thaiWord);
  setTimeout(()=>Audio2.speak(word),350);
  bindOptions(word, nextQuiz);
}

/* Shared option handler (mouse + keyboard). [A11Y] */
function bindOptions(word, advance){
  wireImgFallback();   // ผูก image fallback ให้ตัวเลือกทั้งหมด
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
  MODE = "flashcard"; queue = shuffle(SRS.pickWeighted(LV, wordsFiltered(LV).length, wordsFiltered(LV))); qi = 0;
  showScreen(); renderFlash();
}
function renderFlash(){
  inActiveGame = true;
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
  wireImgFallback();
  fi.onclick = () => { fi.classList.toggle('flip');
    if (fi.classList.contains('flip')){ Audio2.speak(w); SRS.record(LV, w, true); } };
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

// Passing score per stage: stages 1-5 need 3/5 correct, stages 6-10 need 4/5.
// (stageIdx is 0-based, so 0-4 = stages 1-5, 5-9 = stages 6-10.)
function passMark(stageIdx){ return stageIdx < 5 ? 3 : 4; }

// Monster lineup. Last one is the boss. Pure emoji art — no assets needed.
const MONSTERS = [
  {e:"🐛", n:"Wiggly"},   {e:"🐌", n:"Snaily"},  {e:"🦗", n:"Hoppy"},
  {e:"🕷️", n:"Webby"},   {e:"🦂", n:"Pinchy"},  {e:"🐍", n:"Hissy"},
  {e:"🦇", n:"Flappy"},   {e:"👻", n:"Boo"},     {e:"🦖", n:"Rex"},
  {e:"🐉", n:"DRAGON BOSS"}
];

// Highest stage cleared for the CURRENT level (per-grade progress).
// Returns 0..10. A stage index i is unlocked if i <= clearedStages(LV).
function clearedStages(){ return (DB.advCleared && DB.advCleared[LV]) || 0; }
function setClearedStages(n){
  if (!DB.advCleared) DB.advCleared = {};
  // only ever increase — replaying an earlier stage can't lower progress
  if (n > (DB.advCleared[LV]||0)) { DB.advCleared[LV] = n; Store.save(DB); }
}

let advStage = 0;          // 0-based current stage index
let advHearts = 0;         // player hearts in current stage
let monHP = 0, monMax = 0; // monster hit points

function startAdventure(){ MODE = "adventure"; advStage = 0; renderAdvMap(); }

/* The world map: stages unlock one at a time. A stage is unlocked if its
   index <= the number of stages already cleared for this grade. Locked
   stages can't be tapped. Progress is saved per level (per grade). */
function renderAdvMap(){
  showScreen();
  const cleared = clearedStages();
  setProg(cleared/ADV_STAGES*100);
  $('#score').textContent = '🗺️ ' + cleared + '/' + ADV_STAGES + ' cleared · ' + LV;
  let nodes = '';
  for (let i=0;i<ADV_STAGES;i++){
    const m = MONSTERS[i];
    const isBoss = i===ADV_STAGES-1;
    const isDone = i < cleared;          // already beaten
    const isCurrent = i === cleared;     // the next one to play (unlocked)
    const isLocked = i > cleared;        // not reachable yet
    const state = isDone ? 'done' : isCurrent ? 'cur' : 'lock';
    const need = passMark(i);
    const right = isLocked ? '🔒' : (isDone ? '✅' : m.e);
    nodes += `<button class="advnode ${state} ${isBoss?'boss':''}" data-i="${i}" ${isLocked?'disabled':''}>
      <span class="num">${i+1}</span>
      <span style="flex:1;text-align:left">
        <span style="font-weight:700">${isBoss?'BOSS · ':''}${m.n}</span>
        <span class="advneed">pass ${need}/5</span>
      </span>
      <span style="font-size:1.6rem">${right}</span></button>`;
  }
  const allDone = cleared >= ADV_STAGES;
  $('#play').innerHTML = `<p class="hint" style="text-align:center;margin-bottom:8px">
      ${allDone ? '🎉 You cleared all 10 stages!' : 'Beat each monster to unlock the next stage!'}</p>
    <div class="advmap">${nodes}</div>`;
  document.querySelectorAll('.advnode').forEach(nd=>{
    if (nd.disabled) return;             // locked stages do nothing
    nd.onclick = () => startBattle(parseInt(nd.dataset.i,10));
  });
}

/* Begin a single monster battle. */
function startBattle(stageIdx){
  advStage = stageIdx;
  score = 0; qi = 0; total = ADV_WORDS_PER;
  advHearts = ADV_START_HEARTS;
  // Monster HP equals the pass mark, so emptying its HP bar = clearing the
  // stage (3 correct on stages 1-5, 4 correct on stages 6-10).
  monMax = passMark(stageIdx); monHP = monMax;
  queue = shuffle(SRS.pickWeighted(LV, ADV_WORDS_PER, wordsFiltered(LV)));
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
  inActiveGame = true;
  // The battle runs through all 5 words (monster HP is visual only).
  // Out of hearts ends early. Pass/fail is judged on correct count at the end.
  if (advHearts<=0){ return battleEnd(); }
  if (qi>=total){ return battleEnd(); }
  setProg(advStage/ADV_STAGES*100 + (qi/total)*(100/ADV_STAGES));
  const word = queue[qi]; const n = CHOICES[LV] || 4;
  const wrongs = shuffle(wordsFiltered(LV).filter(w=>w!==word)).slice(0, n-1);
  const choices = shuffle([word, ...wrongs]);
  $('#score').textContent = '⚔️ Stage ' + (advStage+1) + '/' + ADV_STAGES;

  /* ── REVERSE QUIZ ──────────────────────────────────────────
     แสดงภาพตรงกลาง → เลือกคำ (text) ที่ถูกต้อง
     ไม่เปิดเสียงอัตโนมัติ — ปุ่ม 🔊 เป็น hint ถ้าไม่แน่ใจ
  ─────────────────────────────────────────────────────────── */
  const BORDER_COLORS = ['#F5A300','#1FA39A','#E84A5F','#7B3FC4','#4E9A2E','#185FA5'];
  $('#play').innerHTML = battleBar() + `
    <div class="prompt">
      ${pic(LV, word, 'wordimg')}
      <button class="speak speak-hint" id="sp" aria-label="Hint: play sound">🔊 <span class="hint-label">Hint</span></button>
      <p class="hint">What is this? · นี่คืออะไร?</p>
    </div>
    <div class="opts n${n} word-opts" role="group">
      ${choices.map((c,i)=>`
        <button class="opt word-opt" data-w="${c}" tabindex="0" aria-label="${c}"
          style="--card-border:${BORDER_COLORS[i%BORDER_COLORS.length]}">
          <span class="word-opt-label">${c}</span>
        </button>`).join('')}
    </div>
    <div class="fb" id="fb" aria-live="assertive"></div>`;
  $('#sp').onclick = () => Audio2.speak(word);
  /* ไม่มี auto-play — เด็กต้องดูภาพก่อน กด hint ถ้าไม่แน่ใจ */
  wireImgFallback();
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
    el.classList.add('right'); score++; monHP=Math.max(0,monHP-1); Audio2.good(); Audio2.speak(word);
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

function battleEnd(){
  inActiveGame = false;
  const isBoss = advStage===ADV_STAGES-1;
  const need = passMark(advStage);          // 3 (stages 1-5) or 4 (stages 6-10)
  const passed = score >= need;
  // Record the round either way (counts toward stars/streak/mastery).
  Gamify.recordRound("adventure", LV, score, total); afterRound();

  if (passed){
    // Unlock the next stage for THIS grade.
    setClearedStages(advStage+1);
    FX.confetti(isBoss?200:90); Audio2.win();
    const wasLast = advStage>=ADV_STAGES-1;
    const nextIdx = advStage+1;
    $('#play').innerHTML = `<div class="done">
      <div class="trophy">${isBoss?'👑':'⚔️'}</div>
      <h2>${isBoss?'BOSS DEFEATED!':'Stage cleared!'}</h2>
      <div class="res">${MONSTERS[advStage].e} ${MONSTERS[advStage].n} beaten · ${score}/${total} correct · +${score} ⭐</div>
      ${wasLast
        ? `<p class="hint" style="margin-bottom:10px">You cleared all 10 stages! 🎉</p>
           <button class="btn" onclick="startAdventure()">🔁 Play Again</button>`
        : `<button class="btn" id="nextStage">➡️ Next Stage</button>
           <button class="btn alt" onclick="renderAdvMap()">🗺️ Map</button>`}
      <button class="btn alt" onclick="goHome()">🏠 Home</button></div>`;
    const ns=document.getElementById('nextStage');
    if (ns) ns.onclick=()=>startBattle(nextIdx);
  } else {
    // Did not reach the pass mark — must retry this stage.
    Audio2.bad();
    const reason = advHearts<=0 ? 'Out of hearts!' : 'Almost there!';
    $('#play').innerHTML = `<div class="done">
      <div class="trophy">💔</div><h2>${reason}</h2>
      <div class="res">You got ${score}/${total}. You need ${need}/${total} to pass this stage.</div>
      <button class="btn" id="retry">🔄 Try Again</button>
      <button class="btn alt" onclick="renderAdvMap()">🗺️ Map</button>
      <button class="btn alt" onclick="goHome()">🏠 Home</button></div>`;
    document.getElementById('retry').onclick=()=>startBattle(advStage);
  }
}

/* ============================================================
   MODE 4 · MEMORY MATCH — pair word card with picture card
   ============================================================ */
let memFlipped = [], memLock = false, memPairs = 0;
function startMemory(){
  MODE = "memory"; inActiveGame = true; memFlipped = []; memLock = false;
  const pool = shuffle(SRS.pickWeighted(LV, 6, wordsFiltered(LV))); memPairs = pool.length;
  let deck = [];
  pool.forEach(w => { deck.push({w,type:'word'}); deck.push({w,type:'pic'}); });
  deck = shuffle(deck);
  showScreen(); setProg(0); $('#score').textContent = '🧠 0/' + memPairs;
  // คอลัมน์ปรับตามจำนวนใบ — CSS จัดการ responsive เอง
  $('#play').innerHTML = `<p class="hint" style="text-align:center;margin-bottom:8px">Match each word with its picture!</p>
    <div class="memgrid" id="memgrid"></div>`;
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
  wireImgFallback();
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
      SRS.record(LV, a.dataset.w, true);   // จับคู่ถูก = learned + correct
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
   MODE 5 · SPELLING ADVENTURE
   10 stages × 5 words. See the picture + hear the word, then
   tap scrambled letter tiles to spell it correctly.
   Stage 1-5: short words (≤5 letters), pass mark 3/5.
   Stage 6-10: any length, pass mark 4/5.
   Progress saved per level in DB.spellCleared (same pattern as advCleared).
   ============================================================ */
const SPELL_STAGES = 10, SPELL_PER = 5;
function spellPass(idx){ return idx < 5 ? 3 : 4; }
function spellCleared(){ return (DB.spellCleared && DB.spellCleared[LV]) || 0; }
function setSpellCleared(n){
  if (!DB.spellCleared) DB.spellCleared = {};
  if (n > (DB.spellCleared[LV]||0)){ DB.spellCleared[LV] = n; Store.save(DB); }
}

let spellStage=0, spellScore=0, spellQi=0, spellQueue=[], spellHearts=0;
let spellWord='', spellChosen=[], spellTiles=[];

function startSpelling(){ MODE="spelling"; spellStage=0; renderSpellMap(); }

function renderSpellMap(){
  inActiveGame = false;
  showScreen();
  const cleared = spellCleared();
  setProg(cleared/SPELL_STAGES*100);
  $('#score').textContent = '✏️ ' + cleared + '/' + SPELL_STAGES + ' · ' + LV;
  let nodes='';
  for(let i=0;i<SPELL_STAGES;i++){
    const m=MONSTERS[i], isBoss=i===SPELL_STAGES-1;
    const isDone=i<cleared, isCur=i===cleared, isLock=i>cleared;
    const state=isDone?'done':isCur?'cur':'lock';
    const need=spellPass(i);
    nodes+=`<button class="advnode ${state} ${isBoss?'boss':''}" data-i="${i}" ${isLock?'disabled':''}>
      <span class="num">${i+1}</span>
      <span style="flex:1;text-align:left">
        <span style="font-weight:700">${isBoss?'BOSS · ':''}${m.n}</span>
        <span class="advneed">pass ${need}/5 · spell it!</span>
      </span>
      <span style="font-size:1.6rem">${isLock?'🔒':isDone?'✅':m.e}</span></button>`;
  }
  $('#play').innerHTML=`<p class="hint" style="text-align:center;margin-bottom:8px">
    Spell the word to defeat each monster!</p>
    <div class="advmap">${nodes}</div>`;
  document.querySelectorAll('.advnode').forEach(nd=>{
    if(nd.disabled)return;
    nd.onclick=()=>startSpellBattle(parseInt(nd.dataset.i,10));
  });
}

/* Pick words appropriate for the stage difficulty */
function spellWordsForStage(stageIdx){
  const all = wordsFiltered(LV);
  // stages 1-5: prefer shorter words
  const short = all.filter(w => w.replace(/\s/g,'').length <= 5);
  const pool = stageIdx < 5
    ? (short.length >= SPELL_PER ? short : all)
    : all;
  return SRS.pickWeighted(LV, SPELL_PER, pool);
}

function startSpellBattle(idx){
  spellStage=idx; spellScore=0; spellQi=0; spellHearts=3;
  spellQueue = spellWordsForStage(idx);
  nextSpellWord();
}

function nextSpellWord(){
  inActiveGame = true;
  if(spellHearts<=0||spellQi>=SPELL_PER) return spellBattleEnd();
  setProg(spellStage/SPELL_STAGES*100+(spellQi/SPELL_PER)*(100/SPELL_STAGES));
  spellWord = spellQueue[spellQi];
  spellChosen = [];
  // Scramble letters (no spaces — join multi-word as one spelling challenge)
  const letters = spellWord.toLowerCase().replace(/\s/g,'').split('');
  // shuffle with at least 1 change if >2 letters
  spellTiles = shuffle([...letters]);
  if(letters.length>2 && spellTiles.join('')===letters.join('')) spellTiles = shuffle(spellTiles);
  const hearts='❤️'.repeat(spellHearts)+'🤍'.repeat(3-spellHearts);
  const m=MONSTERS[spellStage], isBoss=spellStage===SPELL_STAGES-1;
  const hp=Math.max(0,Math.round((spellPass(spellStage)-spellScore)/spellPass(spellStage)*100));
  $('#score').textContent='✏️ Stage '+(spellStage+1)+'/'+SPELL_STAGES;
  $('#play').innerHTML=`
    <div class="battle">
      <div class="mon ${isBoss?'bossmon':''}" id="mon">
        <div class="mon-emoji">${m.e}</div>
        <div class="mon-name">${isBoss?'⚔️ ':''}${m.n}</div>
        <div class="hpbar"><div id="monHP" style="width:${hp}%"></div></div>
      </div>
      <div class="hearts">${hearts}</div>
    </div>
    <div class="spellprompt">
      ${pic(LV,spellWord,'wordimg')}
      <button class="speak" id="sp" style="margin-top:8px" aria-label="Play sound">🔊</button>
    </div>
    <div class="spellanswer" id="spellanswer">
      ${spellWord.replace(/\s/g,'').split('').map((_,i)=>`<div class="spellabox" id="sa${i}"></div>`).join('')}
    </div>
    <div class="spelltiles" id="spelltiles">
      ${spellTiles.map((l,i)=>`<button class="spelltile" id="st${i}" data-i="${i}" data-l="${l}">${l.toUpperCase()}</button>`).join('')}
    </div>
    <div style="text-align:center;margin-top:8px">
      <button class="btn alt" id="spellclear" style="padding:8px 18px;font-size:.95rem">↩ Clear</button>
    </div>
    <div class="fb" id="fb" aria-live="assertive"></div>`;
  $('#sp').onclick=()=>Audio2.speak(spellWord);
  wireImgFallback();
  setTimeout(()=>Audio2.speak(spellWord),300);
  document.querySelectorAll('.spelltile').forEach(t=>t.onclick=()=>tapTile(t));
  $('#spellclear').onclick=()=>clearSpell();
}

function tapTile(t){
  if(t.classList.contains('used'))return;
  const l=t.dataset.l, i=parseInt(t.dataset.i,10);
  spellChosen.push({l,i});
  t.classList.add('used');
  // fill next empty answer box
  const idx=spellChosen.length-1;
  const box=document.getElementById('sa'+idx);
  if(box){ box.textContent=l.toUpperCase(); box.classList.add('filled'); }
  // auto-check when all boxes filled
  const target=spellWord.replace(/\s/g,'');
  if(spellChosen.length>=target.length) checkSpell();
}

function clearSpell(){
  spellChosen=[];
  document.querySelectorAll('.spelltile').forEach(t=>t.classList.remove('used'));
  document.querySelectorAll('.spellabox').forEach(b=>{ b.textContent=''; b.classList.remove('filled','correct','wrong'); });
  $('#fb').textContent='';
}

function checkSpell(){
  const target=spellWord.replace(/\s/g,'').toLowerCase();
  const attempt=spellChosen.map(c=>c.l).join('').toLowerCase();
  const ok=attempt===target;
  SRS.record(LV,spellWord,ok);
  document.querySelectorAll('.spellabox').forEach(b=>b.classList.add(ok?'correct':'wrong'));
  document.querySelectorAll('.spelltile').forEach(t=>t.style.pointerEvents='none');
  document.getElementById('spellclear').style.pointerEvents='none';
  const monEl=document.getElementById('mon');
  if(ok){
    spellScore++; Audio2.good(); Audio2.speak(spellWord);
    if(monEl){ monEl.classList.add('mon-hurt'); setTimeout(()=>monEl.classList.remove('mon-hurt'),400); }
    $('#fb').textContent='🎉 '+praise(); $('#fb').style.color='var(--grass)';
    const r=document.getElementById('spellanswer').getBoundingClientRect();
    for(let i=0;i<5;i++) setTimeout(()=>FX.star(r.left+r.width/2+(Math.random()-.5)*60,r.top),i*80);
  } else {
    spellHearts--; Audio2.hit();
    if(monEl){ monEl.classList.add('mon-attack'); setTimeout(()=>monEl.classList.remove('mon-attack'),400); }
    $('#fb').textContent='💪 It\'s: '+spellWord.toUpperCase(); $('#fb').style.color='var(--coral)';
  }
  spellQi++;
  setTimeout(nextSpellWord,1400);
}

function spellBattleEnd(){
  inActiveGame = false;
  const need=spellPass(spellStage), isBoss=spellStage===SPELL_STAGES-1;
  const passed=spellScore>=need;
  Gamify.recordRound("spelling",LV,spellScore,SPELL_PER); afterRound();
  if(passed){
    setSpellCleared(spellStage+1);
    FX.confetti(isBoss?200:90); Audio2.win();
    const wasLast=spellStage>=SPELL_STAGES-1;
    const nextIdx=spellStage+1;
    $('#play').innerHTML=`<div class="done">
      <div class="trophy">${isBoss?'👑':'✏️'}</div>
      <h2>${isBoss?'BOSS DEFEATED!':'Stage cleared!'}</h2>
      <div class="res">${MONSTERS[spellStage].e} defeated · ${spellScore}/${SPELL_PER} correct · +${spellScore} ⭐</div>
      ${wasLast
        ?`<p class="hint" style="margin-bottom:10px">All 10 spelling stages cleared! 🎉</p>
          <button class="btn" onclick="startSpelling()">🔁 Play Again</button>`
        :`<button class="btn" id="nextSp">➡️ Next Stage</button>
          <button class="btn alt" onclick="renderSpellMap()">🗺️ Map</button>`}
      <button class="btn alt" onclick="goHome()">🏠 Home</button></div>`;
    const ns=document.getElementById('nextSp');
    if(ns) ns.onclick=()=>startSpellBattle(nextIdx);
  } else {
    Audio2.bad();
    $('#play').innerHTML=`<div class="done">
      <div class="trophy">💔</div><h2>${spellHearts<=0?'Out of hearts!':'Almost!'}</h2>
      <div class="res">You spelled ${spellScore}/${SPELL_PER}. Need ${need}/${SPELL_PER} to pass.</div>
      <button class="btn" id="retrySp">🔄 Try Again</button>
      <button class="btn alt" onclick="renderSpellMap()">🗺️ Map</button>
      <button class="btn alt" onclick="goHome()">🏠 Home</button></div>`;
    document.getElementById('retrySp').onclick=()=>startSpellBattle(spellStage);
  }
}


function finishRound(silent){
  inActiveGame = false;
  setProg(100);
  if (silent){ // flashcards: friendly end card, no scoring
    Gamify.recordRound(MODE, LV, 0, 0); afterRound();
    $('#play').innerHTML = `<div class="done"><div class="trophy">🃏</div>
      <h2>All done!</h2><p class="res">You reviewed every card.</p>
      <button class="btn" onclick="startFlash()">🔄 New Round · เล่นรอบใหม่</button>
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
  // ปุ่มท้ายเกม — quiz mode มีปุ่มบทต่อไป + เลือกบท
  let extraBtns = '';
  if (MODE === 'quiz'){
    const lessons = lessonsFor(LV);
    const hasNext = currentLesson+1 < lessons.length;
    extraBtns = hasNext
      ? `<button class="btn" id="nextLesson">➡️ Next Lesson · บทถัดไป</button>
         <button class="btn" id="again">🔄 Play Again · เล่นอีกครั้ง</button>
         <button class="btn alt" id="lessonMenu">📖 Lessons</button>`
      : `<button class="btn" id="again">🔄 Play Again · เล่นอีกครั้ง</button>
         <button class="btn alt" id="lessonMenu">📖 Lessons</button>`;
  } else {
    // Memory, Adventure, Spelling — ปุ่มเล่นต่อชัดเจน
    const modeLabel = MODE==='memory' ? '🧠 New Round · รอบใหม่'
                    : MODE==='adventure' ? '⚔️ Play Again · เล่นอีกครั้ง'
                    : '🔄 New Round · รอบใหม่';
    extraBtns = `<button class="btn" id="again">${modeLabel}</button>`;
  }
  $('#play').innerHTML = `<div class="done">
    <div class="trophy">🏆</div><h2>${msg}</h2>
    <div class="starline">${[...stars].map((s,i)=>`<span style="animation-delay:${i*.15}s">${s}</span>`).join('')}</div>
    <div class="res">Score: ${score} / ${max} · +${starsEarned+score} ⭐</div>
    ${extraBtns}
    <button class="btn alt" id="viewBoard">🏆 Top 10</button>
    <button class="btn alt" onclick="goHome()">🏠 Home</button></div>`;
  const againBtn = document.getElementById('again');
  if (againBtn) againBtn.onclick = () => routeGame(MODE);
  const nextBtn = document.getElementById('nextLesson');
  if (nextBtn) nextBtn.onclick = () => startQuizLesson(currentLesson+1);
  const menuBtn = document.getElementById('lessonMenu');
  if (menuBtn) menuBtn.onclick = () => showLessonSelect();
  const vb = document.getElementById('viewBoard');
  if (vb) vb.onclick = () => showLeaderboard();
  // ถ้าคะแนนติด Top 10 → เด้งกรอกชื่อ
  maybeShowNameEntry(starsEarned + score, null);
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
  $('#dashMastery').innerHTML = wordsFiltered(LV).map(w=>{
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
/* ---------- Month pills — เลือกเดือน (ล็อคเดือนที่ยังไม่มีคำ) ---------- */
function buildMonthPills(){
  const box = document.getElementById('months');
  if(!box) return;
  box.innerHTML = ALL_MONTHS.map(m=>{
    const has = monthHasData(m.key);
    const on = m.key === MONTH ? 'on' : '';
    const lock = has ? '' : 'locked';
    return `<button class="mpill ${on} ${lock}" data-m="${m.key}"
      role="tab" aria-selected="${m.key===MONTH}" ${has?'':'aria-disabled="true"'}>
      ${m.label}${has?'':' 🔒'}</button>`;
  }).join('');
  box.querySelectorAll('.mpill').forEach(b=>{
    b.onclick = () => {
      const mk = b.dataset.m;
      if(!monthHasData(mk)){ toast("🔒","Coming soon! · เร็วๆ นี้"); return; }
      setMonth(mk);
      box.querySelectorAll('.mpill').forEach(x=>{ x.classList.remove('on'); x.setAttribute('aria-selected','false'); });
      b.classList.add('on'); b.setAttribute('aria-selected','true');
      SUBJECT_FILTER = "All";
      updateSubjectBar();
      refreshHero();               // อัปเดต progress ของเดือนใหม่
      preloadLevelImages(LV);      // โหลดภาพเดือน/ระดับใหม่
    };
  });
}

function buildLevelPills(){
  const box = $('#levels');
  box.innerHTML = LEVELS.map((lv,i)=>{
    const on = i===0 ? 'on' : '';
    const sel = i===0 ? 'true' : 'false';
    return `<button class="pill ${on}" data-lv="${lv}" role="tab" aria-selected="${sel}">
      ${lv}<span class="cefr-tag">${CEFR_MAP[lv]||''}</span></button>`;
  }).join('');
  box.querySelectorAll('.pill').forEach(b=> b.onclick = () => pickLevel(b));
}
function pickLevel(b){
  const lv = b.dataset.lv;
  document.querySelectorAll('.pill').forEach(p=>{ p.classList.remove('on'); p.setAttribute('aria-selected','false'); });
  b.classList.add('on'); b.setAttribute('aria-selected','true'); LV = lv;
  // Reset subject filter when switching level, then show/hide bar.
  SUBJECT_FILTER = "All";
  updateSubjectBar();
  refreshHero();   // อัปเดต CEFR badge + words mastered ทันที
  preloadLevelImages(lv);   // โหลดภาพล่วงหน้า กันภาพ delay ตอนเล่น
}

/* Build and show subject filter bar for P1; hide for other levels. */
function updateSubjectBar(){
  const bar = document.getElementById('subjectBar');
  const pillBox = document.getElementById('subjectPills');
  if (LV !== "P1"){ bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  const subjects = ["All", ...P1_SUBJECTS];
  pillBox.innerHTML = subjects.map(s =>
    `<button class="spill ${SUBJECT_FILTER===s?'on':''}" data-s="${s}" role="tab"
      aria-selected="${SUBJECT_FILTER===s}">${s==="All"?"🌐 All":s}</button>`
  ).join('');
  pillBox.querySelectorAll('.spill').forEach(p => p.onclick = () => {
    SUBJECT_FILTER = p.dataset.s;
    updateSubjectBar();   // re-render pills with new selection
  });
}
function routeGame(g){
  // Word Detective ใช้ข้อมูลแยก (clues.json) ไม่ต้องเช็ค vocabulary เดือน/ระดับ
  if (g === 'detective'){
    showScreen();
    // แสดง loading ทันทีระหว่างรอโหลดข้อมูล
    $('#score').textContent = '🔍 Word Detective';
    $('#play').innerHTML = `<div style="text-align:center;padding:60px 20px">
      <div style="font-size:3rem;margin-bottom:12px;animation:questyIdle 2s ease-in-out infinite">🔍</div>
      <div style="font-family:'Baloo 2';font-weight:700;font-size:1.3rem;color:var(--ink)">Loading Word Detective...</div>
      <div style="font-size:1rem;color:var(--muted);margin-top:6px">กำลังโหลดเบาะแส...</div>
    </div>`;
    loadClues().then(()=>{
      showDetectiveSelect();
    }).catch(()=>{
      $('#play').innerHTML = `<div style="text-align:center;padding:40px">
        <p style="font-size:1.2rem;color:var(--ink)">❌ Cannot load clues</p>
        <button class="btn alt" onclick="goHome()">🏠 Home</button>
      </div>`;
    });
    return;
  }
  // เกมอื่น — เช็คว่ามีคำในเดือน/ระดับที่เลือก
  const filtered = wordsFiltered(LV);
  if (!filtered.length){
    toast("📭", LV==="P1"
      ? `No words for P1 · ${SUBJECT_FILTER} this month.`
      : `No words for ${LV} this month.`);
    return;
  }
  if (LV==="K1" && !sessionInstShown[g]){ sessionInstShown[g]=true; return showK1Instructions(g); }
  ({ quiz:()=>startQuiz(false), review:()=>startQuiz(true), flashcard:startFlash,
     adventure:startAdventure, memory:startMemory, spelling:startSpelling }[g] || (()=>{}))();
}

/* ---- Bilingual (EN/TH) instructions for the youngest learners (K1) ---- */
const sessionInstShown = {};   // show once per game per session
const K1_INSTRUCTIONS = {
  quiz:      {en:"Listen to the word, then tap the matching picture.", th:"ฟังเสียงคำ แล้วแตะรูปที่ตรงกัน",  ico:"🔊", color:"#E84A5F", name:"Word Quiz"},
  flashcard: {en:"Tap the card to flip it and hear the word.",        th:"แตะการ์ดเพื่อพลิกดูคำและฟังเสียง", ico:"🃏", color:"#1FA39A", name:"Flashcards"},
  adventure: {en:"Beat monsters! Tap the right word to attack.",      th:"สู้มอนสเตอร์! แตะคำที่ถูกเพื่อโจมตี", ico:"🗺️", color:"#F5A300", name:"Adventure"},
  memory:    {en:"Find the word and its picture pair.",               th:"จับคู่คำกับรูปภาพให้ตรงกัน",        ico:"🧠", color:"#7B3FC4", name:"Memory"},
  review:    {en:"Practise the words you missed before.",             th:"ฝึกคำที่เคยตอบผิด",                ico:"🔁", color:"#4E9A2E", name:"Review"},
  spelling:  {en:"See the picture, then tap letters to spell the word.", th:"ดูภาพแล้วแตะตัวอักษรเรียงสะกดคำ", ico:"✏️", color:"#FF6840", name:"Spelling"}
};
function showK1Instructions(g){
  const ins = K1_INSTRUCTIONS[g] || K1_INSTRUCTIONS.quiz;
  showScreen();
  $('#score').textContent = '🎈 K1';
  setProg(0);
  $('#play').innerHTML = `<div class="howto">
    <div class="howto-card" style="--howto-color:${ins.color}">
      <div class="howto-ico">${ins.ico}</div>
      <div class="howto-title">${ins.name}</div>
      <p class="howto-en">${ins.en}</p>
      <p class="howto-th">${ins.th}</p>
      <div class="howto-buttons">
        <button class="btn" id="startNow">▶️ Start / เริ่มเลย</button>
        <button class="btn alt" onclick="goHome()">🏠 Home</button>
      </div>
      <img class="howto-mascot" src="assets/questy.png" alt=""
        onerror="this.remove()">
    </div></div>`;
  document.getElementById('startNow').onclick = () => {
    ({ quiz:()=>startQuiz(false), review:()=>startQuiz(true), flashcard:startFlash,
       adventure:startAdventure, memory:startMemory, spelling:startSpelling }[g] || (()=>{}))();
  };
}

async function boot(){
  try { await loadVocabulary(); }
  catch(e){
    document.getElementById('home').innerHTML =
      `<div style="padding:30px;text-align:center;color:#fff">
       <div style="font-size:3rem">⚠️</div>
       <h2 style="margin:8px 0;font-family:'Baloo 2'">Could not load words</h2>
       <p style="font-size:.9rem;opacity:.65;margin-top:6px">${e.message}</p>
       <p style="font-size:.8rem;opacity:.45;margin-top:8px">Serve over http(s) — GitHub Pages or local server</p></div>`;
    return;
  }
  buildMonthPills();
  buildLevelPills();
  updateSubjectBar();
  document.querySelectorAll('.card').forEach(c=> c.onclick = () => routeGame(c.dataset.game));
  const detBtn = document.getElementById('detBannerBtn');
  if(detBtn) detBtn.onclick = () => routeGame('detective');
  $('#back').onclick = confirmExit;
  const nh = document.getElementById('navHome'); if(nh) nh.onclick = goHome;
  $('#navDash').onclick = openDash;
  $('#dashBack').onclick = goHome;
  $('#resetBtn').onclick = () => {
    if (confirm('Erase all stars, badges and progress?')){
      DB = Store.reset(); refreshChips(); refreshLocks(); renderDash(); toast("🗑️","Progress reset");
    }
  };
  Gamify.touchStreak();
  Gamify.checkAchievements(a=>{});
  refreshChips(); refreshLocks();
  preloadLevelImages(LV);
  // Questy entrance animation ตอนโหลดครั้งแรก
  setTimeout(()=>{
    const q = document.querySelector('.questy-hero, .questy-fallback');
    if(q){ q.classList.add('questy-entrance');
      setTimeout(()=>q.classList.remove('questy-entrance'), 800); }
  }, 400);
  startQuestyIdle();
  MusicPlayer.init();   // เริ่มระบบเพลง
}
document.addEventListener('DOMContentLoaded', boot);

/* ============================================================
   MUSIC PLAYER — Starlight Quest background music
   - ไม่ auto-play (Browser policy) รอ interaction แรก
   - fade in/out ตาม home ↔ เกม
   - จำค่าเปิด/ปิดไว้ใน localStorage
   ============================================================ */
const MusicPlayer = (function(){
  let audio = null;
  let pref  = false;   // default ปิด รอให้เด็กกดเอง
  let ready = false;   // audio object สร้างแล้วไหม
  let fading = false;

  function init(){
    // อ่าน preference ที่บันทึกไว้
    pref = localStorage.getItem('cvn_music') === 'on';
    updateBtn();

    // สร้าง audio object
    audio = new Audio("assets/Fox_s_Adventure_Begins.mp3");
    audio.loop   = true;
    audio.volume = 0;
    ready = true;

    // ถ้าเคยเปิดไว้ → รอ interaction แรกแล้วเล่นเลย
    const tryAutoPlay = () => {
      if(pref){ fadeIn(); }
      document.removeEventListener('click', tryAutoPlay);
    };
    document.addEventListener('click', tryAutoPlay, { once: true });

    // ปุ่ม toggle
    const btn = document.getElementById('musicBtn');
    if(btn) btn.onclick = (e) => { e.stopPropagation(); toggle(); };
  }

  let fadeTimer = null;

  function toggle(){
    if(!ready) return;
    // cancel any ongoing fade first
    if(fadeTimer){ clearInterval(fadeTimer); fadeTimer=null; fading=false; }
    if(audio.paused){ pref=true; fadeIn(); }
    else             { pref=false; forceStop(); }
    localStorage.setItem('cvn_music', pref ? 'on' : 'off');
  }

  function forceStop(){
    if(fadeTimer){ clearInterval(fadeTimer); fadeTimer=null; }
    fading=false;
    audio.pause();
    audio.volume=0;
    updateBtn();
  }

  function fadeIn(){
    if(!ready || fading) return;
    if(!audio.paused && audio.volume >= 0.35) return;
    fading = true;
    audio.volume = 0;
    audio.play().catch(()=>{ fading=false; });
    fadeTimer = setInterval(()=>{
      if(audio.volume < 0.35){
        audio.volume = Math.min(0.35, audio.volume + 0.025);
      } else {
        clearInterval(fadeTimer); fadeTimer=null; fading = false; updateBtn();
      }
    }, 40);
  }

  function fadeOut(cb){
    if(!ready || audio.paused){ if(cb) cb(); updateBtn(); return; }
    if(fadeTimer){ clearInterval(fadeTimer); fadeTimer=null; }
    fading = true;
    fadeTimer = setInterval(()=>{
      if(audio.volume > 0.025){
        audio.volume = Math.max(0, audio.volume - 0.025);
      } else {
        clearInterval(fadeTimer); fadeTimer=null;
        audio.pause();
        audio.volume = 0;
        fading = false;
        updateBtn();
        if(cb) cb();
      }
    }, 40);
  }

  function updateBtn(){
    const btn = document.getElementById('musicBtn');
    if(!btn) return;
    const on = ready && !audio.paused;
    btn.textContent = on ? '🔊' : '🔇';
    btn.classList.toggle('music-on', on);
    btn.title = on ? 'Music ON — click to mute' : 'Music OFF — click to play';
  }

  return { init, fadeIn, fadeOut, toggle, updateBtn };
})();

/* ============================================================
   ARCADE LEADERBOARD — Top 10 ต่อเครื่อง (localStorage)
   - ไม่เก็บข้อมูลส่วนตัว แค่ชื่อเล่นสั้นๆ ในเครื่องนั้น
   - แยกตามเดือน+ระดับ เช่น Top 10 ของ July K1
   ============================================================ */
const Leaderboard = (function(){
  const KEY = "cvnLeaderboard.v1";

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch(e){ return {}; }
  }
  function save(d){
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch(e){}
  }
  function boardKey(){ return MONTH + "::" + LV; }

  /* คะแนนติด Top 10 ไหม */
  function qualifies(score){
    if (score <= 0) return false;
    const board = load()[boardKey()] || [];
    if (board.length < 10) return true;
    return score > board[board.length-1].score;
  }

  /* เพิ่มคะแนน คืนอันดับ (1-based) */
  function add(name, score){
    const d = load();
    const k = boardKey();
    if (!d[k]) d[k] = [];
    d[k].push({ name: name.slice(0,10), score, date: new Date().toISOString().slice(0,10) });
    d[k].sort((a,b)=> b.score - a.score);
    d[k] = d[k].slice(0,10);
    save(d);
    return d[k].findIndex(e => e.name===name.slice(0,10) && e.score===score) + 1;
  }

  function top(){ return load()[boardKey()] || []; }
  function clearAll(){ save({}); }

  return { qualifies, add, top, clearAll };
})();

/* หน้าจอกรอกชื่อเมื่อคะแนนติด Top 10 — เรียกจาก finishRound */
function maybeShowNameEntry(score, thenShow){
  if (!Leaderboard.qualifies(score)){ if(thenShow) thenShow(); return; }
  const old = document.getElementById('nameDialog'); if(old) old.remove();
  const dlg = document.createElement('div');
  dlg.id = 'nameDialog';
  dlg.className = 'exit-overlay';
  dlg.innerHTML = `
    <div class="exit-box">
      <div class="exit-emoji">🏆</div>
      <div class="exit-title">Top 10! Enter your name</div>
      <div class="exit-sub">ติดอันดับ! ใส่ชื่อเล่น (ไม่เกิน 10 ตัว)</div>
      <input class="name-input" id="lbName" maxlength="10"
        placeholder="Your name · ชื่อเล่น" autocomplete="off">
      <div class="exit-btns">
        <button class="btn" id="lbSave">✓ Save</button>
        <button class="btn alt" id="lbSkip">Skip</button>
      </div>
    </div>`;
  document.body.appendChild(dlg);
  const input = document.getElementById('lbName');
  input.focus();
  const done = () => { dlg.remove(); showLeaderboard(); };
  document.getElementById('lbSave').onclick = () => {
    const name = (input.value || 'Player').trim() || 'Player';
    Leaderboard.add(name, score);
    done();
  };
  document.getElementById('lbSkip').onclick = () => { dlg.remove(); if(thenShow) thenShow(); };
  input.onkeydown = e => { if(e.key==='Enter') document.getElementById('lbSave').click(); };
}

/* หน้าแสดง Top 10 */
function showLeaderboard(){
  const board = Leaderboard.top();
  showScreen();
  $('#score').textContent = '🏆 ' + monthLabel(MONTH) + ' ' + LV;
  setProg(100);
  const medals = ['🥇','🥈','🥉'];
  const rows = board.length
    ? board.map((e,i)=>`
        <div class="lb-row ${i<3?'lb-top':''}">
          <div class="lb-rank">${medals[i]||(i+1)}</div>
          <div class="lb-name">${e.name}</div>
          <div class="lb-score">⭐ ${e.score}</div>
        </div>`).join('')
    : `<p class="hint" style="text-align:center;padding:20px">
        No scores yet — be the first! 🚀<br>ยังไม่มีคะแนน มาเป็นคนแรกกัน!</p>`;
  // ปุ่มเล่นต่อตาม mode ที่เพิ่งเล่น
  const playLabel = MODE==='quiz' ? '📖 Play Again · เล่นอีกครั้ง'
    : MODE==='memory' ? '🧠 New Round · รอบใหม่'
    : MODE==='adventure' ? '⚔️ Play Again · เล่นอีกครั้ง'
    : MODE==='spelling' ? '✏️ Play Again · เล่นอีกครั้ง'
    : MODE==='detective' ? '🔍 Continue · เล่นต่อ'
    : '🔄 Play Again · เล่นอีกครั้ง';
  $('#play').innerHTML = `
    <div class="lesson-head">
      <div class="lesson-head-title">🏆 Leaderboard</div>
      <div class="lesson-head-sub">Top 10 · ${monthLabel(MONTH)} ${LV} · this device</div>
    </div>
    <div class="lb-list">${rows}</div>
    <div style="text-align:center;margin-top:14px">
      <button class="btn" id="lbPlayAgain">${playLabel}</button>
      <button class="btn alt" onclick="goHome()">🏠 Home</button>
    </div>`;
  document.getElementById('lbPlayAgain').onclick = () => {
    if(MODE==='detective' && detectiveData){ showDetStageMap(detLevel); }
    else { routeGame(MODE); }
  };
}


/* ============================================================
   WORD DETECTIVE v2 — ระบบด่านย่อย (Stage)
   แต่ละ Level มีหลายด่าน ด่านละ 10 คำ
   ต้องผ่านทุกด่านถึงปลดล็อค Level ถัดไป
   ============================================================ */
let detectiveData = null;
let detLevel = 1;
let detStage = 0;
let detQueue = [];
let detQi = 0;
let detScore = 0;
let detClueIdx = 0;
const DET_PER_STAGE = 10;

async function loadClues(){
  if(detectiveData) return;
  const bust = "data/clues.json?d=" + new Date().toISOString().slice(0,10);
  const res = await fetch(bust);
  detectiveData = await res.json();
}

function detLevelMeta(lv){
  return detectiveData._meta.levels[String(lv)] || detectiveData._meta.levels["1"];
}
function detWords(lv){
  return detectiveData.levels[String(lv)] || [];
}
function detStages(lv){
  const words = detWords(lv);
  const stages = [];
  for(let i=0; i<words.length; i+=DET_PER_STAGE){
    stages.push(words.slice(i, i+DET_PER_STAGE));
  }
  return stages;
}
function detStageKey(lv, stage){ return 'det_'+lv+'_'+stage; }
function detStagePassed(lv, stage){
  const k = detStageKey(lv, stage);
  return DB[k] || false;
}
function detMarkStage(lv, stage){
  DB[detStageKey(lv, stage)] = true;
  Store.save(DB);
}
function detLevelCleared(lv){
  const total = detStages(lv).length;
  for(let i=0; i<total; i++){
    if(!detStagePassed(lv, i)) return false;
  }
  return total > 0;
}
function detUnlocked(lv){
  if(lv <= 1) return true;
  return detLevelCleared(lv - 1);
}

/* ──────── หน้าเลือก Level ──────── */
function showDetectiveSelect(){
  MODE = 'detective'; inActiveGame = false;
  showScreen();
  $('#score').textContent = '🔍 Word Detective';
  setProg(0);
  const metas = detectiveData._meta.levels;
  let cards = '';
  for(let lv=1; lv<=5; lv++){
    const m = metas[String(lv)];
    const unlocked = detUnlocked(lv);
    const stages = detStages(lv);
    const cleared = stages.filter((_,i)=>detStagePassed(lv,i)).length;
    const stars = '⭐'.repeat(m.stars);
    const pct = stages.length ? Math.round(cleared/stages.length*100) : 0;
    cards += `<button class="det-card ${unlocked?'':'det-locked'}" data-lv="${lv}" ${unlocked?'':'disabled'}>
      <div class="det-stars">${stars}</div>
      <div class="det-name">${m.name}</div>
      <div class="det-info">${unlocked
        ? `${cleared}/${stages.length} stages · ${detWords(lv).length} words`
        : '🔒 Clear Level '+(lv-1)+' first'}</div>
      ${unlocked && stages.length ? `<div class="det-prog-bar"><div class="det-prog-fill" style="width:${pct}%"></div></div>` : ''}
    </button>`;
  }
  $('#play').innerHTML = `
    <div class="det-header">
      <div class="det-icon">🔍</div>
      <div class="det-title">Word Detective</div>
      <div class="det-sub">Read the clues, guess the word!<br>อ่านเบาะแส ทายคำศัพท์!</div>
    </div>
    <div class="det-grid">${cards}</div>
    <div style="text-align:center;margin-top:14px">
      <button class="btn alt" onclick="goHome()">🏠 Home</button>
    </div>`;
  document.querySelectorAll('.det-card').forEach(c=>{
    c.onclick = ()=>{
      const lv = parseInt(c.dataset.lv);
      if(!detUnlocked(lv)){ toast('🔒','Clear Level '+(lv-1)+' first!'); return; }
      showDetStageMap(lv);
    };
  });
}

/* ──────── หน้าเลือกด่าน (Stage Map) ──────── */
function showDetStageMap(lv){
  detLevel = lv;
  MODE = 'detective'; inActiveGame = false;
  showScreen();
  const meta = detLevelMeta(lv);
  const stages = detStages(lv);
  const cleared = stages.filter((_,i)=>detStagePassed(lv,i)).length;
  $('#score').textContent = '🔍 ' + meta.name;
  setProg(stages.length ? cleared/stages.length*100 : 0);

  let grid = '';
  for(let i=0; i<stages.length; i++){
    const passed = detStagePassed(lv, i);
    // ด่านแรกที่ยังไม่ผ่าน = current (เปิดเล่นได้) ด่านที่ผ่านแล้ว = done ด่านหลัง current = lock
    const firstOpen = stages.findIndex((_,j)=>!detStagePassed(lv,j));
    const isCur = i === firstOpen;
    const isLocked = i > firstOpen && firstOpen >= 0;
    const cls = passed ? 'det-stage-done' : isCur ? 'det-stage-cur' : isLocked ? 'det-stage-lock' : 'det-stage-cur';
    const num = i + 1;
    grid += `<button class="det-stage ${cls}" data-s="${i}" ${isLocked?'disabled':''}>
      <div class="det-stage-num">${passed ? '✅' : isLocked ? '🔒' : num}</div>
      <div class="det-stage-words">${stages[i].length} words</div>
    </button>`;
  }

  $('#play').innerHTML = `
    <div class="det-header" style="margin-bottom:10px">
      <div class="det-title">${'⭐'.repeat(meta.stars)} ${meta.name}</div>
      <div class="det-sub">${cleared}/${stages.length} stages cleared
        ${cleared===stages.length && stages.length>0 ? ' · 🏆 Level Complete!' : ''}</div>
    </div>
    <div class="det-stage-grid">${grid}</div>
    <div style="text-align:center;margin-top:14px">
      <button class="btn alt" onclick="showDetectiveSelect()">⬅ Levels</button>
      <button class="btn alt" onclick="goHome()">🏠 Home</button>
    </div>`;
  document.querySelectorAll('.det-stage').forEach(b=>{
    b.onclick = ()=>{
      const s = parseInt(b.dataset.s);
      startDetStage(lv, s);
    };
  });
}

/* ──────── เริ่มเล่นด่าน ──────── */
function startDetStage(lv, stage){
  detLevel = lv;
  detStage = stage;
  inActiveGame = true;
  const stages = detStages(lv);
  detQueue = shuffle([...stages[stage]]);
  detQi = 0; detScore = 0;
  nextDetective();
}

/* ──────── แสดงคำถาม ──────── */
function nextDetective(){
  if(detQi >= detQueue.length){ return detFinish(); }
  const meta = detLevelMeta(detLevel);
  const entry = detQueue[detQi];
  const answer = entry.word;
  detClueIdx = 0;

  const pool = detWords(detLevel).filter(e=>e.word.toLowerCase()!==answer.toLowerCase());
  const wrongs = shuffle(pool).slice(0, meta.choices - 1).map(e=>e.word);
  const choices = shuffle([answer, ...wrongs]);

  const stageTotal = detQueue.length;
  setProg((detQi / stageTotal) * 100);
  const stages = detStages(detLevel);
  $('#score').textContent = '🔍 Stage ' + (detStage+1) + '/' + stages.length + ' · ' + (detQi+1) + '/' + stageTotal;

  const BORDER_COLORS = ['#F5A300','#1FA39A','#E84A5F','#7B3FC4','#4E9A2E','#185FA5'];

  $('#play').innerHTML = `
    <div class="det-q-box">
      <div class="det-q-num">Stage ${detStage+1} · Question ${detQi+1} of ${stageTotal}</div>
      <div class="det-clues" id="detClues"></div>
      <button class="btn det-next-clue" id="detNextClue">Next clue · เบาะแสถัดไป</button>
    </div>
    <div class="det-choices" id="detChoices">
      ${choices.map((c,i)=>`
        <button class="det-choice" data-w="${c}"
          style="--card-border:${BORDER_COLORS[i%BORDER_COLORS.length]}">
          ${c}
        </button>`).join('')}
    </div>
    <div class="fb" id="fb" aria-live="assertive"></div>`;

  showNextClue(entry, meta); QuestyReact.thinking();
  document.getElementById('detNextClue').onclick = () => showNextClue(entry, meta);
  document.querySelectorAll('.det-choice').forEach(btn=>{
    btn.onclick = () => detAnswer(btn, answer, entry);
  });
}

function showNextClue(entry, meta){
  const box = document.getElementById('detClues');
  const btn = document.getElementById('detNextClue');
  if(detClueIdx >= meta.clueCount || detClueIdx >= entry.clues.length){
    if(btn) btn.style.display = 'none';
    return;
  }
  const clue = entry.clues[detClueIdx];
  const num = detClueIdx + 1;
  const icon = num === 1 ? '💡' : num === 2 ? '🔎' : '🎯';
  box.innerHTML += `<div class="det-clue det-clue-${num}" style="animation:detFadeIn .4s ease">
    <span class="det-clue-icon">${icon}</span>
    <span class="det-clue-text">Clue ${num}: ${clue}</span>
  </div>`;
  detClueIdx++;
  if(detClueIdx >= meta.clueCount || detClueIdx >= entry.clues.length){
    if(btn) btn.style.display = 'none';
  }
}

function detAnswer(btn, answer, entry){
  const all = document.querySelectorAll('.det-choice');
  const correct = btn.dataset.w.toLowerCase() === answer.toLowerCase();
  all.forEach(b=>{ b.disabled = true; });
  btn.classList.add(correct ? 'det-right' : 'det-wrong');
  all.forEach(b=>{ if(b.dataset.w.toLowerCase()===answer.toLowerCase()) b.classList.add('det-right'); });

  const fb = document.getElementById('fb');
  if(correct){
    detScore++;
    Audio2.good(); QuestyReact.happy(); cssConfetti();
    fb.innerHTML = `<span class="fbg">✅ Correct! · ถูกต้อง!</span>`;
    if(entry.th) fb.innerHTML += `<br><span style="font-size:.9em;color:var(--muted)">${answer} = ${entry.th}</span>`;
  } else {
    Audio2.bad(); QuestyReact.sad();
    fb.innerHTML = `<span class="fbr">❌ ${answer}${entry.th ? ' = '+entry.th : ''}</span>`;
  }
  detQi++;
  setTimeout(()=> nextDetective(), correct ? 1500 : 2500);
}

/* ──────── จบด่าน ──────── */
function detFinish(){
  inActiveGame = false;
  setProg(100);
  const pct = detQueue.length ? detScore/detQueue.length : 0;
  const passed = pct >= 0.7;
  if(passed) detMarkStage(detLevel, detStage);
  Audio2.win();
  if(passed && pct >= 0.5) FX.confetti(120);

  const meta = detLevelMeta(detLevel);
  const starsEarned = pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : 1;
  Gamify.addStars(starsEarned + detScore);
  Gamify.recordRound('detective', 'Det'+detLevel, detScore, detQueue.length);
  afterRound();

  const stages = detStages(detLevel);
  const nextStage = detStage + 1;
  const hasNextStage = nextStage < stages.length;
  const levelDone = detLevelCleared(detLevel);

  let btns = '';
  if(passed && hasNextStage){
    btns += `<button class="btn" onclick="startDetStage(${detLevel},${nextStage})">➡️ Stage ${nextStage+1}</button>`;
  }
  if(passed && levelDone && detLevel < 5){
    btns += `<button class="btn" onclick="showDetStageMap(${detLevel+1})">🌟 Level ${detLevel+1}</button>`;
  }
  if(!passed){
    btns += `<button class="btn" onclick="startDetStage(${detLevel},${detStage})">🔁 Try Again</button>`;
  }
  btns += `<button class="btn alt" id="viewBoard">🏆 Top 10</button>`;
  btns += `<button class="btn alt" onclick="showDetStageMap(${detLevel})">🗺️ Stage Map</button>`;
  btns += `<button class="btn alt" onclick="goHome()">🏠 Home</button>`;

  $('#play').innerHTML = `<div class="done">
    <div class="trophy">${passed ? '🏆' : '🔍'}</div>
    <h2>${passed ? (levelDone ? meta.name+' Complete!' : 'Stage cleared!') : 'Keep trying!'}</h2>
    <div class="starline">${'⭐'.repeat(starsEarned) + '☆'.repeat(3-starsEarned)}</div>
    <div class="res">Score: ${detScore} / ${detQueue.length} · ${Math.round(pct*100)}%</div>
    <div class="res" style="font-size:.85em;color:var(--muted)">${
      passed ? (levelDone ? '🎉 All '+stages.length+' stages cleared!'
                          : 'Stage '+(detStage+1)+'/'+stages.length+' done · '+Math.round(stages.filter((_,i)=>detStagePassed(detLevel,i)).length/stages.length*100)+'%')
             : 'Need 70% to pass'}</div>
    ${btns}
  </div>`;
  const vb = document.getElementById('viewBoard');
  if(vb) vb.onclick = () => showLeaderboard();
  maybeShowNameEntry(starsEarned + detScore, null);
}

/* ============================================================
   QUESTY REACTIONS — mascot ตอบสนองระหว่างเล่นเกม
   ============================================================ */
const QuestyReact = {
  el: null,
  init(){ this.el = document.getElementById('questyReact'); },
  show(emoji, cls, duration){
    if(!this.el) this.init();
    if(!this.el) return;
    this.el.textContent = emoji;
    this.el.className = 'questy-react show ' + cls;
    clearTimeout(this._t);
    this._t = setTimeout(()=>{
      this.el.classList.remove('show','happy','sad','thinking');
    }, duration || 1500);
  },
  happy(){ this.show('🦊', 'happy', 1200); },
  sad(){ this.show('😢', 'sad', 1500); },
  thinking(){ this.show('🤔', 'thinking', 3000); },
  celebrate(){ this.show('🎉', 'happy', 2000); },
  hide(){
    if(!this.el) this.init();
    if(this.el) this.el.className = 'questy-react';
  }
};

/* CSS confetti burst — เรียกตอนตอบถูก */
function cssConfetti(){
  const colors = ['#F5A300','#1FA39A','#E84A5F','#7B3FC4','#4E9A2E','#FF6840'];
  const container = document.createElement('div');
  container.className = 'confetti-burst';
  for(let i=0; i<24; i++){
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    p.style.background = colors[i % colors.length];
    p.style.setProperty('--cx', (Math.random()*300-150)+'px');
    p.style.setProperty('--cy', (Math.random()*300-150)+'px');
    p.style.animationDelay = (Math.random()*0.3)+'s';
    p.style.width = (6+Math.random()*8)+'px';
    p.style.height = (6+Math.random()*8)+'px';
    container.appendChild(p);
  }
  document.body.appendChild(container);
  setTimeout(()=> container.remove(), 1800);
}
