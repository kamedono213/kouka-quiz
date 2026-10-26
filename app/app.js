// 効果・現象クイズ: 説明を読んで、〇〇効果・〇〇現象などの名前を4択で当てる。
// データは tools/build-data.js が作った data/effects.json。
'use strict';

// 「もどる」「やめる」を押したら、本当にもどるか確かめる(スマホの「戻る」操作も)。
// 画面のボタンは id="back" / id="quit"。もともと確認があるボタンは data-noconfirm をつけて除く
(() => {
  let bypass = false, ignorePop = false;
  const pass = fn => { bypass = true; fn(); setTimeout(() => { bypass = false; }, 500); };
  const ask = onYes => {
    if (document.getElementById('leave-confirm')) return;
    const d = document.createElement('div');
    d.id = 'leave-confirm'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
    d.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.45);display:grid;place-items:center;padding:16px';
    d.innerHTML = '<div style="background:#fff;color:#222;border-radius:16px;padding:20px 18px;max-width:320px;width:100%;display:grid;gap:14px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.25)">'
      + '<b style="font-size:18px">本当にもどりますか？</b><span style="font-size:14px;color:#555">いまの続きは消えることがあります。</span>'
      + '<div style="display:flex;gap:10px"><button type="button" data-a="no" style="flex:1;padding:12px;border-radius:12px;border:1px solid #ccc;background:#fff;color:#222;font:inherit;font-weight:700">つづける</button>'
      + '<button type="button" data-a="yes" style="flex:1;padding:12px;border-radius:12px;border:0;background:#2f6fd0;color:#fff;font:inherit;font-weight:700">もどる</button></div></div>';
    d.addEventListener('click', e => {
      const a = e.target.closest('[data-a]');
      if (!a && e.target !== d) return;
      d.remove();
      if (a && a.dataset.a === 'yes') onYes();
    });
    document.body.appendChild(d);
    d.querySelector('[data-a="no"]').focus();
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('#back, #quit');
    if (!b || bypass || b.hasAttribute('data-noconfirm')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    ask(() => pass(() => b.click()));
  }, true);
  // ROUTED: このアプリが画面ごとに履歴を積むか。積まないアプリは、戻る操作を受け止める「しおり」を1つ積んでおく
  const ROUTED = true;
  const guard = () => history.pushState({ leaveGuard: 1 }, '');
  if (!ROUTED) guard();
  window.addEventListener('popstate', e => {
    if (ignorePop) { ignorePop = false; e.stopImmediatePropagation(); return; }
    if (bypass) return;
    e.stopImmediatePropagation();
    if (!ROUTED) {
      const b = document.querySelector('#back, #quit');
      if (!b) { history.back(); return; }                 // メニュー画面ではそのままアプリを閉じる
      guard();
      if (b.hasAttribute('data-noconfirm')) { b.click(); return; }
      ask(() => pass(() => b.click()));
      return;
    }
    ignorePop = true; history.go(1); // いったん元の画面にとどまる
    ask(() => pass(() => history.back()));
  }, true);
})();

// ---------- ふりがな(ちりパズルと同じく、漢字の上に小さく読みを出す)
// 辞書 window.FURI は furi.js(onze.ltd/tools/furigana/make-furi.js が自動生成)。
// 画面に出た文字を自動で包むので、各画面のコードは変えなくてよい。答え合わせに使う textContent は変わらない(読みは CSS で表示)。
// 切りかえボタンは、data-furi-slot を付けた場所に自動で入る。設定はアプリごとに保存
(() => {
  const D = window.FURI || {};
  // 先頭の1文字ごとに、長い順に並べておく(文まるごと → 単語の順に当てはめる)
  const byHead = {};
  Object.keys(D).sort((a, b) => b.length - a.length).forEach(k => (byHead[k[0]] = byHead[k[0]] || []).push(k));
  const KEY = 'furi:' + location.pathname;
  let on = true;
  try { on = localStorage.getItem(KEY) !== '0'; } catch (e) { /* 保存できなくても動く */ }
  const css = document.createElement('style');
  // アプリ側の「span に〜」という指定が効かないように、ルビの span は !important で固める
  css.textContent = '.rbw,.rb{margin:0!important;border:0!important;background:none!important;min-width:0!important;font:inherit!important;color:inherit!important;letter-spacing:inherit!important;text-indent:0!important}'
    + '.rbw{display:inline!important;padding:0!important}'
    + '.rb{display:inline-block!important;position:relative!important;padding:0!important}'
    // ふりがなありの時は行の高さを広げ、読みは行間(漢字の上のすき間)に置く。行ごとに高さがばらつかない
    + 'html.furi body{line-height:2.2}'
    + 'html.furi .rb{line-height:max(2.2em, 1em + 17px)!important}'
    + 'html.furi .rb::before{content:attr(data-rt);position:absolute;bottom:calc(50% + 1.02em);left:50%;transform:translateX(-50%);font-size:max(.5em,7.5px);font-weight:700;line-height:1.1;white-space:nowrap;letter-spacing:0;pointer-events:none}'
    + '.furi-tools{display:inline-flex;flex-wrap:wrap;gap:6px;justify-self:start;align-self:center;width:auto;flex:none;line-height:1.4}'
    + '.furi-toggle{width:auto;flex:none;line-height:1.4;border:1.5px solid rgba(127,127,127,.4);background:transparent;color:inherit;border-radius:999px;padding:4px 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}'
    + '.furi-toggle[aria-pressed="true"]{border-color:currentColor}';
  document.head.appendChild(css);
  const apply = () => document.documentElement.classList.toggle('furi', on);
  apply();
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'TITLE']);
  const ok = el => {
    for (let e = el; e && e.nodeType === 1; e = e.parentNode) {
      if (e.namespaceURI === 'http://www.w3.org/2000/svg') return false;
      if (e.classList.contains('rb') || e.classList.contains('rbw') || e.hasAttribute('data-nofuri')) return false;
      if (e.lang && !/^ja/i.test(e.lang)) return false; // 外国語の文字(中国語の漢字など)には付けない
      if (SKIP.has(e.tagName)) return false;
    }
    return true;
  };
  function wrapText(node) {
    const t = node.nodeValue;
    if (!/[一-鿿々]/.test(t)) return;
    const frag = document.createDocumentFragment();
    let last = 0, hit = false;
    for (let i = 0; i < t.length;) {
      const k = (byHead[t[i]] || []).find(x => t.startsWith(x, i));
      if (!k) { i++; continue; }
      hit = true;
      if (i > last) frag.appendChild(document.createTextNode(t.slice(last, i)));
      for (const seg of D[k]) {
        if (typeof seg === 'string') { frag.appendChild(document.createTextNode(seg)); continue; }
        const s = document.createElement('span'); s.className = 'rb'; s.dataset.rt = seg[1]; s.textContent = seg[0];
        frag.appendChild(s);
      }
      i = last = i + k.length;
    }
    if (!hit) return;
    if (last < t.length) frag.appendChild(document.createTextNode(t.slice(last)));
    // 1つの span にまとめて入れる(flex や grid の中で、ルビごとに改行されないように)
    const w = document.createElement('span'); w.className = 'rbw'; w.appendChild(frag);
    node.replaceWith(w);
  }
  // 切りかえボタンを入れる箱(効果音ボタンもここに入る)
  function tools(slot) {
    let box = slot.querySelector(':scope > .furi-tools');
    if (!box) { box = document.createElement('span'); box.className = 'furi-tools'; box.setAttribute('data-nofuri', ''); slot.appendChild(box); }
    return box;
  }
  function toggleHtml() { return `<button type="button" class="furi-toggle" data-furi-toggle aria-pressed="${on}">ふりがな ${on ? 'あり' : 'なし'}</button>`; }
  function scan(root) {
    if (root.nodeType === 3) { if (ok(root.parentNode)) wrapText(root); return; }
    if (root.nodeType !== 1 || !ok(root)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [];
    let n; while ((n = w.nextNode())) if (ok(n.parentNode)) list.push(n);
    list.forEach(wrapText);
    const slots = root.querySelectorAll ? [...root.querySelectorAll('[data-furi-slot]')] : [];
    if (root.hasAttribute && root.hasAttribute('data-furi-slot')) slots.push(root);
    slots.forEach(s => { if (!s.querySelector('[data-furi-toggle]')) tools(s).insertAdjacentHTML('afterbegin', toggleHtml()); });
  }
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) scan(n); })
    .observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-furi-toggle]'); if (!b) return;
    on = !on; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (err) { /* 保存できなくても切りかわる */ }
    apply();
    document.querySelectorAll('[data-furi-toggle]').forEach(x => { x.setAttribute('aria-pressed', on); x.textContent = 'ふりがな ' + (on ? 'あり' : 'なし'); });
  });
  window.furiTools = tools;
  if (document.body) scan(document.body);
})();

const app = document.getElementById('app');
let DATA = null;

// ---------- 保存(保存できない環境でも遊べる)
const store = {
  get(k, d) { try { const v = localStorage.getItem('kouka:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('kouka:' + k, JSON.stringify(v)); } catch (e) { /* 保存できなくても遊べる */ } },
};

// ---------- 効果音(Web Audio で合成)
const SE = {
  ctx: null,
  muted: store.get('muted', false),
  ac() {
    if (!this.ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; this.ctx = new C(); }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  tone(freq, at, dur, type = 'sine', vol = 0.18, slideTo = null) {
    const c = this.ac(); if (!c) return;
    const t = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  play(name) {
    if (this.muted) return;
    try {
      if (name === 'start') { this.tone(523, 0, 0.09, 'triangle'); this.tone(784, 0.08, 0.14, 'triangle'); }
      if (name === 'select') this.tone(660, 0, 0.06, 'triangle', 0.12);
      if (name === 'ok') { this.tone(880, 0, 0.12, 'sine', 0.2); this.tone(1319, 0.1, 0.28, 'sine', 0.2); }
      if (name === 'ng') this.tone(220, 0, 0.32, 'square', 0.07, 150);
      if (name === 'result') [523, 659, 784].forEach((f, i) => this.tone(f, i * 0.11, 0.18, 'triangle'));
      if (name === 'perfect') { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.1, 0.16, 'triangle')); [1047, 1319, 1568].forEach(f => this.tone(f, 0.42, 0.6, 'sine', 0.1)); }
    } catch (e) { /* 音が出せない環境でも遊べる */ }
  },
  toggle() { this.muted = !this.muted; store.set('muted', this.muted); if (!this.muted) this.play('select'); },
};

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const fieldOf = key => DATA.fields.find(f => f.key === key);
// まちがえた問題(正解するまで残る)
const wrongSet = () => new Set(store.get('wrong', []));
const saveWrong = s => store.set('wrong', [...s]);

// ---------- 選択肢: 同じ種類(〇〇効果なら〇〇効果)から選び、語尾で答えが分からないようにする
function choicesFor(q) {
  const pool = DATA.items.filter(i => i.id !== q.id);
  const tiers = [
    pool.filter(i => i.t === q.t && i.f === q.f),   // 同じ分野・同じ種類
    pool.filter(i => i.t === q.t && i.f !== q.f),   // ほかの分野・同じ種類
    pool.filter(i => i.f === q.f && i.t !== q.t),   // 同じ分野・ちがう種類
    pool.filter(i => i.f !== q.f && i.t !== q.t),
  ];
  const picked = [];
  for (const t of tiers) for (const i of shuffle(t)) { if (picked.length >= 3) break; if (!picked.some(p => p.name === i.name)) picked.push(i); }
  return shuffle([q, ...picked]);
}

// ---------- 画面の移動(スマホの「戻る」でホームへ)
let inQuiz = false;
window.addEventListener('popstate', () => { if (inQuiz) { inQuiz = false; home(); } });
function startQuiz(title, list, key) {
  if (!list.length) return;
  if (!inQuiz) { history.pushState({ q: 1 }, ''); inQuiz = true; }
  SE.play('start');
  Q = { title, key, list, i: 0, score: 0, miss: [], answered: false };
  ask();
}
const soundBtn = () => `<button class="link" id="sound">${SE.muted ? '🔇 音なし' : '🔊 音あり'}</button>`;
function bindSound() { const b = app.querySelector('#sound'); if (b) b.onclick = () => { SE.toggle(); b.outerHTML = soundBtn(); bindSound(); }; }

// ---------- ホーム
function home() {
  const all = DATA.items, wrong = wrongSet();
  const bestOf = k => store.get('best:' + k, null);
  const bestTxt = k => { const b = bestOf(k); return b ? `最高 ${b}` : ''; };
  app.innerHTML = `
    <div class="top" data-furi-slot><h1>効果・現象クイズ</h1><span class="grow"></span>${soundBtn()}</div>
    <p class="lead">説明を読んで、名前を4つの中から当てよう。答えたあとの解説で、使われ方やおもしろい話も読めるよ。</p>
    <div class="tags"><span>〇〇効果</span><span>〇〇現象</span><span>〇〇の法則</span><span>〇〇コンプレックス</span><span>〇〇症候群</span><span>〇〇のパラドックス</span><span>〇〇バイアス</span></div>
    <div class="all"><h3>🎲 全分野から</h3><p>${DATA.fields.length}分野・${all.length}問 ${bestTxt('all:10') ? '・' + bestTxt('all:10') + '/10' : ''}</p>
      <div class="row"><button class="btn main" data-go="all:10">ランダム10問</button><button class="btn" data-go="all:all">全問(${all.length}問)</button></div></div>
    ${wrong.size ? `<div class="review"><span style="font-size:24px">🔁</span><span style="flex:1"><b>にがて復習</b><br><small>まちがえた問題 ${wrong.size}問(正解すると消えます)</small></span><button class="btn main" data-go="wrong">復習する</button></div>` : ''}
    <div class="fields">${DATA.fields.map(f => {
      const n = all.filter(i => i.f === f.key).length;
      return `<div class="field"><div class="hd"><span class="em">${f.emoji}</span><span><b>${esc(f.name)}</b><small>${n}問</small></span><span class="best">${bestTxt(f.key + ':10') ? bestTxt(f.key + ':10') + '/10' : ''}</span></div>
        <div class="row"><button class="btn main" data-go="${f.key}:10">ランダム10問</button><button class="btn" data-go="${f.key}:all">全問(${n}問)</button></div></div>`;
    }).join('')}</div>
    <p class="foot">心理学の効果の中には、あとの研究で再現できなかったり、効果が小さいと分かったりしたものもあります。解説にはそれも書いています。</p>`;
  bindSound();
  app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
    const g = b.dataset.go;
    if (g === 'wrong') { const w = wrongSet(); return startQuiz('にがて復習', shuffle(DATA.items.filter(i => w.has(i.id))), 'wrong'); }
    const [f, n] = g.split(':');
    const pool = f === 'all' ? DATA.items : DATA.items.filter(i => i.f === f);
    const title = f === 'all' ? '全分野' : fieldOf(f).emoji + ' ' + fieldOf(f).name;
    startQuiz(title + (n === '10' ? ' ・ ランダム10問' : ' ・ 全問'), shuffle(pool).slice(0, n === '10' ? 10 : pool.length), g);
  });
  window.scrollTo(0, 0);
}

// ---------- 出題
let Q = null;
function ask() {
  const q = Q.list[Q.i], ch = choicesFor(q), f = fieldOf(q.f);
  Q.answered = false;
  app.innerHTML = `
    <div class="qbar"><button class="back" id="quit" aria-label="ホームへ">←</button><div class="ttl">${esc(Q.title)}<small>${Q.i + 1} / ${Q.list.length}問目</small></div><span class="pill">✓ ${Q.score}</span></div>
    <div class="prog"><i style="width:${Q.i / Q.list.length * 100}%"></i></div>
    <div class="q"><span class="tag">${f.emoji} ${esc(f.name)}</span><p>${esc(q.desc)}</p><div class="ask">これは何?</div></div>
    <div class="choices">${ch.map((c, k) => `<button class="ch" data-id="${c.id}"><span class="n">${k + 1}</span><span>${esc(c.name)}</span></button>`).join('')}</div>
    <div id="exp"></div>`;
  app.querySelector('#quit').onclick = () => history.back();
  app.querySelectorAll('.ch').forEach(b => b.onclick = () => answer(b.dataset.id));
  window.scrollTo(0, 0);
}
function answer(id) {
  if (Q.answered) return;
  Q.answered = true;
  const q = Q.list[Q.i], ok = id === q.id, w = wrongSet();
  if (ok) { Q.score++; w.delete(q.id); } else { Q.miss.push(q); w.add(q.id); }
  saveWrong(w);
  SE.play(ok ? 'ok' : 'ng');
  app.querySelectorAll('.ch').forEach(b => {
    b.disabled = true;
    if (b.dataset.id === q.id) b.classList.add('ok');
    else if (b.dataset.id === id) b.classList.add('ng');
    else b.classList.add('dim');
  });
  app.querySelector('.pill').textContent = '✓ ' + Q.score;
  const last = Q.i === Q.list.length - 1;
  const exp = app.querySelector('#exp');
  exp.innerHTML = `<div class="exp"><p class="res ${ok ? 'ok' : 'ng'}">${ok ? '⭕ せいかい!' : '✖ ざんねん'}</p><h3>${esc(q.name)}</h3><p>${esc(q.exp)}</p>
    <button class="btn main" id="next" style="width:100%">${last ? '結果を見る' : 'つぎへ'}</button></div>`;
  app.querySelector('#next').onclick = () => { if (last) result(); else { Q.i++; ask(); } };
  exp.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ---------- 結果
function result() {
  const n = Q.list.length, s = Q.score;
  if (Q.key.endsWith(':10')) { const k = 'best:' + Q.key; if (s > store.get(k, 0)) store.set(k, s); }
  SE.play(s === n ? 'perfect' : 'result');
  const msg = s === n ? 'パーフェクト!' : s >= n * 0.8 ? 'すばらしい!' : s >= n * 0.5 ? 'いい調子!' : '解説を読んで、もう一度!';
  app.innerHTML = `
    <div class="qbar"><button class="back" id="quit" aria-label="ホームへ">←</button><div class="ttl">${esc(Q.title)}<small>結果</small></div></div>
    <div class="result"><div class="score">${s}<small> / ${n}</small></div><p>${msg}</p></div>
    <div class="btns">
      ${Q.miss.length ? `<button class="btn main" id="again-miss">まちがえた${Q.miss.length}問だけもう一度</button>` : ''}
      <button class="btn ${Q.miss.length ? '' : 'main'}" id="again">もう一度(問題を入れかえる)</button>
      <button class="btn" id="home">ホームへ</button></div>
    ${Q.miss.length ? `<h3 style="font-family:var(--display);margin:0 0 10px">まちがえた問題</h3><div class="miss">${Q.miss.map(q => `<div><b>${esc(q.name)}</b><p>${esc(q.desc)}</p></div>`).join('')}</div>` : ''}`;
  app.querySelector('#quit').onclick = () => history.back();
  app.querySelector('#home').onclick = () => history.back();
  app.querySelector('#again').onclick = () => {
    const [f, k] = Q.key.split(':');
    if (Q.key === 'wrong') { const w = wrongSet(); return startQuiz('にがて復習', shuffle(DATA.items.filter(i => w.has(i.id))), 'wrong'); }
    const pool = f === 'all' ? DATA.items : DATA.items.filter(i => i.f === f);
    startQuiz(Q.title, shuffle(pool).slice(0, k === '10' ? 10 : pool.length), Q.key);
  };
  const am = app.querySelector('#again-miss');
  if (am) am.onclick = () => startQuiz(Q.title.replace(/ ・ .*$/, '') + ' ・ まちがえた問題', shuffle(Q.miss), 'retry');
  window.scrollTo(0, 0);
}

// ---------- はじまり
(async () => {
  app.innerHTML = '<p class="lead">読みこんでいます…</p>';
  try { DATA = await fetch('data/effects.json').then(r => { if (!r.ok) throw new Error(); return r.json(); }); }
  catch (e) { app.innerHTML = '<p class="lead">問題が読みこめませんでした。通信できるところで、もう一度ひらいてください。</p>'; return; }
  history.replaceState({ home: 1 }, '');
  home();
})();
