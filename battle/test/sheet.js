const fs = require('fs');
const path = require('path');
const L = require('../js/logic.js');

const root = path.join(__dirname, '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const enemies = read('battle/sample/enemies.json');
const prisoner = read('data/prisoners.json').gray;
const identity = read('data/gray/identities.json').lcb;
const egoData = read('data/gray/egos.json')['end-of-spring'];

function seeded(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function check(cond, message) {
  if (!cond) { throw new Error(message); }
}

function grayUnit() {
  return Object.assign({}, identity, {
    id: 'gray',
    name: prisoner.name,
    identityName: identity.name,
    egos: [Object.assign({ rank: 'ZAYIN' }, egoData)]
  });
}

function setup(rng) {
  const st = L.newState();
  const p = L.parseSetup({ allies: [grayUnit()] });
  const e = L.parseSetup(enemies);
  check(!p.errors.length && !e.errors.length, JSON.stringify(p.errors.concat(e.errors)));
  L.loadUnits(st, p.units, rng);
  L.loadUnits(st, e.units, rng);
  return st;
}

function enemyTargets(st) {
  st.pieces.forEach((P) => { P.target = 'gray'; });
}

function runRound(st, rng, pick) {
  enemyTargets(st);
  L.gmConfirm(st);
  pick(st);
  check(L.allConfirmed(st), 'not all confirmed');
  L.buildPlan(st, rng);
  let n = 0;
  while (L.stepProcess(st, rng)) { n += 1; check(n < 400, 'infinite'); }
  if (st.phase === 'roundEnd') { L.startRound(st, rng); }
}

function firstEnemyPiece(st) {
  return st.pieces.filter((P) => !L.isOut(L.getB(st, L.pieceRef(P))))[0];
}

function attackWith(sel, egoOpt) {
  return (st) => {
    const u = st.units.gray;
    L.selectChoice(st, 'gray', sel, 1, egoOpt);
    L.setTarget(st, 'gray', firstEnemyPiece(st).pid, 2);
    u.choice.confirmed = true;
  };
}

(function randomGames() {
  let sink = 0;
  for (let seed = 1; seed <= 200; seed += 1) {
    const rng = seeded(seed);
    const st = setup(rng);
    L.beginCombat(st, rng);
    let guard = 0;
    while (!st.result && guard < 40) {
      guard += 1;
      runRound(st, rng, (s) => {
        const u = s.units.gray;
        if (u.dead || u.stagger) { return; }
        const sels = ['c0', 'c1', 'def'];
        attackWith(sels[Math.floor(rng() * 2)])(s);
      });
    }
    if (st.log.some((l) => l.indexOf('沈潜') >= 0)) { sink += 1; }
  }
  check(sink > 0, '沈潜が一度も付与されませんでした');
  console.log('ランダム対戦 200 回: 例外なし(沈潜が付与された対戦 ' + sink + ' 回)');
}());

(function dispelCase() {
  const rng = seeded(7);
  const st = setup(rng);
  L.beginCombat(st, rng);
  st.res.sloth = 5;
  st.res.pride = 5;
  const u = st.units.gray;
  L.addStatus(u, 'burn', { p: 3, c: 2 });
  L.addStatus(u, 'bind', { v: 1 });
  check(L.debuffKeys(u).length === 2, 'デバフの前提が作れません');
  st.round = 1;
  runRound(st, rng, attackWith('ego', { i: 0, mode: 'awaken' }));
  const log = st.log.join('\n');
  check(log.indexOf('のデバフを解除') >= 0, 'デバフが解除されませんでした\n' + log);
  check(L.debuffKeys(u).length <= 1, '解除後のデバフが多すぎます');
  console.log('デバフ解除: OK');
}());

(function physResist() {
  const st = setup(seeded(3));
  const u = st.units.gray;
  check(u.resist.slash === 'weak' && u.resist.pierce === 'strong', '物理耐性が人格の値になっていません: ' + JSON.stringify(u.resist));
  check(u.resist.wrath === 'weak' && u.resist.sloth === 'resist', '罪悪耐性がZAYINのE.G.Oの値になっていません');
  check(JSON.stringify(u.lines) === JSON.stringify([165, 110]), '混乱区間が75%・50%になっていません: ' + JSON.stringify(u.lines));
  console.log('耐性・混乱区間: OK');
}());

(function passiveCase() {
  const rng = seeded(11);
  const st = setup(rng);
  L.beginCombat(st, rng);
  st.res.pride = 5;
  st.res.sloth = 5;
  const u = st.units.gray;
  u.maxHp = 99999;
  u.hp = 99999;
  u.egoPas = { 0: 1 };
  u.sp = -10;
  st.round = 1;
  runRound(st, rng, attackWith('c1'));
  const log = st.log.join('\n');
  check(log.indexOf('パッシブ「純真無垢」が発動') >= 0, '純真無垢が発動していません\n' + log);
  check(log.indexOf('パッシブ「風雅指南」が発動') >= 0, '風雅指南が発動していません');
  check(log.indexOf('パッシブ「春の終わり(パッシブ)」が発動') >= 0, 'E.G.Oパッシブがターン開始時に発動していません');
  check(u.sp > -10, '精神力が回復していません: ' + u.sp);
  console.log('パッシブ: OK');
}());
