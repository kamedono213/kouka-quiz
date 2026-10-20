// 効果・現象クイズのデータを作る。data/effects-*.txt → app/data/effects.json
// 確かめること: 名前の重複、説明文に答えの名前(の中心部分)が入っていないか、列の数
// 実行: node tools/build-data.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const errors = [], notes = [];

// 名前の「種類」(選択肢を同じ種類からそろえて、語尾で答えが分からないようにする)
function typeOf(name) {
  if (/パラドックス$/.test(name)) return 'paradox';
  if (/コンプレックス$/.test(name)) return 'complex';
  if (/(症候群|シンドローム)$/.test(name)) return 'syndrome';
  if (/効果$/.test(name)) return 'effect';
  if (/現象$/.test(name)) return 'phenomenon';
  if (/(バイアス|誤謬|錯誤|誤り|ヒューリスティック)$/.test(name)) return 'bias';
  if (/(法則|定理|曲線)$/.test(name)) return 'law';
  if (/原理$/.test(name)) return 'principle';
  if (/(理論|仮説|説)$/.test(name)) return 'theory';
  return 'other';
}
// 名前の中心部分(語尾を除いたもの)。説明文にこれが入っていたら答えが分かってしまう
const core = name => name.replace(/(のパラドックス|パラドックス|コンプレックス|・コンプレックス|症候群|シンドローム|効果|現象|バイアス|の誤謬|誤謬|錯誤|の法則|法則|の定理|定理|の原理|原理|理論|仮説|の悲劇|体験)$/, '').replace(/[・=＝]/g, '');

const fields = [], items = [];
let field = null;
for (const f of fs.readdirSync(path.join(ROOT, 'data')).filter(f => /^effects-\d+\.txt$/.test(f)).sort()) {
  for (const raw of fs.readFileSync(path.join(ROOT, 'data', f), 'utf8').split(/\r?\n/)) {
    const l = raw.trim();
    if (!l || l.startsWith('#')) continue;
    if (l.startsWith('@')) { const [key, name, emoji] = l.slice(1).split('|'); field = { key, name, emoji }; fields.push(field); continue; }
    const p = l.split('|');
    if (p.length !== 3) { errors.push(`${f}: 列が3つでない: ${l.slice(0, 40)}`); continue; }
    const [name, desc, exp] = p;
    items.push({ id: field.key + '-' + items.length, f: field.key, name, desc, exp, t: typeOf(name) });
  }
}
// 重複
const seen = new Map();
for (const it of items) { if (seen.has(it.name)) errors.push('名前の重複: ' + it.name); seen.set(it.name, it); }
// 説明文に答えが入っていないか(中心部分が2文字以上のとき)
for (const it of items) {
  const c = core(it.name);
  if (c.length >= 2 && it.desc.includes(c)) errors.push(`説明文に答えの言葉「${c}」が入っている: ${it.name}`);
}
// 種類ごとの数(選択肢をそろえられるか)
const byType = {};
items.forEach(i => byType[i.t] = (byType[i.t] || 0) + 1);
notes.push('種類ごとの数: ' + Object.entries(byType).map(([k, v]) => k + ' ' + v).join(', '));
for (const fl of fields) notes.push(`${fl.emoji} ${fl.name}: ${items.filter(i => i.f === fl.key).length}問`);
notes.push('合計: ' + items.length + '問');

fs.mkdirSync(path.join(ROOT, 'app/data'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'app/data/effects.json'), JSON.stringify({ fields, items }));
console.log(notes.join('\n'));
if (errors.length) { console.log('\nERRORS:\n' + errors.join('\n')); process.exit(1); }
