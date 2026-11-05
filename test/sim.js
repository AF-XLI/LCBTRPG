const fs = require('fs');
const path = require('path');
const L = require('../js/logic.js');

const root = path.join(__dirname, '..');
const party = JSON.parse(fs.readFileSync(path.join(root, 'sample/party.json'), 'utf8'));
const enemies = JSON.parse(fs.readFileSync(path.join(root, 'sample/enemies.json'), 'utf8'));

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

function setup(rng) {
  const st = L.newState();
  const p = L.parseSetup(party);
  const e = L.parseSetup(enemies);
  if (p.errors.length || e.errors.length) { throw new Error(JSON.stringify(p.errors.concat(e.errors))); }
  L.loadUnits(st, p.units, rng);
  L.loadUnits(st, e.units, rng);
  return st;
}

function randomChoices(st, rng) {
  let ts = 1;
  Object.keys(st.units).forEach((id) => {
    const u = st.units[id];
    if (u.side !== 'ally' || u.dead || u.stagger) { return; }
    const sels = ['c0', 'c1', 'def'];
    L.selectChoice(st, id, sels[Math.floor(rng() * 3)], ts++);
    const sk = L.chosenSkill(st, u);
    if (u.choice.sel !== 'def' && sk && sk.kind === 'attack') {
      const alive = st.pieces.filter((P) => !L.isOut(L.getB(st, L.pieceRef(P))));
      const blanks = [];
      Object.keys(st.units).forEach((eid) => {
        const eu = st.units[eid];
        if (eu.side !== 'enemy' || eu.dead) { return; }
        eu.parts.forEach((pt, pi) => {
          if (pt.destroyed) { return; }
          if (!st.pieces.some((P) => P.unitId === eid && P.partIdx === pi)) { blanks.push(L.pieceId(eid, pi, 'b')); }
        });
      });
      const choices = alive.map((P) => P.pid).concat(blanks);
      if (choices.length) { L.setTarget(st, id, choices[Math.floor(rng() * choices.length)], ts++); }
    }
    u.choice.confirmed = L.canConfirm(st, u);
  });
}

function randomEnemyTargets(st, rng) {
  const allies = Object.keys(st.units).filter((id) => st.units[id].side === 'ally' && !st.units[id].dead);
  st.pieces.forEach((P) => { P.target = allies.length ? allies[Math.floor(rng() * allies.length)] : null; });
}

function runGame(seed, verbose) {
  const rng = seeded(seed);
  const st = setup(rng);
  L.beginCombat(st, rng);
  let guard = 0;
  while (!st.result && guard < 60) {
    guard += 1;
    randomEnemyTargets(st, rng);
    L.gmConfirm(st);
    randomChoices(st, rng);
    if (!L.allConfirmed(st)) { throw new Error('not all confirmed'); }
    L.buildPlan(st, rng);
    let n = 0;
    while (L.stepProcess(st, rng)) { n += 1; if (n > 400) { throw new Error('infinite'); } }
    if (st.phase === 'roundEnd') { L.startRound(st, rng); }
    Object.keys(st.units).forEach((id) => {
      const u = st.units[id];
      if (u.hp < 0 || u.hp > u.maxHp) { throw new Error('hp out of range ' + id); }
      if (u.side === 'ally') {
        if (u.sp < -45 || u.sp > 45) { throw new Error('sp range'); }
        if (L.A(u.deck.q).length < 3) { throw new Error('deck short ' + JSON.stringify(u.deck)); }
      }
    });
  }
  if (verbose) { console.log(st.log.join('\n')); }
  return { rounds: st.round, result: st.result };
}

if (process.argv[2] === 'one') {
  console.log(runGame(Number(process.argv[3] || 1), true));
} else {
  const stats = { victory: 0, defeat: 0, none: 0 };
  for (let s = 1; s <= 400; s += 1) {
    const r = runGame(s, false);
    stats[r.result || 'none'] += 1;
  }
  console.log(stats);
}
