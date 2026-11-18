const fs = require('fs');
const path = require('path');
const L = require('../../js/logic.js');
const FX = require('../../../shared/effects.js');

const root = path.join(__dirname, '..', '..', '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

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

function loadData() {
  const prisoners = read('data/prisoners.json');
  const out = {};
  Object.keys(prisoners).forEach((pid) => {
    out[pid] = {
      id: pid,
      info: prisoners[pid],
      identities: read('data/' + pid + '/identities.json'),
      egos: read('data/' + pid + '/egos.json')
    };
  });
  return out;
}

function buildUnit(pd, identityId, egoIds) {
  const identity = pd.identities[identityId];
  const egos = (egoIds || []).map((id) => Object.assign({ rank: 'ZAYIN' }, pd.egos[id]));
  return Object.assign({}, identity, { id: pd.id, name: pd.info.name, identityName: identity.name, egos });
}

const DUMMY_NAME = '試験用サンドバッグ';
const dummy = {
  enemies: [{
    id: 'dummy', name: DUMMY_NAME, kind: 'abnormality', maxHp: 2000, sp: 0,
    parts: [{
      name: '本体', maxDur: 2000, destroyable: false, speed: [1, 1], thr: [50, 25], resist: {},
      skills: { poke: { tier: 1, sin: 'wrath', type: 'pierce', name: 'つつく', base: 1, coin: 0, coins: 1, effects: [] } },
      skillSets: [{ name: '通常', loop: [['poke']] }]
    }]
  }]
};

function makeWorld(pd, identityId, egoIds, seed, pre) {
  const rng = seeded(seed || 4);
  const st = L.newState();
  const unit = buildUnit(pd, identityId, egoIds);
  const p = L.parseSetup({ allies: [unit] });
  const e = L.parseSetup(dummy);
  check(!p.errors.length && !e.errors.length, JSON.stringify(p.errors.concat(e.errors)));
  L.loadUnits(st, p.units, rng);
  L.loadUnits(st, e.units, rng);
  L.beginCombat(st, rng);
  const w = { st, rng, id: pd.id, unit: st.units[pd.id], name: pd.info.name, pd, identityId, egoIds };
  if (pre) { pre(st, w.unit, w); }
  return w;
}

function firstEnemyPiece(st) {
  return st.pieces.filter((P) => !L.isOut(L.getB(st, L.pieceRef(P))))[0];
}

function attackPiece(st) {
  return st.pieces.filter((P) => { const k = L.pieceSkill(st, P); return k && k.kind === 'attack'; })[0];
}

function pickSlot(w, slot) {
  return (st) => {
    const u = st.units[w.id];
    u.deck.q = [slot, slot === 1 ? 2 : 1];
    L.selectChoice(st, w.id, 'c0', 1);
    L.setTarget(st, w.id, firstEnemyPiece(st).pid, 2);
    u.choice.confirmed = true;
  };
}

function pickDef(w) {
  return (st) => {
    const u = st.units[w.id];
    L.selectChoice(st, w.id, 'def', 1);
    L.setTarget(st, w.id, attackPiece(st).pid, 2);
    u.choice.confirmed = true;
  };
}

function pickEgo(w, idx) {
  return (st) => {
    const u = st.units[w.id];
    L.selectChoice(st, w.id, 'ego', 1, { i: idx || 0, mode: 'awaken' });
    check(u.choice && u.choice.sel === 'ego', 'E.G.Oを選択できません(コスト不足?)');
    L.setTarget(st, w.id, firstEnemyPiece(st).pid, 2);
    u.choice.confirmed = true;
  };
}

function payFor(st, ego) {
  Object.keys(ego.cost || {}).forEach((k) => { st.res[k] = ego.cost[k]; });
}

function runRound(w, pick) {
  const st = w.st;
  st.pieces.forEach((P) => { P.target = w.id; });
  L.gmConfirm(st);
  pick(st);
  check(L.allConfirmed(st), '全員の確定になっていません');
  L.buildPlan(st, w.rng);
  let n = 0;
  while (L.stepProcess(st, w.rng)) { n += 1; check(n < 400, '処理が終わりません'); }
  if (st.phase === 'roundEnd') { L.startRound(st, w.rng); }
}

function logOf(w) { return w.st.log.join('\n'); }
function has(w, text) { return logOf(w).indexOf(text) >= 0; }
function enemyB(w) { return L.getB(w.st, { u: 'dummy', p: 0 }).b; }
function topLine(w) { return enemyB(w).lines.slice().sort((a, b) => b - a)[0]; }

function setStatus(u, id, n) {
  if (n <= 0) { return; }
  const info = FX.STATUS[id];
  if (info && info.type === 'pc') { L.addStatus(u, id, { p: 1, c: n }); } else { L.addStatus(u, id, { v: n }); }
}

function firstAttackSlot(identity) {
  const s = identity.skills.filter((k) => k.type !== 'guard' && k.type !== 'evade' && k.type !== 'counter')[0];
  return s ? s.tier : 1;
}

module.exports = { L, FX, seeded, check, loadData, buildUnit, makeWorld, pickSlot, pickDef, pickEgo, payFor, runRound, logOf, has, enemyB, topLine, setStatus, firstAttackSlot, firstEnemyPiece, attackPiece, DUMMY_NAME };
