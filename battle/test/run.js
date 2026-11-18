const W = require('./lib/world.js');
const { collect } = require('./lib/checks.js');
const { randomCases } = require('./lib/random.js');

const args = process.argv.slice(2);
const flags = { random: false, noRandom: false, list: false, type: null };
const words = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--random') { flags.random = true; }
  else if (args[i] === '--no-random') { flags.noRandom = true; }
  else if (args[i] === '--list') { flags.list = true; }
  else if (args[i] === '--type') { flags.type = args[i + 1]; i += 1; }
  else { words.push(args[i]); }
}

const data = W.loadData();
let cases = collect(data);
const filtered = words.length > 0 || !!flags.type;
const wantRandom = flags.random || (!filtered && !flags.noRandom);
if (wantRandom) { cases = cases.concat(randomCases(data, 100)); }

cases = cases.filter((c) => {
  if (c.tags.indexOf('random') >= 0 && !wantRandom) { return false; }
  if (flags.type && c.tags.indexOf(flags.type) < 0) { return false; }
  return words.every((w) => c.tags.map((t) => String(t).toLowerCase()).indexOf(w.toLowerCase()) >= 0);
});

if (flags.list) {
  cases.forEach((c) => console.log('[' + c.tags.join(' ') + '] ' + c.name));
  process.exit(0);
}

let ok = 0;
const failed = [];
const pending = [];
cases.forEach((c) => {
  if (c.unsupported) { pending.push(c); console.log('△ ' + c.tags.slice(0, 4).join('/') + ' ' + c.name + ' … 未確認: ' + c.unsupported); return; }
  try {
    c.run();
    ok += 1;
    console.log('○ ' + c.tags.slice(0, 4).join('/') + ' ' + c.name);
  } catch (e) {
    failed.push({ c, e });
    console.log('× ' + c.tags.slice(0, 4).join('/') + ' ' + c.name + '\n    ' + String(e.message).split('\n').join('\n    '));
  }
});

console.log('\n合計 ' + cases.length + ' 件: 成功 ' + ok + ' / 失敗 ' + failed.length + ' / 未確認 ' + pending.length);
if (cases.length === 0) { console.log('条件に合う確認がありません(--list で一覧を表示できます)'); }
process.exit(failed.length || pending.length || cases.length === 0 ? 1 : 0);
