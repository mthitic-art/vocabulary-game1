/* ============================================================
   audio.js  ·  [AUDIO LAYER]
   Pronunciation (SpeechSynthesis) + WebAudio sound effects +
   random spoken encouragement. No external libraries.

   AMERICAN ACCENT: we actively pick a US English voice when the
   device has one (e.g. "Samantha", "Google US English", "Microsoft
   Aria/Jenny"). NOTE: the actual voice comes from the player's
   device, so quality varies by OS. We request en-US and the best
   available US voice; we can't bundle a fixed voice in a web page.
   ============================================================ */
const Audio2 = (() => {
  let ctx = null;
  let usVoice = null;       // chosen American English voice
  let voicesReady = false;

  // Find the best US English voice on this device.
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return;             // not loaded yet
    const prefer = [
      "Google US English", "Samantha", "Microsoft Aria", "Microsoft Jenny",
      "Microsoft Zira", "Alex", "Microsoft David", "en-US"
    ];
    for (const name of prefer) {
      const v = voices.find(v =>
        (v.name && v.name.includes(name)) ||
        (name === "en-US" && v.lang && v.lang.replace("_","-") === "en-US"));
      if (v) { usVoice = v; break; }
    }
    if (!usVoice) usVoice = voices.find(v => v.lang && v.lang.startsWith("en")) || null;
    voicesReady = true;
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  const ensure = () => {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){} }
    return ctx;
  };
  function tone(freq, start, dur, type = "sine", vol = 0.2) {
    const c = ensure(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, c.currentTime + start);
    g.gain.linearRampToValueAtTime(vol, c.currentTime + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
    o.connect(g); g.connect(c.destination);
    o.start(c.currentTime + start); o.stop(c.currentTime + start + dur);
  }
  return {
    speak(w) {
      if (!('speechSynthesis' in window)) return;
      if (!voicesReady) pickVoice();
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(w);
      u.lang = 'en-US';
      if (usVoice) u.voice = usVoice;
      u.rate = 0.75;
      u.pitch = 1.05;
      speechSynthesis.speak(u);
    },
    voiceName() { return usVoice ? usVoice.name : "(device default)"; },
    good() { tone(523,0,.15,"triangle"); tone(659,.12,.15,"triangle"); tone(784,.24,.25,"triangle"); },
    bad()  { tone(300,0,.2,"sine",.15); tone(220,.15,.25,"sine",.15); },
    win()  { [523,659,784,1046].forEach((f,i)=>tone(f,i*.13,.3,"triangle")); },
    hit()  { tone(180,0,.12,"square",.18); tone(120,.08,.15,"square",.14); }
  };
})();

const PRAISE = ["Great job!","Awesome!","Well done!","Super!","You got it!","Fantastic!","Brilliant!","Yay!"];
const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];
