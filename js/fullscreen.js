/* =========================================================
   Multiskolan – helskärm på mobil och surfplatta
   - Knapp ⛶ i toppraden på varje sida (lägg data-fs-slot på behållaren).
   - iPad, Android och datorer: riktig helskärm direkt i webbläsaren.
     Helskärmen släpper när man byter sida, så nästa sida går
     tillbaka till helskärm vid första tryckningen.
   - iPhone kan inte helskärm i Safari: knappen visar hur man lägger
     Multiskolan på hemskärmen (då startar den utan webbläsarlister),
     och hur sparningen följer med dit.
   - Startad från hemskärmen: ingen knapp behövs.
   ========================================================= */
(function () {
  const FLAG = 'ms-fullscreen';
  const d = document, de = d.documentElement;
  const mm = q => window.matchMedia && matchMedia(q).matches;
  const standalone = navigator.standalone === true || mm('(display-mode: standalone)') || mm('(display-mode: fullscreen)');
  const canFs = !!(de.requestFullscreen || de.webkitRequestFullscreen) && !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
  const iPhone = /iPhone|iPod/.test(navigator.userAgent);
  const fsEl = () => d.fullscreenElement || d.webkitFullscreenElement;
  const flag = () => { try { return sessionStorage.getItem(FLAG) === '1'; } catch (e) { return false; } };
  const setFlag = on => { try { on ? sessionStorage.setItem(FLAG, '1') : sessionStorage.removeItem(FLAG); } catch (e) {} };

  function enter() {
    try {
      const p = de.requestFullscreen ? de.requestFullscreen({ navigationUI: 'hide' }) : de.webkitRequestFullscreen();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }
  function exit() {
    try {
      const p = d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen && d.webkitExitFullscreen();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }

  /* ---------- utseende ---------- */
  const css = `
  .fsBtn{display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;font-family:inherit;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
  .fsBtn svg{width:22px;height:22px;display:block;flex:0 0 auto}
  .fsBtn.pill{color:#fff}
  .fsBtn.fsPill{padding:0 14px}
  .fsBtn.fsPill svg{width:28px;height:28px}
  .fsBtn.fsFloat{position:fixed;left:14px;bottom:14px;z-index:60;border:3px solid rgba(255,255,255,.8);border-radius:999px;
    background:rgba(20,14,70,.6);color:#fff;padding:8px 12px;font-weight:700}
  .fsModal{position:fixed;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:18px;
    background:rgba(10,6,40,.72);backdrop-filter:blur(4px);font-family:'Fredoka',system-ui,sans-serif}
  .fsModal .box{background:#fff;color:#2a1f5c;border-radius:26px;max-width:440px;width:100%;padding:22px 22px 18px;
    box-shadow:0 10px 40px rgba(0,0,0,.4);max-height:92vh;overflow:auto}
  .fsModal h2{margin:0 0 6px;font-size:24px;color:#6b3fd6}
  .fsModal p{margin:6px 0 10px;font-size:16px;line-height:1.35}
  .fsModal ol{margin:0;padding-left:22px;font-size:16px;line-height:1.4}
  .fsModal li{margin:0 0 12px}
  .fsModal .ico{display:inline-block;width:20px;height:20px;vertical-align:-4px;color:#1a73e8}
  .fsModal button{font-family:inherit;font-weight:700;font-size:17px;border:none;border-radius:16px;padding:11px 16px;cursor:pointer;touch-action:manipulation}
  .fsModal .act{background:linear-gradient(180deg,#a68bff,#6b3fd6);color:#fff;box-shadow:0 4px 0 #4a2aa0;margin-top:6px}
  .fsModal .act.ok{background:linear-gradient(180deg,#7ee07a,#2fb84a);box-shadow:0 4px 0 #1f8a33}
  .fsModal .close{background:#eee9ff;color:#4a3a8a;width:100%;margin-top:8px}
  .fsModal textarea{width:100%;height:84px;border-radius:12px;border:2px solid #d6ccff;padding:8px;font-size:14px;font-family:monospace;resize:none;box-sizing:border-box}
  .fsModal .note{font-size:14px;color:#6a6094}
  .fsModal .done{color:#1f8a33;font-weight:700}`;
  const st = d.createElement('style'); st.textContent = css; d.head.appendChild(st);

  const ICON_IN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  const ICON_OUT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>';
  const SHARE = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M8 10H5v11h14V10h-3"/></svg>';

  function modal(html) {
    const m = d.createElement('div'); m.className = 'fsModal';
    m.innerHTML = `<div class="box">${html}<button class="close" type="button">Stäng</button></div>`;
    m.addEventListener('click', e => { if (e.target === m || e.target.classList.contains('close')) m.remove(); });
    d.body.appendChild(m);
    return m;
  }

  /* ---------- iPhone: hemskärmen ---------- */
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(() => true, () => fallbackCopy(t));
    return Promise.resolve(fallbackCopy(t));
  }
  function fallbackCopy(t) {
    const a = d.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.position = 'fixed'; a.style.opacity = '0';
    d.body.appendChild(a); a.select(); a.setSelectionRange(0, t.length);
    let ok = false; try { ok = d.execCommand('copy'); } catch (e) {}
    a.remove(); return ok;
  }
  function iphoneHelp() {
    const hasSave = window.Save && Save.players().length > 0;
    const m = modal(`
      <h2>Helskärm på iPhone</h2>
      <p>iPhone kan inte visa spel i helskärm i Safari. Lägg Multiskolan på hemskärmen istället – då öppnas den utan Safaris lister.</p>
      <ol>
        ${hasSave ? `<li>Hemskärmsappen får en egen sparning. Kopiera sparningen först så följer gubbarna, kläderna och guldet med:<br>
          <button class="act" type="button" data-copy>📋 Kopiera sparningen</button> <span class="done" data-copied hidden>Kopierad ✓</span></li>` : ''}
        <li>Tryck på dela-knappen ${SHARE} i Safari och välj <b>Lägg till på hemskärmen</b>.</li>
        <li>Öppna Multiskolan från hemskärmen.${hasSave ? ' Tryck på <b>📥 Hämta sparning</b> och klistra in.' : ''}</li>
      </ol>`);
    const b = m.querySelector('[data-copy]');
    if (b) b.addEventListener('click', () => {
      copyText(Save.exportCode()).then(ok => { const s = m.querySelector('[data-copied]'); s.hidden = false; s.textContent = ok ? 'Kopierad ✓' : 'Gick inte att kopiera'; });
    });
  }

  /* ---------- hemskärmsappen: hämta sparning från Safari ---------- */
  function importDialog(btn) {
    const m = modal(`
      <h2>Hämta sparning</h2>
      <p>Klistra in sparningen du kopierade i Safari (håll fingret i rutan och välj <b>Klistra in</b>).</p>
      <textarea data-code placeholder="MULTISKOLAN:…"></textarea>
      <button class="act ok" type="button" data-go>📥 Hämta</button>
      <p class="note" data-res></p>`);
    const ta = m.querySelector('[data-code]'), res = m.querySelector('[data-res]');
    if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(t => { if (t && t.indexOf('MULTISKOLAN:') >= 0 && !ta.value) ta.value = t.trim(); }, () => {});
    m.querySelector('[data-go]').addEventListener('click', () => {
      const r = window.Save ? Save.importCode(ta.value) : 0;
      if (r > 0) {
        try { localStorage.setItem('ms-imported', '1'); } catch (e) {}
        res.className = 'note done'; res.textContent = `Klart! ${r} ${r === 1 ? 'gubbe' : 'gubbar'} hämtade.`;
        if (btn) btn.remove();
        setTimeout(() => location.reload(), 900);
      } else { res.className = 'note'; res.textContent = 'Det där ser inte ut som en sparning. Kopiera igen i Safari och försök en gång till.'; }
    });
  }

  /* ---------- knappen ---------- */
  function setup() {
    const slot = d.querySelector('[data-fs-slot]');
    if (standalone) {
      // hemskärmsappen på iPhone: erbjud att hämta sparningen från Safari (bara på menyn, tills det är gjort)
      let done = false; try { done = localStorage.getItem('ms-imported') === '1'; } catch (e) {}
      if (iPhone && !done && d.getElementById('player') && window.Save && Save.importCode) {
        const b = d.createElement('button'); b.type = 'button'; b.className = 'fsBtn fsFloat'; b.textContent = '📥 Hämta sparning';
        b.addEventListener('click', () => importDialog(b));
        d.body.appendChild(b);
      }
      return;
    }
    if (!canFs && !iPhone) return;                       // ingen helskärm att erbjuda
    const label = slot && slot.dataset.fsLabel;
    const b = d.createElement('button');
    b.type = 'button';
    b.className = 'fsBtn ' + (slot ? (slot.dataset.fsClass || '') : 'fsFloat');
    b.setAttribute('aria-label', 'Helskärm');
    const paint = () => {
      const on = !!fsEl();
      b.innerHTML = (on ? ICON_OUT : ICON_IN) + (label ? `<span>${on ? 'Liten skärm' : label}</span>` : '');
      b.setAttribute('aria-label', on ? 'Avsluta helskärm' : 'Helskärm');
    };
    paint();
    b.addEventListener('click', e => {
      e.stopPropagation();
      if (!canFs) { iphoneHelp(); return; }
      if (fsEl()) { setFlag(false); exit(); } else { setFlag(true); enter(); }
    });
    (slot || d.body).appendChild(b);
    d.addEventListener('fullscreenchange', paint);
    d.addEventListener('webkitfullscreenchange', paint);
  }

  /* ---------- helskärmen följer med till nästa sida ---------- */
  if (canFs && !standalone) {
    let leaving = false;
    const leave = () => { leaving = true; };
    addEventListener('pagehide', leave);
    addEventListener('beforeunload', leave);
    d.addEventListener('click', e => { if (e.target.closest && e.target.closest('a[href],[data-href]')) { leaving = true; setTimeout(() => { leaving = false; }, 3000); } }, true);
    // lämnar man helskärmen själv (iPadens X eller Esc) ska nästa sida inte gå in i helskärm igen
    const onChange = () => {
      if (fsEl()) return;
      setTimeout(() => { if (!leaving && d.visibilityState === 'visible' && !fsEl()) setFlag(false); }, 1500);
    };
    d.addEventListener('fullscreenchange', onChange);
    d.addEventListener('webkitfullscreenchange', onChange);
    // första tryckningen på en ny sida tar tillbaka helskärmen
    if (flag()) {
      const again = () => {
        if (!flag() || fsEl()) return off();
        enter(); off();
      };
      const off = () => { for (const ev of ['pointerup', 'touchend', 'click', 'keydown']) d.removeEventListener(ev, again, true); };
      for (const ev of ['pointerup', 'touchend', 'click', 'keydown']) d.addEventListener(ev, again, true);
    }
  }

  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', setup); else setup();
  window.Fullscreen = { enter, exit, canFs, standalone, iPhone };
})();
