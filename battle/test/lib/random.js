const W = require('./world.js');
const { L, check, makeWorld, firstEnemyPiece, attackPiece } = W;

function randomCases(data, games) {
  const out = [];
  Object.keys(data).forEach((pid) => {
    const pd = data[pid];
    pd.info.identities.forEach((identityId) => {
      const egoIds = Object.keys(pd.egos);
      out.push({
        tags: [pid, identityId, 'random'],
        name: 'ランダム対戦 ' + games + ' 回(' + pd.identities[identityId].name + ' + E.G.O全て)',
        run() {
          for (let seed = 1; seed <= games; seed += 1) {
            const w = makeWorld(pd, identityId, egoIds, seed, (st) => { Object.keys(st.res).forEach((k) => { st.res[k] = 9; }); });
            const st = w.st;
            let guard = 0;
            while (!st.result && guard < 40) {
              guard += 1;
              st.pieces.forEach((P) => { P.target = w.id; });
              L.gmConfirm(st);
              const u = st.units[w.id];
              if (!u.dead && !u.stagger) {
                const sels = ['c0', 'c1', 'def', 'ego'];
                const sel = sels[Math.floor(w.rng() * sels.length)];
                L.selectChoice(st, w.id, sel, 1, sel === 'ego' ? { i: Math.floor(w.rng() * egoIds.length), mode: 'awaken' } : undefined);
                if (!u.choice || u.choice.sel !== sel) { L.selectChoice(st, w.id, 'c0', 1); }
                const sk = L.chosenSkill(st, u);
                if (sk && sk.kind === 'attack') { L.setTarget(st, w.id, firstEnemyPiece(st).pid, 2); }
                else if (sk && (sk.kind === 'defense' || sk.kind === 'counter')) {
                  const atk = attackPiece(st);
                  if (atk) { L.setTarget(st, w.id, atk.pid, 2); }
                }
                u.choice.confirmed = true;
              }
              check(L.allConfirmed(st), 'ランダム対戦(seed ' + seed + '): 確定になっていません');
              L.buildPlan(st, w.rng);
              let n = 0;
              while (L.stepProcess(st, w.rng)) { n += 1; check(n < 400, 'ランダム対戦(seed ' + seed + '): 処理が終わりません'); }
              if (st.phase === 'roundEnd') { L.startRound(st, w.rng); }
            }
          }
        }
      });
    });
  });
  return out;
}

module.exports = { randomCases };
