/* ============================================================
   progress.js  ·  [PROGRESS LAYER]
   Persistence (localStorage with in-memory fallback — STEP 10),
   spaced repetition / mastery (SRS), and gamification
   (stars, streak, badges, unlocks).
   IMPORTANT (STEP 10): browsers cannot write progress.json back
   to disk, so we use localStorage, NOT a JSON file, for saving.
   ============================================================ */

/* ---------- [STORE] localStorage wrapper + schema ---------- */
const Store = (() => {
  const KEY = "juneWordWorld.v2";
  let mem = null, useLS = true;
  try { localStorage.setItem("__t","1"); localStorage.removeItem("__t"); }
  catch(e){ useLS = false; } // private mode / sandbox -> memory fallback
  function blank() {
    // ALL levels are unlocked from the start: this vocabulary set is
    // handed to every grade, so a P6 student can jump straight to P6.
    // Progress (stars / mastery) is still tracked per level.
    const allOpen = {};
    ["K1","K2","K3","P1","P2","P3","P4","P5","P6"].forEach(l => allOpen[l] = true);
    return {
      stars:0, streak:0, lastPlay:null, days:[],
      badges:{}, unlocked: allOpen,
      mastery:{},                          // "LV::word": {seen,correct}
      wrong:{},                            // "LV": ["word", ...]
      advCleared:{},                       // "LV": highest adventure stage cleared (0-10), per grade
      history:[]                           // {date,mode,lv,score,max}
    };
  }
  function load() {
    if (!useLS) return mem || (mem = blank());
    try { const r = localStorage.getItem(KEY); return r ? migrate(JSON.parse(r)) : blank(); }
    catch(e){ return blank(); }
  }
  function migrate(s){ // make sure new fields exist + unlock everything
    const merged = Object.assign(blank(), s);
    // Force ALL levels open, regardless of what an older save stored.
    const allOpen = {};
    ["K1","K2","K3","P1","P2","P3","P4","P5","P6"].forEach(l => allOpen[l] = true);
    merged.unlocked = allOpen;
    return merged;
  }
  function save(s) {
    if (!useLS) { mem = s; return; }
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch(e){ mem = s; }
  }
  return { load, save, reset(){ const b = blank(); save(b); return b; } };
})();
let DB = Store.load();

/* ---------- [SRS] spaced repetition + mastery ---------- */
const SRS = {
  key:(lv,w)=> lv + "::" + w,
  record(lv,w,ok){
    const k = this.key(lv,w);
    const m = DB.mastery[k] || (DB.mastery[k] = {seen:0,correct:0});
    m.seen++; if (ok) m.correct++;
    if (!DB.wrong[lv]) DB.wrong[lv] = [];
    if (!ok){ if (!DB.wrong[lv].includes(w)) DB.wrong[lv].push(w); }
    else { const i = DB.wrong[lv].indexOf(w); if (i>-1) DB.wrong[lv].splice(i,1); }
    Store.save(DB);
  },
  pct(lv,w){ const m = DB.mastery[this.key(lv,w)]; return (m && m.seen) ? m.correct/m.seen : 0; },
  // Pick N words weighted toward weak/unseen ones.
  // wordList is optional — pass wordsFiltered(lv) to respect subject filter.
  pickWeighted(lv, n, wordList){
    const ws = wordList || wordsOf(lv);
    const scored = ws.map(w => ({ w, weight: 1.2 - this.pct(lv,w) + (DB.mastery[this.key(lv,w)] ? 0 : 0.5) }));
    scored.forEach(o => o.r = Math.random() * o.weight);
    scored.sort((a,b)=> b.r - a.r);
    return scored.slice(0, Math.min(n, ws.length)).map(o => o.w);
  },
  // Return only wrong words that are in the current filtered list.
  wrongList(lv, wordList){
    const all = [...new Set(DB.wrong[lv] || [])];
    if (!wordList) return all;
    return all.filter(w => wordList.includes(w));
  }
};

/* ---------- [GAMIFY] stars, streak, badges, unlocks ---------- */
const ACHIEVEMENTS = [
  {id:"first",   e:"🎯", n:"First Win",     test:db=>db.history.length>=1},
  {id:"ten",     e:"⭐", n:"10 Stars",      test:db=>db.stars>=10},
  {id:"fifty",   e:"🌟", n:"50 Stars",      test:db=>db.stars>=50},
  {id:"hundred", e:"💫", n:"100 Stars",     test:db=>db.stars>=100},
  {id:"streak3", e:"🔥", n:"3-Day Streak",  test:db=>db.streak>=3},
  {id:"perfect", e:"💯", n:"Perfect Round", test:db=>db.history.some(h=>h.score===h.max&&h.max>=4)},
  {id:"explorer",e:"🧭", n:"Explorer",      test:db=>new Set(db.history.map(h=>h.lv)).size>=3},
  {id:"boss",    e:"⚔️", n:"Boss Slayer",   test:db=>db.history.some(h=>h.mode==='adventure'&&h.score===h.max&&h.max>0)},
  {id:"master",  e:"🧠", n:"Word Master",   test:db=>Object.values(db.mastery).filter(m=>m.seen>=3&&m.correct/m.seen>=.9).length>=20},
];

const Gamify = {
  today(){ return new Date().toISOString().slice(0,10); },
  // Daily streak: +1 for consecutive days, reset otherwise.
  touchStreak(){
    const t = this.today();
    if (DB.lastPlay === t) return;
    const yest = new Date(Date.now() - 864e5).toISOString().slice(0,10);
    DB.streak = (DB.lastPlay === yest) ? DB.streak + 1 : 1;
    DB.lastPlay = t; if (!DB.days.includes(t)) DB.days.push(t);
    Store.save(DB);
  },
  addStars(n){ DB.stars += n; Store.save(DB); },
  avgMastery(lv){
    const ws = wordsOf(lv); if (!ws.length) return 0;
    return ws.reduce((a,w)=> a + SRS.pct(lv,w), 0) / ws.length;
  },
  // Unlocks are no longer used (every level is open). Kept as a no-op
  // so existing calls elsewhere don't break.
  checkUnlocks(onUnlock){ Store.save(DB); },
  checkAchievements(onEarn){
    ACHIEVEMENTS.forEach(a => {
      if (!DB.badges[a.id] && a.test(DB)){ DB.badges[a.id] = true; if (onEarn) onEarn(a); }
    });
    Store.save(DB);
  },
  recordRound(mode,lv,score,max){
    DB.history.push({ date:this.today(), mode, lv, score, max });
    Store.save(DB);
  }
};

/* Simple per-level save/load helpers (matches STEP 5 API). */
function saveProgress(level, score){ Gamify.addStars(score); Gamify.recordRound("quiz", level, score, score); }
function loadProgress(level){
  const rounds = DB.history.filter(h => h.lv === level);
  return rounds.reduce((a,h)=> a + h.score, 0);
}
