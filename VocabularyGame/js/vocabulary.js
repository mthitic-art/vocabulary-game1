/* ============================================================
   vocabulary.js  ·  [DATA LAYER — multi-month]
   Loads data/vocabulary.json with shape:
     { _meta, months: { june: {K1:[...],...}, july: {...} } }
   The rest of the game reads through levelData() which is
   always scoped to the currently selected MONTH.
   ============================================================ */

// All months in the school year, in display order.
// Months not present in the JSON are shown locked ("Coming soon").
const ALL_MONTHS = [
  { key:"may",       label:"May" },
  { key:"june",      label:"Jun" },
  { key:"july",      label:"Jul" },
  { key:"august",    label:"Aug" },
  { key:"september", label:"Sep" },
  { key:"october",   label:"Oct" },
  { key:"november",  label:"Nov" },
  { key:"december",  label:"Dec" },
  { key:"january",   label:"Jan" },
  { key:"february",  label:"Feb" },
];

let vocabMonths = {};                 // { june: {K1:[...]}, ... }
let vocabMeta = { months: [], counts: {} };
let MONTH = "";                       // currently selected month key

const CHOICES = { K1:2, K2:4, K3:4, P1:4, P2:4, P3:4, P4:4, P5:4, P6:4 };
const LEVELS = ["K1","K2","K3","P1","P2","P3","P4","P5","P6"];
const UNLOCK_ORDER = LEVELS;

async function loadVocabulary(path = "data/vocabulary.json") {
  // cache-bust รายวัน: JSON อัปเดตทุกเดือน ไม่ให้ browser จำตัวเก่าค้าง
  const bust = path + (path.includes("?") ? "&" : "?") + "d=" + new Date().toISOString().slice(0,10);
  const res = await fetch(bust);
  if (!res.ok) throw new Error("Cannot load " + path + " (" + res.status + ")");
  const json = await res.json();
  vocabMeta = json._meta || vocabMeta;

  if (json.months){
    vocabMonths = json.months;
  } else {
    // backward compat: old flat shape { K1:[...], ... } → treat as june
    vocabMonths = { june: {} };
    LEVELS.forEach(lv => { vocabMonths.june[lv] = Array.isArray(json[lv]) ? json[lv] : []; });
  }

  // default month = June (เปิดมาเจอ June เสมอ) แล้วเด็กค่อยกดเลือกเดือนอื่นเอง
  // ถ้าด้วยเหตุใด June ไม่มีข้อมูล ให้ fallback ไปเดือนแรกที่มีข้อมูล
  const avail = ALL_MONTHS.filter(m => monthHasData(m.key));
  MONTH = monthHasData("june") ? "june"
        : (avail.length ? avail[0].key : "june");
  return true;
}

/* ---- month helpers ---- */
function monthHasData(mKey){
  const m = vocabMonths[mKey];
  if (!m) return false;
  return LEVELS.some(lv => Array.isArray(m[lv]) && m[lv].length > 0);
}
function availableMonths(){ return ALL_MONTHS.filter(m => monthHasData(m.key)); }
function monthLabel(mKey){
  const m = ALL_MONTHS.find(x => x.key === mKey);
  return m ? m.label : mKey;
}
function setMonth(mKey){ if (monthHasData(mKey)) MONTH = mKey; }

/* ---- Accessors (always scoped to current MONTH) ---- */
function levelData(lv) {
  const m = vocabMonths[MONTH] || {};
  return m[lv] || [];
}
function wordsOf(lv)   { return levelData(lv).map(e => e.word); }
function entryOf(lv, w){ return levelData(lv).find(e => e.word === w) || { word:w }; }
function emojiOf(lv, w){ const e = entryOf(lv, w); return e.emoji || "🔡"; }
function hasLevelWords(lv){ return levelData(lv).length > 0; }

/* คำนี้มี "ภาพหรือ emoji" ให้เด็กดูหรือไม่
   ตั้งแต่รอบซ่อมข้อมูล (tools/fix_vocabulary.py) ฟิลด์ image จะมีก็ต่อเมื่อ
   ไฟล์ภาพมีอยู่จริงเท่านั้น → เช็คแค่นี้ก็เชื่อถือได้ ไม่ต้องรอ onerror */
function hasVisual(lv, w){
  const e = entryOf(lv, w);
  return !!(e && (e.image || e.emoji));
}
/* คำที่มีภาพ/emoji เท่านั้น — ใช้กับโหมดที่ "ต้องมีรูป" เช่น Memory */
function visualWords(lv, list){
  return (list || wordsFiltered(lv)).filter(w => hasVisual(lv, w));
}

/* Subject filter — only P1 has subjects. */
let SUBJECT_FILTER = "All";
const P1_SUBJECTS = ["Go Get Maths", "Science", "English"];

function wordsFiltered(lv){
  const data = levelData(lv);
  if (lv !== "P1" || SUBJECT_FILTER === "All") return data.map(e => e.word);
  return data.filter(e => e.subject === SUBJECT_FILTER).map(e => e.word);
}
function entriesFiltered(lv){
  const data = levelData(lv);
  if (lv !== "P1" || SUBJECT_FILTER === "All") return data;
  return data.filter(e => e.subject === SUBJECT_FILTER);
}
