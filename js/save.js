/* =========================================================
   Multiskolan – sparsystem
   - All data ligger under EN fast nyckel som aldrig byter namn.
   - Ny kod fyller på saknade fält, den skriver aldrig över
     befintliga framsteg med tomma värden.
   - Gamla sparformat uppgraderas (och en backup sparas först).
   - Är sparfilen trasig sparas en backup innan något görs.
   ========================================================= */
(function () {
  const KEY = 'multiskolan-save';
  const VERSION = 2;

  function defaults() {
    return {
      version: VERSION,
      players: [],             // [{ id, name, gender, look, progress, coins, unlocked, createdAt }]
      activeId: null,
      settings: { sound: true }
    };
  }
  const emptyProgress = () => ({ abc: {}, matte: {}, ord: {} });
  const uid = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);

  // Lägger in sparad data ovanpå standardvärdena (sparad data vinner alltid)
  function merge(base, saved) {
    if (!isObj(saved)) return base;
    for (const k of Object.keys(saved)) {
      if (isObj(base[k]) && isObj(saved[k])) merge(base[k], saved[k]);
      else if (saved[k] !== undefined) base[k] = saved[k];
    }
    return base;
  }

  function migrate(d, raw) {
    // v1 -> v2: en spelare blir en lista med spelare, framstegen följer med
    if ((d.version || 1) < 2) {
      if (raw) { try { localStorage.setItem(KEY + '-v1-backup', raw); } catch (e) {} }
      if (d.player && !d.players.length) {
        d.players.push({
          id: uid(),
          name: d.player.name,
          gender: d.player.gender,
          look: d.player.look,
          createdAt: d.player.createdAt || new Date().toISOString(),
          progress: merge(emptyProgress(), d.progress || {})
        });
        d.activeId = d.players[0].id;
      }
      delete d.player;
      delete d.progress;
    }
    if (!Array.isArray(d.players)) d.players = [];
    d.players.forEach(p => {
      p.progress = merge(emptyProgress(), p.progress || {});
      if (typeof p.coins !== 'number' || !(p.coins >= 0)) p.coins = 0;
      if (!Array.isArray(p.unlocked)) p.unlocked = [];
    });
    if (d.activeId && !d.players.some(p => p.id === d.activeId)) d.activeId = null;
    d.version = VERSION;
    return d;
  }

  let cache = null;

  function load() {
    if (cache) return cache;
    let raw = null, saved = null;
    try { raw = localStorage.getItem(KEY); } catch (e) {}
    if (raw) {
      try { saved = JSON.parse(raw); }
      catch (e) {
        try { localStorage.setItem(KEY + '-backup-' + Date.now(), raw); } catch (e2) {}
      }
    }
    const wasVersion = saved && saved.version;
    cache = migrate(merge(defaults(), saved || {}), raw);
    if (saved && wasVersion !== VERSION) save();
    return cache;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(cache)); return true; }
    catch (e) { return false; }
  }

  function update(fn) { load(); fn(cache); return save(); }

  /* ---------- Spelare ---------- */
  const players = () => load().players;
  const get = id => players().find(p => p.id === id) || null;
  const active = () => get(load().activeId);
  function addPlayer({ name, gender, look }) {
    const p = { id: uid(), name, gender, look, createdAt: new Date().toISOString(), progress: emptyProgress(), coins: 0, unlocked: [] };
    update(d => { d.players.push(p); d.activeId = p.id; });
    return p;
  }
  function updatePlayer(id, fn) { update(() => { const p = get(id); if (p) fn(p); }); }
  function removePlayer(id) {
    update(d => {
      d.players = d.players.filter(p => p.id !== id);
      if (d.activeId === id) d.activeId = null;
    });
  }
  function setActive(id) { update(d => { d.activeId = id; }); }

  /* ---------- Guldmynt och upplåsta saker ---------- */
  function addCoins(id, n) {
    let total = 0;
    updatePlayer(id, p => { p.coins = Math.max(0, (p.coins || 0) + Math.round(n)); total = p.coins; });
    return total;
  }
  const owns = (id, key) => { const p = get(id); return !!(p && p.unlocked.includes(key)); };
  function buy(id, key, price) {
    const p = get(id);
    if (!p || p.unlocked.includes(key) || p.coins < price) return false;
    updatePlayer(id, q => { q.coins -= price; q.unlocked.push(key); });
    return true;
  }

  /* ---------- Flytta sparningen (t.ex. från Safari till hemskärmsappen på iPhone) ---------- */
  function exportCode() {
    const json = JSON.stringify(load());
    return 'MULTISKOLAN:' + btoa(unescape(encodeURIComponent(json)));
  }
  // Lägger till gubbarna från koden. Finns samma gubbe redan ersätts den. Returnerar antal hämtade gubbar.
  function importCode(code) {
    const i = (code || '').indexOf('MULTISKOLAN:');
    if (i < 0) return 0;
    let data;
    try { data = JSON.parse(decodeURIComponent(escape(atob(code.slice(i + 12).replace(/\s+/g, ''))))); } catch (e) { return 0; }
    if (!isObj(data)) return 0;
    data = migrate(merge(defaults(), data), null);
    if (!data.players.length) return 0;
    try { const raw = localStorage.getItem(KEY); if (raw) localStorage.setItem(KEY + '-backup-' + Date.now(), raw); } catch (e) {}
    update(d => {
      for (const p of data.players) {
        const j = d.players.findIndex(q => q.id === p.id);
        if (j >= 0) d.players[j] = p; else d.players.push(p);
      }
      if (!d.activeId || !d.players.some(p => p.id === d.activeId)) d.activeId = data.activeId && d.players.some(p => p.id === data.activeId) ? data.activeId : d.players[0].id;
      if (isObj(data.settings)) d.settings = merge(d.settings || {}, data.settings);
    });
    return data.players.length;
  }

  window.Save = { load, save, update, KEY, players, get, active, addPlayer, updatePlayer, removePlayer, setActive, addCoins, owns, buy, exportCode, importCode };
})();
