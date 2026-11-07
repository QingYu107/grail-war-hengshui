// 极简 CDP 驱动：用 Edge/Chrome headless 打开页面，执行脚本，截图。
// 用法：
//   node tools/cdp.js flow
//   node tools/cdp.js mobile
//   node tools/cdp.js shot <url> <out.png> [w] [h]
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PORT = 9333 + Math.floor(Math.random() * 300);
const ROOT = path.resolve(__dirname, '..');
const BASE = 'file:///' + ROOT.replace(/\\/g, '/') + '/index.html';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function waitDevtools() {
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`, { signal: AbortSignal.timeout(1200) });
      if (r.ok) return await r.json();
    } catch (e) { }
    await sleep(250);
  }
  throw new Error('devtools 没起来');
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); rej(new Error('timeout ' + method)); }
      }, 30000);
    });
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', {
      expression: expr, awaitPromise: true, returnByValue: true, userGesture: true
    });
    if (r.exceptionDetails) throw new Error('JS: ' + (r.exceptionDetails.exception && r.exceptionDetails.exception.description || r.exceptionDetails.text));
    return r.result.value;
  }
  async shot(file) {
    const r = await this.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
    return file;
  }
}

async function openPage(url, w, h, mobile) {
  await waitDevtools();
  const nr = await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' });
  const target = await nr.json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res);
    ws.addEventListener('error', () => rej(new Error('ws error')));
    setTimeout(() => rej(new Error('ws open timeout')), 8000);
  });
  const c = new CDP(ws);
  await c.send('Page.enable');
  await c.send('Runtime.enable');
  await c.send('Emulation.setDeviceMetricsOverride', {
    width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile: !!mobile
  });
  if (mobile) {
    await c.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await c.send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    });
  }
  await c.send('Page.navigate', { url });
  for (let i = 0; i < 120; i++) {
    const ready = await c.eval('document.readyState').catch(() => '');
    if (ready === 'complete') break;
    await sleep(120);
  }
  await sleep(700);
  return c;
}

async function launch() {
  const proc = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--allow-file-access-from-files', '--autoplay-policy=no-user-gesture-required',
    '--remote-allow-origins=*', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + path.join(process.env.TEMP || '.', 'cdp-' + PORT),
    'about:blank'
  ], { stdio: 'ignore' });
  return proc;
}

const FLOW = `
(async () => {
  const L = [];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const q = s => document.querySelector(s);
  const err = () => { const e = document.getElementById('errbox'); return e ? e.textContent.replace(/\\s+/g,' ').slice(0,260) : 'none'; };
  L.push('boot errbox: ' + err());
  const b = q('#btn-start'); L.push('cover btn ' + !!b); if (b) b.click();
  await sleep(300);
  if (!q('#screen-quiz.is-active')) { if (b) b.click(); await sleep(300); }
  L.push('quiz active ' + !!q('#screen-quiz.is-active') + ' choices ' + document.querySelectorAll('#quiz-root .choice').length);
  for (let i = 0; i < 12; i++) {
    if (!q('#screen-quiz.is-active')) break;
    const cs = document.querySelectorAll('#quiz-root .choice');
    if (!cs.length) { L.push('NO CHOICE at ' + i); break; }
    cs[0].click(); await sleep(140);
    L.push('q' + (i+1) + ' -> ' + (q('#screen-assign.is-active') ? 'ASSIGN' : (q('#screen-quiz.is-active') ? 'quiz' : 'other')));
  }
  await sleep(200);
  L.push('assign active ' + !!q('#screen-assign.is-active') + ' | ' + err());
  const sg = q('#btn-sign'); L.push('sign btn ' + !!sg);
  if (sg) { sg.click(); await sleep(500); }
  L.push('game active ' + !!q('#screen-game.is-active'));
  const sr = q('#story-root');
  L.push('story chars ' + (sr ? sr.textContent.trim().length : -1) + ' | hud ' + document.querySelectorAll('#hud .cell').length + ' | dossier ' + (q('#dossier')||{}).innerHTML.length);
  for (let k = 0; k < 10; k++) {
    const mapCard = q('.map-card');
    const mapDone = q('#map-done');
    const opts = document.querySelectorAll('#opts .choice:not([disabled])');
    const next = q('#beat-actions .btn--solid');
    const wish = q('#wish-list .choice');
    const battleBtn = q('.bmenu .btn');
    if (battleBtn) { battleBtn.click(); L.push('battle act'); }
    else if (mapDone) { mapDone.click(); L.push('map done'); }
    else if (mapCard) { mapCard.click(); L.push('map pick'); }
    else if (wish) { wish.click(); L.push('wish'); }
    else if (opts.length) { opts[0].click(); L.push('option'); }
    else if (next) { next.click(); L.push('continue slot ' + (window.GRAIL ? GRAIL.Engine.state().s.slot : '?')); }
    else { L.push('STUCK k=' + k + ' | ' + err()); break; }
    await sleep(520);
  }
  const st = window.GRAIL ? GRAIL.Engine.state() : null;
  L.push('state day ' + (st ? st.s.day : '?') + ' slot ' + (st ? st.s.slot : '?') + ' san ' + (st ? st.s.san : '?'));
  L.push('audio now "' + (q('#audio-now')||{}).textContent + '" | GrailAudio ' + (window.GrailAudio ? 'ok tracks=' + (window.GrailAudio.tracks||[]).length : 'MISSING'));
  L.push('final errbox: ' + err());
  return L.join('\\n');
})()
`;

(async () => {
  const mode = process.argv[2] || 'flow';
  const proc = await launch();
  try {
    if (mode === 'flow') {
      const c = await openPage(BASE, 1200, 1000, false);
      const out = await c.eval(FLOW);
      console.log(out);
      await c.shot(path.join(ROOT, 'tools', 'shot_flow.png'));
      c.ws.close();
    } else if (mode === 'mobile') {
      const c = await openPage(BASE, 390, 844, true);
      await c.shot(path.join(ROOT, 'tools', 'm_cover.png'));
      const L = [];
      L.push('cover start visible ' + await c.eval("!!document.querySelector('#btn-start').offsetParent"));
      await c.eval("document.querySelector('#btn-start').click()");
      await sleep(400);
      if (!await c.eval("!!document.querySelector('#screen-quiz.is-active')")) {
        await c.eval("document.querySelector('#btn-start').click()"); await sleep(400);
      }
      await c.shot(path.join(ROOT, 'tools', 'm_quiz.png'));
      for (let i = 0; i < 12; i++) {
        const on = await c.eval("!!document.querySelector('#screen-quiz.is-active')");
        if (!on) break;
        await c.eval("document.querySelector('#quiz-root .choice').click()");
        await sleep(150);
      }
      await c.shot(path.join(ROOT, 'tools', 'm_assign.png'));
      await c.eval("var s=document.querySelector('#btn-sign'); if(s) s.click(); 1");
      await sleep(700);
      await c.shot(path.join(ROOT, 'tools', 'm_game.png'));
      L.push('game active ' + await c.eval("!!document.querySelector('#screen-game.is-active')"));
      L.push('drawer toggle visible ' + await c.eval("!!document.querySelector('#side-toggle').offsetParent"));
      L.push('body scrollWidth ' + await c.eval('document.documentElement.scrollWidth') + ' / innerWidth ' + await c.eval('innerWidth'));
      L.push('overflowing els ' + await c.eval(`(() => { const w = innerWidth; return [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > w + 1).length; })()`));
      L.push('btn min height ' + await c.eval(`(() => { const b=document.querySelector('#story-root .btn')||document.querySelector('.btn'); return b?Math.round(b.getBoundingClientRect().height):-1; })()`));
      L.push('errbox ' + await c.eval(`(() => { const e=document.getElementById('errbox'); return e?e.textContent.replace(/\\s+/g,' ').slice(0,200):'none'; })()`));
      await c.eval("document.querySelector('#side-toggle').click(); 1");
      await sleep(500);
      await c.shot(path.join(ROOT, 'tools', 'm_drawer.png'));
      L.push('drawer open ' + await c.eval("document.querySelector('#side').classList.contains('open')"));
      console.log(L.join('\n'));
      c.ws.close();
    } else if (mode === 'audio') {
      const c = await openPage(BASE, 1200, 900, false);
      await c.eval("document.querySelector('#btn-start').click()");
      await sleep(1200);
      const info = await c.eval(`(() => {
        const out = [];
        const els = [...document.querySelectorAll('audio')];
        out.push('audio els ' + els.length);
        els.forEach((e, i) => out.push('  #' + i + ' src=' + (e.src||'').split('/').pop() + ' ready=' + e.readyState + ' dur=' + (isFinite(e.duration)?e.duration.toFixed(2):'NA') + ' paused=' + e.paused + ' vol=' + e.volume.toFixed(2)));
        out.push('theme ' + (window.GrailAudio ? GrailAudio.current() : '?'));
        out.push('muted ' + (window.GrailAudio ? GrailAudio.isMuted() : '?'));
        out.push('audio-now text "' + (document.getElementById('audio-now')||{}).textContent + '"');
        return out.join(String.fromCharCode(10));
      })()`);
      console.log(info);
      await sleep(1500);
      const info2 = await c.eval(`(() => {
        const els=[...document.querySelectorAll('audio')];
        return els.map((e,i)=>'#'+i+' t='+e.currentTime.toFixed(2)+' paused='+e.paused).join(' | ');
      })()`);
      console.log('after 1.5s: ' + info2);
      c.ws.close();
    } else if (mode === 'audio2') {
      const c = await openPage(BASE, 1200, 900, false);
      const res = await c.eval(`new Promise(res => {
        const out = [];
        const ids = ['saber','archer','lancer','rider','caster','assassin','berserker','ruler','foreigner'];
        let n = 0;
        ids.forEach(id => {
          const a = new Audio();
          let done = false;
          const fin = s => { if (done) return; done = true; out.push(id + ':' + s); if (++n === ids.length) res(out.join(String.fromCharCode(10))); };
          a.oncanplaythrough = () => fin('OK dur=' + a.duration.toFixed(1) + 's');
          a.onerror = () => fin('ERR code=' + (a.error && a.error.code));
          setTimeout(() => fin('TIMEOUT rs=' + a.readyState), 5000);
          a.preload = 'auto';
          a.src = 'assets/audio/' + id + '.mp3';
          a.load();
        });
      })`);
      console.log(res);
      c.ws.close();
    } else if (mode === 'audio3') {
      const c = await openPage(BASE, 1200, 900, false);
      await c.eval(`window.__AUDIO_LOG = []; (function () {
        const Orig = window.Audio;
        function Hook(u) { const a = new Orig(u); window.__AUDIO_LOG.push(a); return a; }
        Hook.prototype = Orig.prototype;
        window.Audio = Hook;
        return 1;
      })()`);
      await c.eval("document.querySelector('#btn-start').click()");
      await sleep(3000);
      const r1 = await c.eval(`(() => window.__AUDIO_LOG.map((a, i) => '#' + i + ' ' + (a.src || '').split('/').pop() + ' rs=' + a.readyState + ' paused=' + a.paused + ' t=' + (a.currentTime || 0).toFixed(2) + ' vol=' + a.volume.toFixed(2)).join(String.fromCharCode(10)))()`);
      console.log('audio objects after start:');
      console.log(r1 || '(none)');
      await sleep(2500);
      const r2 = await c.eval(`(() => window.__AUDIO_LOG.map((a, i) => '#' + i + ' t=' + (a.currentTime || 0).toFixed(2) + ' paused=' + a.paused).join(' | '))()`);
      console.log('after 2.5s: ' + r2);
      const r3 = await c.eval("(window.GrailAudio ? GrailAudio.current() : '?') + ' / now=' + JSON.stringify((document.getElementById('audio-now')||{}).textContent)");
      console.log('theme: ' + r3);
      c.ws.close();
    } else if (mode === 'audio4') {
      const c = await openPage(BASE, 1200, 900, false);
      await c.eval(`window.__AUDIO_LOG = []; (function () {
        const Orig = window.Audio;
        function Hook(u) { const a = new Orig(u); window.__AUDIO_LOG.push(a); return a; }
        Hook.prototype = Orig.prototype;
        window.Audio = Hook;
        return 1;
      })()`);
      // 真实指针事件（合成 click 不产生 pointerdown，音频不会 init）
      const box = await c.eval(`(() => { const r = document.querySelector('#btn-start').getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; })()`);
      await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
      await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
      await sleep(3500);
      const r1 = await c.eval(`(() => window.__AUDIO_LOG.map((a, i) => '#' + i + ' ' + (a.src || '').split('/').pop() + ' rs=' + a.readyState + ' paused=' + a.paused + ' t=' + (a.currentTime || 0).toFixed(2) + ' vol=' + a.volume.toFixed(2)).join(String.fromCharCode(10)))()`);
      console.log('after real click:');
      console.log(r1 || '(none)');
      const r3 = await c.eval("(window.GrailAudio ? GrailAudio.current() : '?') + ' | now=' + JSON.stringify((document.getElementById('audio-now')||{}).textContent) + ' | errbox=' + JSON.stringify(((document.getElementById('errbox')||{}).textContent)||'none')");
      console.log('theme: ' + r3);
      await c.shot(path.join(ROOT, 'tools', 'shot_audio.png'));
      c.ws.close();
    } else if (mode === 'audio5') {
      const c = await openPage(BASE, 1200, 900, false);
      await c.eval(`window.__AUDIO_LOG = []; (function () {
        const Orig = window.Audio;
        function Hook(u) { const a = new Orig(u); window.__AUDIO_LOG.push(a); return a; }
        Hook.prototype = Orig.prototype;
        window.Audio = Hook;
        return 1;
      })()`);
      const box = await c.eval(`(() => { const r = document.querySelector('#btn-start').getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }; })()`);
      await c.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
      await c.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
      await sleep(400);
      if (!await c.eval("!!document.querySelector('#screen-quiz.is-active')")) {
        await c.eval("document.querySelector('#btn-start').click()"); await sleep(400);
      }
      for (let i = 0; i < 12; i++) {
        if (!await c.eval("!!document.querySelector('#screen-quiz.is-active')")) break;
        await c.eval("document.querySelector('#quiz-root .choice').click()"); await sleep(140);
      }
      await sleep(300);
      await c.eval("var s=document.querySelector('#btn-sign'); if(s) s.click(); 1");
      await sleep(4000);
      const r1 = await c.eval(`(() => window.__AUDIO_LOG.map((a, i) => '#' + i + ' ' + (a.src || '').split('/').pop() + ' rs=' + a.readyState + ' paused=' + a.paused + ' t=' + (a.currentTime || 0).toFixed(2) + ' vol=' + a.volume.toFixed(2)).join(String.fromCharCode(10)))()`);
      console.log('after signing:');
      console.log(r1 || '(none)');
      await sleep(3000);
      const r2 = await c.eval(`(() => window.__AUDIO_LOG.filter(a => (a.src||'').indexOf('.mp3') > 0).map(a => (a.src.split('/').pop()) + ' t=' + a.currentTime.toFixed(2) + ' paused=' + a.paused + ' vol=' + a.volume.toFixed(2)).join(' | '))()`);
      console.log('mp3 state: ' + (r2 || '(none)'));
      console.log('theme: ' + await c.eval("(window.GrailAudio ? GrailAudio.current() : '?') + ' | now=' + JSON.stringify((document.getElementById('audio-now')||{}).textContent)"));
      c.ws.close();
    } else if (mode === 'long') {
      const c = await openPage(BASE, 1200, 1000, false);
      await c.eval("document.querySelector('#btn-start').click()");
      await sleep(400);
      if (!await c.eval("!!document.querySelector('#screen-quiz.is-active')")) { await c.eval("document.querySelector('#btn-start').click()"); await sleep(400); }
      for (let i = 0; i < 12; i++) {
        if (!await c.eval("!!document.querySelector('#screen-quiz.is-active')")) break;
        await c.eval("document.querySelector('#quiz-root .choice').click()"); await sleep(130);
      }
      await sleep(300);
      await c.eval("var s=document.querySelector('#btn-sign'); if(s) s.click(); 1");
      await sleep(500);
      const L = [];
      for (let k = 0; k < 90; k++) {
        const st = await c.eval(`(() => {
          const q = s => document.querySelector(s);
          const st = window.GRAIL ? GRAIL.Engine.state() : null;
          return {
            screen: ['title','quiz','assign','game','ending'].filter(x => q('#screen-' + x + '.is-active'))[0] || '?',
            day: st ? st.s.day : -1, slot: st ? st.s.slot : -1, san: st ? st.s.san : -1,
            beat: st ? st.s.beat : -1, exposure: st ? st.s.exposure : -1,
            opts: document.querySelectorAll('#opts .choice:not([disabled])').length,
            next: !!q('#beat-actions .btn--solid'),
            wish: !!q('#wish-list .choice'),
            err: q('#errbox') ? q('#errbox').textContent.slice(0,120) : ''
          };
        })()`);
        L.push('[' + k + '] ' + st.screen + ' d' + st.day + '.s' + st.slot + ' san' + st.san + ' beast' + st.beat + ' exp' + st.exposure + ' opts' + st.opts + (st.next ? ' next' : '') + (st.wish ? ' wish' : '') + (st.err ? ' ERR:' + st.err : ''));
        if (st.screen === 'ending') { L.push('ENDING reached'); break; }
        if (st.screen !== 'game') { L.push('LEFT GAME'); break; }
        if (st.wish) await c.eval("document.querySelector('#wish-list .choice').click()");
        else if (st.opts > 0) await c.eval("document.querySelectorAll('#opts .choice:not([disabled])')[0].click()");
        else if (st.next) await c.eval("document.querySelector('#beat-actions .btn--solid').click()");
        else { L.push('STUCK: nothing clickable'); break; }
        await sleep(430);
      }
      console.log(L.join(String.fromCharCode(10)));
      await c.shot(path.join(ROOT, 'tools', 'shot_long.png'));
      c.ws.close();
    } else if (mode === 'misc') {
      const c = await openPage(BASE, 1200, 1000, false);
      await c.eval("localStorage.clear(); 1");
      await c.send('Page.reload');
      await sleep(900);
      await c.eval("document.querySelector('#btn-start').click()");
      await sleep(400);
      if (!await c.eval("!!document.querySelector('#screen-quiz.is-active')")) { await c.eval("document.querySelector('#btn-start').click()"); await sleep(400); }
      for (let i = 0; i < 12; i++) {
        if (!await c.eval("!!document.querySelector('#screen-quiz.is-active')")) break;
        await c.eval("document.querySelector('#quiz-root .choice').click()"); await sleep(120);
      }
      await sleep(250);
      await c.eval("var s=document.querySelector('#btn-sign'); if(s) s.click(); 1");
      await sleep(500);
      const before = await c.eval("JSON.stringify((() => { const st = GRAIL.Engine.state(); return { d: st.s.day, s: st.s.slot, sv: st.servantId }; })())");
      const saved = await c.eval("!!localStorage.getItem('grail_hengshui_save_v1')");
      console.log('before reload: ' + before + ' | save exists ' + saved);
      await c.send('Page.reload');
      await sleep(900);
      const contOk = await c.eval("!!document.querySelector('#btn-continue') && !document.querySelector('#btn-continue').disabled");
      console.log('continue btn: ' + contOk);
      await c.eval("document.querySelector('#btn-continue').click()");
      await sleep(600);
      const after = await c.eval("JSON.stringify((() => { const st = GRAIL.Engine.state(); return st ? { d: st.s.day, s: st.s.slot, sv: st.servantId } : null; })())");
      console.log('after continue: ' + after + ' | game screen ' + await c.eval("!!document.querySelector('#screen-game.is-active')"));
      // 结局 → 重新入学
      await c.eval("location.hash='#dev=ending'; 1");
      await c.send('Page.reload');
      await sleep(1400);
      const endActive = await c.eval("!!document.querySelector('#screen-ending.is-active')");
      console.log('ending screen: ' + endActive);
      const hasAgain = await c.eval("!!document.querySelector('#btn-again')");
      console.log('again btn: ' + hasAgain);
      if (hasAgain) { await c.eval("document.querySelector('#btn-again').click()"); await sleep(600); }
      console.log('after again: quiz ' + await c.eval("!!document.querySelector('#screen-quiz.is-active')") + ' | errbox ' + JSON.stringify(await c.eval("((document.getElementById('errbox')||{}).textContent||'none').slice(0,200)")));
      c.ws.close();
    } else if (mode === 'ending') {
      const c = await openPage(BASE + '#dev=ending', 1200, 1100, false);
      await sleep(4000);
      const info = await c.eval(`JSON.stringify({
        layers: document.querySelectorAll('.fx-layer').length,
        bursts: document.querySelectorAll('.fx-burst').length,
        ending: !!document.querySelector('#screen-ending.is-active'),
        err: ((document.getElementById('errbox')||{}).textContent||'none').slice(0,160)
      })`);
      console.log('after 4s: ' + info);
      await c.shot(path.join(ROOT, 'tools', 't_ending.png'));
      await sleep(2500);
      console.log('after 6.5s: ' + await c.eval("JSON.stringify({layers: document.querySelectorAll('.fx-layer').length, bursts: document.querySelectorAll('.fx-burst').length})"));
      c.ws.close();
    } else if (mode === 'panels') {
      const c = await openPage(BASE + '#dev=game', 1200, 1000, false);
      await sleep(900);
      console.log('state probe: ' + await c.eval("JSON.stringify({keys: Object.keys(GRAIL.Engine.state()), sKeys: Object.keys(GRAIL.Engine.state().s), servantTop: GRAIL.Engine.state().servantId, servantInner: GRAIL.Engine.state().s.servantId, tracks: (window.GrailAudio&&GrailAudio.tracks||[]).map(t=>t.id)})"));
      for (const tab of ['intel', 'codex', 'audio']) {
        await c.eval("document.querySelector('[data-tab=\"" + tab + "\"]').click(); 1");
        await sleep(500);
        await c.shot(path.join(ROOT, 'tools', 'p_' + tab + '.png'));
        console.log('shot ' + tab);
      }
      console.log('locked entries: ' + await c.eval("document.querySelectorAll('.codex-locked').length"));
      c.ws.close();
    } else if (mode === 'battle') {
      const c = await openPage(BASE + '#dev=battle', 1200, 1000, false);
      await sleep(900);
      const L = [];
      for (let i = 0; i < 24; i++) {
        const st = await c.eval(`(() => {
          const q = s => document.querySelector(s);
          const acts = [...document.querySelectorAll('.bmenu .btn')].map(b => b.textContent.trim());
          return {
            turn: (q('.scene-head .meta')||{}).textContent || '',
            foe: (q('.bs')||{}).textContent || '',
            hud: (q('.bhud')||{}).textContent || '',
            acts,
            over: !!q('#bt-done'),
            last: (q('.blog .bl:last-child')||{}).textContent || '',
            san: (q('.bhud')||{}).textContent || ''
          };
        })()`);
        L.push('[' + i + '] ' + st.turn + ' | ' + st.foe + ' | acts=' + st.acts.join(',') + (st.over ? ' | OVER' : ''));
        if (st.over) break;
        if (!st.acts.length) { L.push('NO ACTIONS'); break; }
        // 有 MP 就先放宝具，否则普通攻击
        const useNoble = st.acts.some(a => a.indexOf('真名') >= 0);
        const pick = useNoble ? "document.querySelectorAll('.bmenu .btn')[2]" : "document.querySelectorAll('.bmenu .btn')[0]";
        await c.eval(pick + ".click(); 1");
        await sleep(650);
      }
      console.log(L.join(String.fromCharCode(10)));
      console.log('result: ' + await c.eval("((document.querySelector('.bt-result')||{}).textContent||'(none)').slice(0,160)"));
      console.log('errbox: ' + await c.eval("((document.getElementById('errbox')||{}).textContent||'none').slice(0,200)"));
      await c.shot(path.join(ROOT, 'tools', 't_battle2.png'));
      c.ws.close();
    } else if (mode === 'd6b') {
      const c = await openPage(BASE + '#dev=d6b', 1200, 900, false);
      await sleep(1200);
      const has = await c.eval("!!document.querySelector('#opts .choice')");
      console.log('choices: ' + await c.eval("document.querySelectorAll('#opts .choice').length"));
      const idx = await c.eval(`(() => {
        const cs = [...document.querySelectorAll('#opts .choice')];
        return cs.findIndex(b => b.textContent.indexOf('走廊尽头') >= 0);
      })()`);
      console.log('battle option index: ' + idx);
      if (idx < 0) { c.ws.close(); return; }
      await c.eval("document.querySelectorAll('#opts .choice')[" + idx + "].click(); 1");
      await sleep(1200);
      console.log('battle layer: ' + await c.eval("!!document.querySelector('.battle-layer.on')"));
      for (let i = 0; i < 20; i++) {
        const st = await c.eval(`(() => {
          const q = s => document.querySelector(s);
          return { over: !!q('#bt-done'), acts: [...document.querySelectorAll('.bmenu .btn')].map(b => b.textContent.trim()), text: (q('.btext')||{}).textContent || '' };
        })()`);
        if (st.over) { console.log('over at ' + i + ' | ' + st.text.slice(0, 60)); break; }
        if (!st.acts.length) { console.log('no acts at ' + i); break; }
        await c.eval(`(() => {
          const bs = [...document.querySelectorAll('.bmenu .btn')];
          const noble = bs.find(b => b.textContent.trim() === '宝具' && !b.disabled);
          const atk = bs.find(b => b.textContent.trim() === '交手');
          (noble || atk || bs[0]).click();
          return 1;
        })()`);
        await sleep(560);
      }
      await c.eval("var b=document.querySelector('#bt-done'); if(b) b.click(); 1");
      await sleep(700);
      console.log('back to story: ' + await c.eval("!!document.querySelector('#beat-actions')") + ' | layer off ' + await c.eval("!document.querySelector('.battle-layer.on')"));
      console.log('errbox: ' + await c.eval("((document.getElementById('errbox')||{}).textContent||'none').slice(0,180)"));
      await c.shot(path.join(ROOT, 'tools', 't_d6b_after.png'));
      c.ws.close();
    } else if (mode === 'mapflow') {
      const c = await openPage(BASE + '#dev=map', 1200, 1000, false);
      await sleep(900);
      console.log('map cards: ' + await c.eval("document.querySelectorAll('.map-card').length"));
      await c.eval("document.querySelectorAll('.map-card')[0].click(); 1");
      await sleep(500);
      console.log('event title: ' + await c.eval("(document.querySelector('.scene-place')||{}).textContent || '(none)'"));
      console.log('options: ' + await c.eval("document.querySelectorAll('#opts .choice').length"));
      await c.eval("document.querySelectorAll('#opts .choice')[1].click(); 1");
      await sleep(600);
      console.log('result chars: ' + await c.eval("document.querySelector('.prose').textContent.trim().length"));
      console.log('effects: ' + await c.eval("[...document.querySelectorAll('.effects span')].map(s=>s.textContent).join(' | ')"));
      await c.shot(path.join(ROOT, 'tools', 't_map_event.png'));
      await c.eval("document.querySelector('#map-done').click(); 1");
      await sleep(700);
      console.log('back to slot: ' + await c.eval("!!document.querySelector('#opts .choice') || !!document.querySelector('.scene-head')"));
      console.log('scene head: ' + await c.eval("(document.querySelector('.scene-head h2')||{}).textContent || '(none)'"));
      console.log('errbox: ' + await c.eval("((document.getElementById('errbox')||{}).textContent||'none').slice(0,200)"));
      c.ws.close();
    } else if (mode === 'examflow') {
      const c = await openPage(BASE + '#dev=exam', 1200, 1000, false);
      await sleep(900);
      for (let i = 0; i < 6; i++) {
        const n = await c.eval("document.querySelectorAll('#opts .choice').length");
        if (!n) break;
        await c.eval("document.querySelectorAll('#opts .choice')[0].click(); 1");
        await sleep(260);
      }
      console.log('grade: ' + await c.eval("((document.querySelector('.exam-grade b')||{}).textContent||'(none)')"));
      console.log('rows: ' + await c.eval("document.querySelectorAll('.exam-row').length"));
      console.log('effects: ' + await c.eval("[...document.querySelectorAll('.effects span')].map(s=>s.textContent).join(' | ')"));
      console.log('err: ' + await c.eval("((document.getElementById('errbox')||{}).textContent||'none').slice(0,160)"));
      await c.shot(path.join(ROOT, 'tools', 't_exam2.png'));
      c.ws.close();
    } else if (mode === 'beastfight') {
      const c = await openPage(BASE + '#dev=beastfight', 1200, 900, false);
      await sleep(1200);
      const idx = await c.eval("[...document.querySelectorAll('#opts .choice')].findIndex(b=>b.textContent.indexOf('一起砸')>=0)");
      console.log('beast option index: ' + idx);
      if (idx < 0) { await c.shot(path.join(ROOT,'tools','t_beastfight_opt.png')); c.ws.close(); return; }
      await c.eval("document.querySelectorAll('#opts .choice')[" + idx + "].click(); 1");
      await sleep(1400);
      console.log('battle layer: ' + await c.eval("!!document.querySelector('.battle-layer.on')"));
      console.log('foe name: ' + await c.eval("((document.querySelector('.bname')||{}).textContent||'')"));
      const L = [];
      for (let i = 0; i < 22; i++) {
        const st = await c.eval("JSON.stringify({ over: !!document.querySelector('#bt-done'), text: ((document.querySelector('.btext')||{}).textContent||''), acts: [...document.querySelectorAll('.bmenu .btn')].map(b=>b.textContent.trim()) })");
        const o = JSON.parse(st);
        if (o.over) { L.push('OVER: ' + o.text.slice(0, 90)); break; }
        if (!o.acts.length) { L.push('no acts'); break; }
        if (i === 2) L.push('log@2: ' + o.text.slice(0, 140));
        await c.eval("(() => { const bs=[...document.querySelectorAll('.bmenu .btn')]; const n = bs.find(b=>b.textContent.trim()==='宝具' && !b.disabled); const a = bs.find(b=>b.textContent.trim()==='交手'); (n||a||bs[0]).click(); return 1; })()");
        await sleep(520);
      }
      console.log(L.join(String.fromCharCode(10)));
      await c.shot(path.join(ROOT, 'tools', 't_beastfight.png'));
      c.ws.close();
    } else if (mode === 'shot') {
      const url = process.argv[3], out = process.argv[4];
      const wv = parseInt(process.argv[5] || '1200', 10), hv = parseInt(process.argv[6] || '1000', 10);
      const c = await openPage(url, wv, hv, false);
      await sleep(1200);
      await c.shot(out);
      console.log('saved ' + out);
      c.ws.close();
    }
  } finally {
    try { proc.kill(); } catch (e) { }
  }
})();
