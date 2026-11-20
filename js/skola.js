/* =========================================================
   Multiskolan – skrivträning
   skola.html?s=abc   en bokstav i taget
   skola.html?s=matte rita svaret på ett plustal
   skola.html?s=ord   skriv av ett ord, en ruta per bokstav
   Varje rätt ger 10 guldmynt. Nya uppgifter kommer tills man avslutar.
   ========================================================= */
import { loadNets, Pad, LETTERS, readNumber, letterProbs, letterPass, letterGuess } from './handskrift.js';

const $ = id => document.getElementById(id);
const MODE = ['abc', 'matte', 'ord'].includes(new URLSearchParams(location.search).get('s')) ? new URLSearchParams(location.search).get('s') : 'abc';
const GOLD = 10;
const TITLES = { abc: 'ABC Skolan', matte: 'Matteskolan', ord: 'Ord skolan' };
document.body.classList.add('s-' + MODE);
$('title').textContent = TITLES[MODE];
document.title = TITLES[MODE] + ' – Multiskolan';

const player = Save.active();
if (!player) { location.replace('index.html'); throw new Error('Ingen spelare vald'); }
const soundOn = () => Save.load().settings.sound !== false;

/* ---------- Ljud och tal ---------- */
let ac = null, svVoice = null;
function pickVoice() { try { svVoice = speechSynthesis.getVoices().find(v => /^sv/i.test(v.lang)) || null; } catch (e) {} }
try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {}
let heard = false, lastSaid = '';
function say(t) {
  if (!soundOn() || !t) return;
  lastSaid = t;
  try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'sv-SE'; if (svVoice) u.voice = svVoice; u.rate = 0.9; u.pitch = 1.15; u.onstart = () => { heard = true; }; speechSynthesis.speak(u); } catch (e) {}
}
// Paddor (Safari) spelar bara upp ljud efter första tryckningen: lås upp ljudet då och säg uppgiften igen om den inte hördes
addEventListener('pointerdown', () => {
  try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); } catch (e) {}
  if (!heard && lastSaid) say(lastSaid);
}, { once: true, capture: true });
function tone(f, dur = 0.15, type = 'triangle', vol = 0.1, when = 0) {
  if (!soundOn()) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state === 'suspended') ac.resume();
    const t = ac.currentTime + when, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch (e) {}
}
const ding = k => { const f = 660 * Math.pow(2, (k % 8) / 6); tone(f, 0.3, 'triangle', 0.12); tone(f * 1.5, 0.35, 'sine', 0.08, 0.08); };
const fanfare = () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'triangle', 0.12, i * 0.1));
const coinSound = () => [1319, 1760, 2093].forEach((f, i) => tone(f, 0.18, 'square', 0.04, 0.35 + i * 0.07));
const oops = () => { tone(520, 0.2, 'triangle', 0.12); tone(390, 0.35, 'triangle', 0.12, 0.18); };

/* ---------- Stjärnhimmel ---------- */
(function stars() {
  const cv = $('stars'), x = cv.getContext('2d'), S = [];
  const rs = () => { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; };
  addEventListener('resize', rs); rs();
  for (let i = 0; i < 140; i++) S.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.5, t: Math.random() * 7, c: ['#fff', '#fff', '#ffd84a', '#3ee8ff', '#ff5ccf'][i % 5] });
  (function draw() {
    x.clearRect(0, 0, cv.width, cv.height);
    for (const s of S) { s.t += 0.03; x.globalAlpha = 0.5 + Math.sin(s.t) * 0.4; x.fillStyle = s.c; x.beginPath(); x.arc(s.x * cv.width, s.y * cv.height, s.r * devicePixelRatio, 0, 7); x.fill(); }
    requestAnimationFrame(draw);
  })();
})();

/* ---------- Spelaren, guld och framsteg ---------- */
let streak = 0, earned = 0;
$('name').textContent = player ? player.name : '';
const showCoins = () => { $('coins').textContent = (Save.get(player.id) || {}).coins || 0; };
showCoins();
import('./avatar.js').then(A => A.renderPortrait(player.look, player.gender, 160)).then(url => { $('face').src = url; }).catch(() => { $('face').style.display = 'none'; });

function reward(fromEl, what) {
  Save.addCoins(player.id, GOLD);
  Save.updatePlayer(player.id, p => {
    const pr = p.progress[MODE] || (p.progress[MODE] = {});
    pr.ratt = (pr.ratt || 0) + 1;
    if (what) { pr.klarat = pr.klarat || {}; pr.klarat[what] = (pr.klarat[what] || 0) + 1; }
  });
  streak++; earned += GOLD;
  $('streak').textContent = streak;
  // +10 som flyger upp, myntet studsar
  const r = (fromEl || $('game')).getBoundingClientRect();
  const p = document.createElement('div'); p.className = 'plus10'; p.textContent = `+${GOLD} 🪙`;
  p.style.left = (r.left + r.width / 2) + 'px'; p.style.top = (r.top + r.height * 0.35) + 'px';
  document.body.appendChild(p); setTimeout(() => p.remove(), 1300);
  setTimeout(() => { showCoins(); const c = $('coinsPill'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); }, 450);
  const f = $('face'); f.classList.remove('hop'); void f.offsetWidth; f.classList.add('hop');
  fanfare(); coinSound(); confetti(MODE === 'ord' ? 30 : 18);
}
function confetti(n) {
  const c = document.createElement('div'); c.className = 'confetti';
  const E = ['⭐', '✨', '🪙', '🎉', '💖', '🌟'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span'); s.textContent = E[i % E.length];
    s.style.left = (Math.random() * 100) + '%'; s.style.animationDuration = (1.6 + Math.random() * 1.4) + 's'; s.style.animationDelay = (Math.random() * 0.4) + 's';
    c.appendChild(s);
  }
  document.body.appendChild(c); setTimeout(() => c.remove(), 3500);
}
function msg(t, c = '') { const m = $('msg'); m.textContent = t; m.className = 'msg' + (c ? ' ' + c : ''); }
function shake(el) { el.classList.remove('bad'); void el.offsetWidth; el.classList.add('bad'); }
const pick = a => a[Math.floor(Math.random() * a.length)];
const PRAISE = ['Rätt!', 'Superbra!', 'Jättebra!', 'Snyggt!', 'Wow!', 'Toppen!'];

/* =========================================================
   ABC: en bokstav i taget
   ========================================================= */
function abcGame() {
  const g = $('game'); g.className = 'abc';
  g.innerHTML = `<div class="target card"><div class="tl">Skriv bokstaven</div><div class="big" id="big"></div></div>
    <div class="pad" id="padHost"><div class="hint">Skriv här ✏️</div><div class="check">✅</div></div>`;
  const host = $('padHost');
  const S = { ch: '', recent: [], tries: 0, busy: false };
  const pad = new Pad(host, { line: 0.075, onStroke: () => { host.classList.add('used'); msg(''); if (!S.busy && letterPass(letterProbs(pad.strokes), S.ch, 'auto')) win(); } });
  const ask = () => say(`Skriv bokstaven ${S.ch}`);
  function next() {
    const pool = [...LETTERS].filter(c => !S.recent.includes(c));
    S.ch = pick(pool); S.recent.push(S.ch); if (S.recent.length > 8) S.recent.shift();
    S.tries = 0; S.busy = false;
    $('big').textContent = S.ch;
    host.classList.remove('ok', 'used', 'ghosted'); pad.okColor = null; pad.setGhost(null); pad.clear(); pad.locked = false;
    msg(''); ask();
  }
  function win() {
    S.busy = true; pad.locked = true; pad.okColor = '#25a862'; pad.draw(); host.classList.add('ok');
    msg(`${pick(PRAISE)} Det är ett ${S.ch}! 🎉`, 'ok'); say(`${pick(PRAISE)} ${S.ch}!`);
    reward(host, S.ch);
    setTimeout(next, 2000);
  }
  function check() {
    if (S.busy) return;
    if (!pad.strokes.length) { msg('Skriv bokstaven i rutan först! ✏️', 'no'); say(`Skriv ${S.ch} i rutan!`); return; }
    if (pad.extent() < 30) { msg('Skriv lite större! 🔍', 'no'); say('Skriv lite större!'); return; }
    const p = letterProbs(pad.strokes);
    if (letterPass(p, S.ch, 'ok')) return win();
    S.tries++; S.busy = true; oops(); shake(host);
    const { ch, conf } = letterGuess(p);
    if (ch && conf > 0.5 && ch !== S.ch) { msg(`Jag ser ${ch}, men vi skriver ${S.ch}. Försök igen! 💪`, 'no'); say(`Jag ser ${ch}. Vi skriver ${S.ch}. Försök igen!`); }
    else { msg(`Jag kan inte riktigt läsa det. Skriv ${S.ch} en gång till! ✏️`, 'no'); say(`Skriv ${S.ch} en gång till!`); }
    setTimeout(() => {
      pad.clear(); host.classList.remove('used'); S.busy = false;
      if (S.tries >= 2) { pad.setGhost(S.ch); host.classList.add('ghosted'); msg('Följ den ljusa bokstaven i rutan! ✨'); }
    }, 1500);
  }
  return { next, check, ask, clear: () => { if (!S.busy) { pad.clear(); host.classList.remove('used'); msg(''); } } };
}

/* =========================================================
   Matte: rita svaret
   ========================================================= */
function matteGame() {
  const g = $('game'); g.className = 'matte';
  g.innerHTML = `<div class="task"><span class="n" id="qa"></span><span class="op">+</span><span class="n" id="qb"></span><span class="op">=</span><span class="ans" id="qans">?</span></div>
    <div class="help" id="help"></div>
    <div class="pad" id="padHost"><div class="hint">Skriv svaret här ✏️</div><div class="check">✅</div></div>`;
  const host = $('padHost');
  const S = { a: 0, b: 0, tries: 0, busy: false, t: null };
  const pad = new Pad(host, {
    line: 0.06, baseline: true,
    onStroke: () => {
      host.classList.add('used'); msg('');
      clearTimeout(S.t);
      // läs svaret själv när man slutat rita en stund (bara om det är rätt – fel säger vi först när man trycker Klar)
      S.t = setTimeout(() => { if (!S.busy && pad.strokes.length && readNumber(pad.strokes, S.a + S.b).ok) win(); }, 900);
    }
  });
  const ask = () => say(`Vad blir ${S.a} plus ${S.b}?`);
  function next() {
    let a, b;
    for (let k = 0; k < 20; k++) { a = 1 + Math.floor(Math.random() * 9); b = 1 + Math.floor(Math.random() * 9); if (a !== S.a || b !== S.b) break; }
    Object.assign(S, { a, b, tries: 0, busy: false });
    $('qa').textContent = a; $('qb').textContent = b; $('qans').textContent = '?';
    $('help').innerHTML = `<div class="grp">${'<span>⭐</span>'.repeat(a)}</div><span class="plus">+</span><div class="grp">${'<span>💖</span>'.repeat(b)}</div>`;
    $('help').classList.remove('pulse');
    host.classList.remove('ok', 'used'); pad.okColor = null; pad.clear(); pad.locked = false;
    msg(''); ask();
  }
  function win() {
    const ans = S.a + S.b;
    S.busy = true; pad.locked = true; pad.okColor = '#25a862'; pad.draw(); host.classList.add('ok');
    $('qans').textContent = ans;
    msg(`${pick(PRAISE)} ${S.a} + ${S.b} = ${ans} 🎉`, 'ok'); say(`${pick(PRAISE)} ${S.a} plus ${S.b} är ${ans}!`);
    reward(host, `${S.a}+${S.b}`);
    setTimeout(next, 2300);
  }
  function check() {
    if (S.busy) return;
    clearTimeout(S.t);
    if (!pad.strokes.length) { msg('Skriv svaret i rutan först! ✏️', 'no'); say('Skriv svaret i rutan!'); return; }
    if (pad.extent() < 30) { msg('Skriv lite större! 🔍', 'no'); say('Skriv lite större!'); return; }
    const r = readNumber(pad.strokes, S.a + S.b);
    if (r.ok) return win();
    S.tries++; S.busy = true; oops(); shake(host);
    const unsure = r.conf < 0.45;
    if (unsure) { msg('Hmm… jag kan inte riktigt läsa det. Skriv en gång till! ✏️', 'no'); say('Jag kan inte riktigt läsa det. Skriv en gång till!'); }
    else { msg(`Jag ser ${r.read}. Inte riktigt – räkna stjärnorna och hjärtana! 💪`, 'no'); say(`Jag ser ${r.read}. Försök igen! Räkna stjärnorna och hjärtana.`); }
    if (S.tries >= 2) $('help').classList.add('pulse');
    setTimeout(() => { pad.clear(); host.classList.remove('used'); S.busy = false; }, 1500);
  }
  return { next, check, ask, clear: () => { if (!S.busy) { clearTimeout(S.t); pad.clear(); host.classList.remove('used'); msg(''); } } };
}

/* =========================================================
   Ord: skriv av ordet, en ruta per bokstav
   ========================================================= */
const WORDS = [
  ['MAMMA', '👩'], ['PAPPA', '👨'], ['ELSA', '💖'], ['NOVA', '💖'], ['GUNNEL', '💖'], ['RAGNAR', '💖'], ['CARINA', '💖'],
  ['HÄST', '🐴'], ['KATT', '🐱'], ['HUND', '🐶'], ['KO', '🐮'], ['GRIS', '🐷'], ['FÅR', '🐑'], ['GET', '🐐'], ['MUS', '🐭'],
  ['SOL', '☀️'], ['BIL', '🚗'], ['BOLL', '⚽'], ['KUNG', '🤴'], ['KRONA', '👑'], ['FISK', '🐟'], ['ANKA', '🦆'], ['UGGLA', '🦉'],
  ['BÅT', '⛵'], ['ÄPPLE', '🍎'], ['BJÖRN', '🐻'], ['LEJON', '🦁'], ['MÅNE', '🌙'], ['SLOTT', '🏰'], ['PRINS', '🤴'],
  ['RAKET', '🚀'], ['STJÄRNA', '⭐'], ['HJÄRTA', '❤️'], ['GULD', '🪙']
];
function ordGame() {
  const g = $('game'); g.className = 'ord';
  g.innerHTML = `<div class="word"><span class="pic" id="pic"></span><span>Skriv ordet</span></div><div class="rows" id="rows"></div>`;
  const S = { word: '', last: '', used: new Set(), boxes: [], busy: false };
  const ask = () => say(`Skriv ordet ${S.word.toLowerCase()}`);
  function layout() {
    const n = S.boxes.length; if (!n) return;
    const rows = $('rows'), gap = 22, rgap = 18;
    const avW = Math.min(innerWidth - 40, 1600), avH = $('game').clientHeight - $('pic').offsetHeight - 30;
    // en eller två rader – det som ger störst rutor
    let best = { per: n, bw: 0 };
    for (const per of n > 4 ? [n, Math.ceil(n / 2)] : [n]) {
      const nr = Math.ceil(n / per);
      // en rad = bokstaven (0.42) + rutan (1.15) + suddknappen (44 px) + mellanrum
      const bw = Math.min((avW - gap * (per - 1)) / per, ((avH - (nr - 1) * rgap) / nr - 56) / 1.57, 260);
      if (bw > best.bw) best = { per, bw };
    }
    rows.style.setProperty('--bw', Math.max(60, Math.floor(best.bw)) + 'px');
    rows.innerHTML = '';
    for (let i = 0; i < n; i += best.per) {
      const r = document.createElement('div'); r.className = 'row';
      S.boxes.slice(i, i + best.per).forEach(b => r.appendChild(b.col));
      rows.appendChild(r);
    }
  }
  function state() {
    const cur = S.boxes.find(b => !b.ok);
    for (const b of S.boxes) { b.host.classList.toggle('cur', b === cur && !b.pad.strokes.length); b.er.classList.toggle('show', !b.ok && b.pad.strokes.length > 0); }
  }
  function okBox(b) {
    b.ok = true; b.pad.locked = true; b.pad.okColor = '#25a862'; b.pad.draw(); b.host.classList.add('ok');
    ding(S.boxes.filter(x => x.ok).length);
    state();
    if (S.boxes.every(x => x.ok)) win();
  }
  function resetBox(b) { b.ok = false; b.pad.locked = false; b.pad.okColor = null; b.pad.clear(); b.host.classList.remove('ok', 'used'); }
  function makeBox(ch, i) {
    const col = document.createElement('div'); col.className = 'col';
    col.innerHTML = `<div class="let">${ch}</div><div class="pad"><div class="check">✅</div></div><button class="er" aria-label="Sudda">🧽</button>`;
    const b = { ch, i, col, host: col.querySelector('.pad'), er: col.querySelector('.er'), ok: false };
    b.pad = new Pad(b.host, { line: 0.085, onStroke: () => { b.host.classList.add('used'); msg(''); if (!S.busy && !b.ok && letterPass(letterProbs(b.pad.strokes), ch, 'auto')) okBox(b); state(); } });
    b.er.addEventListener('click', () => { if (!b.ok && !S.busy) { resetBox(b); state(); } });
    return b;
  }
  function next() {
    let pool = WORDS.filter(([w]) => !S.used.has(w) && w !== S.last);
    if (!pool.length) { S.used.clear(); pool = WORDS.filter(([w]) => w !== S.last); }
    const [w, pic] = pick(pool);
    S.used.add(w); S.word = S.last = w; S.busy = false;
    $('pic').textContent = pic;
    S.boxes = [...w].map((ch, i) => makeBox(ch, i));
    layout(); state(); msg(''); ask();
  }
  function win() {
    S.busy = true;
    msg(`${pick(PRAISE)} Du skrev ${S.word}! 🎉`, 'ok');
    setTimeout(() => say(`${pick(PRAISE)} ${S.word.toLowerCase()}!`), 250);
    reward($('rows'), S.word);
    setTimeout(next, 2600);
  }
  function check() {
    if (S.busy) return;
    let missing = 0; const bad = [];
    for (const b of S.boxes) {
      if (b.ok) continue;
      if (!b.pad.strokes.length) { missing++; continue; }
      const p = letterProbs(b.pad.strokes);
      if (letterPass(p, b.ch, 'ok')) okBox(b); else bad.push([b, letterGuess(p)]);
    }
    if (S.boxes.every(x => x.ok)) return;
    if (bad.length) {
      const [b, { ch, conf }] = bad[0];
      bad.forEach(([x]) => shake(x.host)); oops();
      if (ch && conf > 0.5 && ch !== b.ch) { msg(`I ruta ${b.i + 1} ser jag ${ch}, men där ska det stå ${b.ch}. Försök igen! 💪`, 'no'); say(`Jag ser ${ch}. Där ska det stå ${b.ch}.`); }
      else { msg(`Jag kan inte riktigt läsa ruta ${b.i + 1}. Skriv ${b.ch} en gång till! ✏️`, 'no'); say(`Skriv ${b.ch} en gång till!`); }
      S.busy = true;
      setTimeout(() => { bad.forEach(([x]) => resetBox(x)); S.busy = false; state(); }, 1400);
    } else if (missing) { msg('Skriv alla bokstäverna! ✏️', 'no'); say('Skriv alla bokstäverna!'); }
  }
  let rt = null;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 150); });
  return { next, check, ask, clear: () => { if (!S.busy) { S.boxes.forEach(b => { if (!b.ok) resetBox(b); }); state(); msg(''); } } };
}

/* ---------- Start ---------- */
const game = MODE === 'matte' ? matteGame() : MODE === 'ord' ? ordGame() : abcGame();
$('bOk').onclick = () => game.check();
$('bClear').onclick = () => game.clear();
$('bSay').onclick = () => game.ask();
$('bClear').textContent = MODE === 'ord' ? '🧽 Sudda allt' : '🧽 Sudda';
$('quit').onclick = () => {
  if (!streak) { location.href = 'index.html'; return; }
  $('doneText').textContent = `Du klarade ${streak} ${streak === 1 ? 'uppgift' : 'uppgifter'} och fick ${earned} guldmynt! 🪙`;
  $('done').classList.add('show'); fanfare();
  say(`Bra jobbat ${player.name}! Du fick ${earned} guldmynt!`);
};
$('dMore').onclick = () => { $('done').classList.remove('show'); game.ask(); };
$('dMenu').onclick = () => { location.href = 'index.html'; };
addEventListener('keydown', e => { if (e.code === 'Enter') game.check(); if (e.code === 'Escape') $('quit').click(); });

loadNets().then(() => { $('loading').remove(); game.next(); }).catch(e => { $('loading').textContent = 'Kunde inte ladda 😢 Ladda om sidan.'; console.error(e); });

window.Skola = { game, MODE, readNumber, letterProbs, letterPass };
