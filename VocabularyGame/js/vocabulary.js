/* ============================================================
   vocabulary.js  ·  [DATA LAYER]
   Loads vocabulary from data/vocabulary.json (no words are
   hard-coded in JS anymore — STEP 1, 2, 4 of the guidance).
   Exposes a small API the rest of the game uses so the data
   source can change without touching game logic.
   ============================================================ */

// Populated by loadVocabulary(). Shape: { K1:[{word,image,emoji,subject?}], ... }
let vocabulary = {};
let vocabMeta = { month: "", levels: [], counts: {} };

// Adaptive difficulty: number of answer choices per level.
// Kindergarten stays easy; primary grades get harder.
const CHOICES = { K1:2, K2:4, K3:6, P1:4, P2:4, P3:4, P4:6, P5:6, P6:6 };

// Full level order used across the app.
const LEVELS = ["K1","K2","K3","P1","P2","P3","P4","P5","P6"];

// Unlock chain: which level must reach mastery before the next opens.
const UNLOCK_ORDER = ["K1","K2","K3","P1","P2","P3","P4","P5","P6"];

/* Load the JSON once at startup. Returns true on success.
   Works when the site is served over http(s); when opened as a
   bare file:// some browsers block fetch — host it (GitHub Pages,
   Netlify) or run a local server. */
async function loadVocabulary(path = "data/vocabulary.json") {
  const res = await fetch(path);
  if (!res.ok) throw new Error("Cannot load " + path + " (" + res.status + ")");
  const json = await res.json();
  vocabMeta = json._meta || vocabMeta;
  // copy each level array (skip the _meta key)
  vocabulary = {};
  LEVELS.forEach(lv => { vocabulary[lv] = Array.isArray(json[lv]) ? json[lv] : []; });
  return true;
}

/* ---- Accessors used everywhere else ---- */
function levelData(lv) { return vocabulary[lv] || []; }
function wordsOf(lv)   { return levelData(lv).map(e => e.word); }
function entryOf(lv, w){ return levelData(lv).find(e => e.word === w) || { word:w }; }
function emojiOf(lv, w){ const e = entryOf(lv, w); return e.emoji || "🔡"; }
function hasLevelWords(lv){ return levelData(lv).length > 0; }
