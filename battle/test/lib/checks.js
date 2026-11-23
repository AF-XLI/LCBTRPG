const W = require('./world.js');
const { L, FX, check, makeWorld, pickSlot, pickDef, pickEgo, payFor, runRound, has, enemyB, topLine, setStatus, firstAttackSlot, DUMMY_NAME } = W;

const HIT_TIMINGS = ['hit', 'use', 'beforeAttack', 'matchWin', undefined];
const CHARGE_LIKE = ['charge', 'trance'];

function unsupported(reason) { return { label: '未対応', unsupported: reason }; }
function label(id) { return FX.statusInfo(id).label; }

function picker(ctx, w) {
  const h = ctx.holder;
  if (h.kind === 'skill') { return pickSlot(w, h.tier); }
  if (h.kind === 'defense') { return pickDef(w); }
  if (h.kind === 'ego') { return pickEgo(w, 0); }
  return pickSlot(w, firstAttackSlot(ctx.pd.identities[ctx.identityId]));
}

function play(ctx, pre) {
  const h = ctx.holder;
  const egoIds = h.egoId ? [h.egoId] : [];
  const w = makeWorld(ctx.pd, ctx.identityId, egoIds, 4, (st, u, ww) => {
    if (h.kind === 'ego') { payFor(st, ctx.pd.egos[h.egoId]); }
    if (pre) { pre(st, u, ww); }
  });
  runRound(w, picker(ctx, w));
  return w;
}

function needPre(p, ok) {
  return (st) => {
    if (p && p.sin && p.count !== undefined) { st.res[p.sin] = ok ? p.count : Math.max(0, p.count - 1); }
  };
}

function boundary(op, v, pass) {
  if (op === 'gte') { return pass ? v : v - 1; }
  if (op === 'gt') { return pass ? v + 1 : v; }
  if (op === 'lte') { return pass ? v : v + 1; }
  return pass ? v - 1 : v;
}

function condVariants(ctx) {
  const e = ctx.e;
  const spendSib = ctx.holder.effects.filter((x) => x.type === 'spend')[0];
  const mk = (passStatus, passSpent, name) => ({
    label: name,
    pass: passStatus && passSpent,
    pre: (st, u) => {
      if (e.ifStatus) { setStatus(u, e.ifStatus.status, Math.max(0, Math.min(20, boundary(e.ifStatus.op, e.ifStatus.value, passStatus)))); }
      if (e.ifSpent) { setStatus(u, spendSib.status, Math.max(0, Math.min(20, boundary(e.ifSpent.op, e.ifSpent.value, passSpent)))); }
    }
  });
  if (e.ifSpent && !spendSib) { return [unsupported('消耗の効果が同じスキルにありません')]; }
  if (e.ifSpent && spendSib.ifStatus) { return [unsupported('条件付きの消耗は、この確認では扱えません')]; }
  const out = [mk(true, true, '条件を満たす')];
  if (e.ifStatus) { out.push(mk(false, true, '条件を満たさない(使用前の値が境界の1つ手前)')); }
  if (e.ifSpent) { out.push(mk(true, false, '消耗量が条件に1足りない')); }
  if (!e.ifStatus && !e.ifSpent) { return [{ label: '', pass: true, pre: null }]; }
  return out;
}

function targetOk(e) { return !e.target || e.target === 'target' || e.target === 'enemy' || e.target === 'self'; }

function holderOk(ctx, kinds) { return kinds.indexOf(ctx.holder.kind) >= 0; }

function logsFor(w, e, items) {
  const who = e.target === 'self' ? w.name : DUMMY_NAME;
  return items.map((i) => (e.delay === 'nextTurn' ? who + ' に次ラウンド付与: ' + label(i.status) : who + ' に ' + label(i.status) + ' を付与'));
}

function statusEffect(ctx, items, magnitude) {
  const e = ctx.e;
  if (!holderOk(ctx, ['skill', 'defense', 'ego'])) { return [unsupported('このタイミング・持ち主の確認部品がありません')]; }
  if (HIT_TIMINGS.indexOf(e.timing) < 0) { return [unsupported('タイミング ' + e.timing + ' の確認部品がありません')]; }
  if (!targetOk(e)) { return [unsupported('対象 ' + e.target + ' の確認部品がありません')]; }
  return condVariants(ctx).map((v) => {
    if (v.unsupported) { return v; }
    return {
      label: v.label,
      run() {
        const w = play(ctx, v.pre);
        const logs = logsFor(w, e, items);
        logs.forEach((t) => {
          check(has(w, t) === v.pass, (v.pass ? '付与されるはずが付与されていません: ' : '付与されないはずが付与されています: ') + t + '\n' + w.st.log.join('\n'));
        });
        if (v.pass && magnitude) { magnitude(w, v); }
      }
    };
  });
}

const CHECKERS = {
  grant(ctx) {
    const e = ctx.e;
    const items = e.items || [{ status: e.status, power: e.power, count: e.count }];
    return statusEffect(ctx, items, (w) => {
      if (e.target !== 'self' || e.delay !== 'nextTurn') { return; }
      items.forEach((i) => {
        const cur = w.unit.st && w.unit.st[i.status];
        check(!!cur, '次ラウンドの ' + label(i.status) + ' が反映されていません');
        const info = FX.STATUS[i.status];
        if (i.power !== undefined) {
          const got = info.type === 'val' ? cur.v : cur.p;
          check(got === i.power, label(i.status) + ' の値が違います: ' + got + ' (期待 ' + i.power + ')');
        }
      });
    });
  },
  gain(ctx) {
    const e = ctx.e;
    const sibling = ctx.holder.effects.some((x) => x !== e && (x.type === 'spend' || (x.type === 'gain' && x.status === e.status)));
    return statusEffect(ctx, [{ status: e.status }], (w, v) => {
      if (e.target !== 'self' || CHARGE_LIKE.indexOf(e.status) < 0 || sibling) { return; }
      const got = w.unit.st && w.unit.st[e.status] ? w.unit.st[e.status].c : 0;
      const want = Math.max(0, Math.min(20, e.count) - 1);
      check(got === want, label(e.status) + ' の回数が違います: ' + got + ' (期待 ' + want + ': 増加 ' + e.count + ' → ラウンド終了で-1)');
    });
  },
  dispel(ctx) {
    const e = ctx.e;
    if (!holderOk(ctx, ['skill', 'defense', 'ego'])) { return [unsupported('持ち主の確認部品がありません')]; }
    const follow = [];
    (e.then || []).forEach((x) => { (x.items || [x]).forEach((i) => follow.push({ status: i.status, delay: x.delay })); });
    const mk = (withDebuff) => ({
      label: withDebuff ? 'デバフがある' : 'デバフが無い',
      run() {
        const w = play(ctx, withDebuff ? (st, u) => { L.addStatus(u, 'burn', { p: 3, c: 2 }); } : null);
        check(has(w, 'のデバフを解除') === withDebuff, withDebuff ? 'デバフが解除されていません' : 'デバフが無いのに解除されています');
        follow.forEach((f) => {
          const t = f.delay === 'nextTurn' ? '次ラウンド付与: ' + label(f.status) : label(f.status) + ' を付与';
          check(has(w, t) === withDebuff, '解除後の付与(' + label(f.status) + ')が' + (withDebuff ? '行われていません' : '行われています'));
        });
      }
    });
    return [mk(true), mk(false)];
  },
  spend(ctx) {
    const e = ctx.e;
    if (!holderOk(ctx, ['skill', 'ego'])) { return [unsupported('持ち主の確認部品がありません')]; }
    if (e.ifStatus) { return [unsupported('条件付きの消耗は、この確認では扱えません')]; }
    return [0, 8, 20].map((c) => ({
      label: '使用前の ' + label(e.status) + ' 回数 ' + c,
      run() {
        const w = play(ctx, (st, u) => { setStatus(u, e.status, c); });
        const used = Math.min(e.max, c);
        check(has(w, '回数を ' + used + ' 消耗') === used > 0, '消耗量が違います(期待 ' + used + ')\n' + w.st.log.join('\n'));
        if (e.dmgPercent) {
          const pct = used * e.dmgPercent;
          check(has(w, 'ダメージ +' + pct + '%') === pct > 0, 'ダメージ量の増加が違います(期待 +' + pct + '%)');
        }
        const left = Math.max(0, c - used - 1);
        const got = w.unit.st && w.unit.st[e.status] ? w.unit.st[e.status].c : 0;
        check(got === left, '消耗後の回数が違います: ' + got + ' (期待 ' + left + ': 消耗後にラウンド終了で-1)');
      }
    }));
  },
  spentCoin(ctx) {
    const e = ctx.e;
    const sp = ctx.holder.effects.filter((x) => x.type === 'spend' && x.status === e.status)[0];
    if (!sp) { return [unsupported('同じスキルに消耗の効果がありません')]; }
    return [0, 8, 20].map((c) => ({
      label: '使用前の ' + label(e.status) + ' 回数 ' + c,
      run() {
        const w = play(ctx, (st, u) => { setStatus(u, e.status, c); });
        const used = Math.min(sp.max, c);
        const add = Math.floor(used / e.per) * e.amount;
        check(has(w, 'コイン威力 +' + add) === add > 0, 'コイン威力の加算が違います(期待 +' + add + ')\n' + w.st.log.join('\n'));
      }
    }));
  },
  matchBonus(ctx) {
    const p = ctx.holder.p;
    if (!holderOk(ctx, ['passive', 'support'])) { return [unsupported('持ち主の確認部品がありません')]; }
    const mk = (ok) => ({
      label: ok ? '保有条件を満たす' : '保有条件に1足りない',
      run() {
        const w = play(ctx, needPre(p, ok));
        const fired = has(w, 'パッシブ「' + p.name + '」が発動') && has(w, 'マッチ毎' + ctx.e.percentPer);
        check(fired === ok, ok ? 'マッチ勝利時のダメージ増加が発動していません\n' + w.st.log.join('\n') : '保有条件を満たさないのに発動しています');
      }
    });
    return p.sin ? [mk(true), mk(false)] : [mk(true)];
  },
  dmgBonus(ctx) {
    const p = ctx.holder.p;
    if (!holderOk(ctx, ['passive', 'support'])) { return [unsupported('持ち主の確認部品がありません')]; }
    const mk = (ok) => ({
      label: ok ? '保有条件を満たす' : '保有条件に1足りない',
      run() {
        const w = play(ctx, needPre(p, ok));
        check(has(w, 'パッシブ「' + p.name + '」が発動') === ok, ok ? 'パッシブが発動していません' : '保有条件を満たさないのに発動しています');
      }
    });
    return p.sin ? [mk(true), mk(false)] : [mk(true)];
  },
  hpHeal(ctx) {
    const p = ctx.holder.p;
    if (!holderOk(ctx, ['passive', 'support'])) { return [unsupported('持ち主の確認部品がありません')]; }
    const out = [];
    [true, false].forEach((ok) => {
      out.push({
        label: ok ? '保有条件を満たす・体力が減っている' : '保有条件に1足りない',
        run() {
          const w = play(ctx, (st, u, ww) => { needPre(p, ok)(st); u.hp = u.maxHp - 100; });
          check(has(w, w.name + ' の体力が ' + ctx.e.amount + ' 回復') === ok, ok ? '体力が回復していません' : '保有条件を満たさないのに回復しています');
        }
      });
    });
    out.push({
      label: '体力が満タン',
      run() {
        const w = play(ctx, needPre(p, true));
        check(!has(w, ' 回復'), '体力が満タンなのに回復しています');
      }
    });
    return out;
  },
  advanceThreshold(ctx) {
    const e = ctx.e;
    const ego = ctx.pd.egos[ctx.holder.egoId];
    if (ctx.holder.kind !== 'egoPassive') { return [unsupported('持ち主の確認部品がありません')]; }
    const identity = ctx.pd.identities[ctx.identityId];
    const same = identity.skills.filter((s) => s.type === e.skillType)[0];
    const other = identity.skills.filter((s) => s.type !== e.skillType && ['guard', 'evade', 'counter'].indexOf(s.type) < 0)[0];
    const mk = (name, firstEgo, skill) => ({
      label: name,
      run() {
        const w = makeWorld(ctx.pd, ctx.identityId, [ctx.holder.egoId], 3, (st) => { payFor(st, ego); });
        const start = topLine(w);
        runRound(w, pickEgo(w, 0));
        const egoGain = ego.type === e.skillType ? e.amount * ego.coins : 0;
        check(topLine(w) === start + egoGain, 'E.G.O使用のラウンドの前進量が違います: ' + start + ' → ' + topLine(w) + ' (期待 +' + egoGain + ': 使用したラウンドから発動)');
        if (skill) {
          runRound(w, pickSlot(w, skill.tier));
          const gain = skill.type === e.skillType ? e.amount * skill.coins : 0;
          check(topLine(w) === start + egoGain + gain, '次ラウンドの前進量が違います: ' + topLine(w) + ' (期待 ' + (start + egoGain + gain) + ')');
        }
      }
    });
    const out = [mk('E.G.O使用ラウンド', true, null)];
    if (same) { out.push(mk('次ラウンドに ' + e.skillType + ' スキル(' + same.name + ')', false, same)); }
    if (other) { out.push(mk('次ラウンドに別属性スキル(' + other.name + ')は前進しない', false, other)); }
    return out;
  },
  spHeal(ctx) {
    const e = ctx.e;
    if (ctx.holder.kind !== 'egoPassive') { return [unsupported('持ち主の確認部品がありません')]; }
    const ego = ctx.pd.egos[ctx.holder.egoId];
    const mk = (debuff) => ({
      label: debuff ? 'デバフがある(自分にデバフが無い場合の条件。E.G.Oの解除で消えないよう2種類)' : 'デバフが無い',
      run() {
        const w = makeWorld(ctx.pd, ctx.identityId, [ctx.holder.egoId], 3, (st, u) => { payFor(st, ego); if (debuff) { L.addStatus(u, 'burn', { p: 3, c: 5 }); L.addStatus(u, 'rupture', { p: 3, c: 5 }); } });
        runRound(w, pickEgo(w, 0));
        const want = !(debuff && e.when && e.when.self === 'noDebuff');
        check(has(w, w.name + ' の精神力 +' + e.amount) === want, want ? 'ターン開始時の精神力回復がありません' : 'デバフがあるのに精神力が回復しています');
      }
    });
    return [mk(false), mk(true)];
  }
};

function holdersOf(pd, identityId) {
  const identity = pd.identities[identityId];
  const out = [];
  identity.skills.forEach((s) => out.push({ kind: 'skill', tag: 'skill' + s.tier, tier: s.tier, name: s.name, effects: s.effects || [] }));
  if (identity.defense) { out.push({ kind: 'defense', tag: 'def', name: identity.defense.name, effects: identity.defense.effects || [] }); }
  if (identity.passive) { out.push({ kind: 'passive', tag: 'passive', name: identity.passive.name, p: identity.passive, effects: identity.passive.effects || [] }); }
  if (identity.support) { out.push({ kind: 'support', tag: 'support', name: identity.support.name, p: identity.support, effects: identity.support.effects || [] }); }
  Object.keys(pd.egos).forEach((egoId) => {
    const ego = pd.egos[egoId];
    out.push({ kind: 'ego', tag: 'ego', egoId, name: ego.name, effects: ego.effects || [] });
    if (ego.passive) { out.push({ kind: 'egoPassive', tag: 'egopassive', egoId, name: ego.passive.name || ego.name, p: ego.passive, effects: ego.passive.effects || [] }); }
  });
  return out;
}

const RESIST_NAME = { 2: 'weak', 1: 'normal', 0.75: 'resist', 0.5: 'strong' };
const PHYS = ['slash', 'pierce', 'blunt'];
const SINS = ['wrath', 'lust', 'sloth', 'gluttony', 'gloom', 'pride', 'envy'];

function statCases(pd, identityId) {
  const identity = pd.identities[identityId];
  const base = { pid: pd.id, identityId };
  const out = [];
  out.push({
    tags: [pd.id, identityId, 'stats', identity.name],
    name: 'ステータス(体力・速度・混乱区間・物理耐性)',
    run() {
      const w = makeWorld(pd, identityId, [], 4);
      const u = w.unit;
      check(u.maxHp === identity.hp, '体力が違います: ' + u.maxHp);
      check(JSON.stringify(u.speed) === JSON.stringify(identity.speed), '速度が違います: ' + JSON.stringify(u.speed));
      const lines = identity.thr.map((t) => identity.hp * t / 100);
      check(JSON.stringify(u.lines) === JSON.stringify(lines), '混乱区間が違います: ' + JSON.stringify(u.lines) + ' (期待 ' + JSON.stringify(lines) + ')');
      PHYS.forEach((k) => {
        const want = RESIST_NAME[identity.resist[k] === undefined ? 1 : identity.resist[k]];
        check(u.resist[k] === want, k + ' の耐性が違います: ' + u.resist[k] + ' (期待 ' + want + ')');
      });
    }
  });
  Object.keys(pd.egos).forEach((egoId) => {
    const ego = pd.egos[egoId];
    out.push({
      tags: [pd.id, identityId, egoId, 'stats', ego.name],
      name: 'E.G.O ' + ego.name + ' の罪悪耐性',
      run() {
        const w = makeWorld(pd, identityId, [egoId], 4);
        SINS.forEach((k) => {
          const want = RESIST_NAME[ego.resist && ego.resist[k] !== undefined ? ego.resist[k] : 1];
          check(w.unit.resist[k] === want, k + ' の耐性が違います: ' + w.unit.resist[k] + ' (期待 ' + want + ')');
        });
      }
    });
  });
  return out;
}

function collect(data) {
  const cases = [];
  Object.keys(data).forEach((pid) => {
    const pd = data[pid];
    pd.info.identities.forEach((identityId) => {
      statCases(pd, identityId).forEach((c) => cases.push(c));
      holdersOf(pd, identityId).forEach((holder) => {
        holder.effects.forEach((e, idx) => {
          const ctx = { pd, identityId, holder, e, idx };
          const checker = CHECKERS[e.type];
          const vars = checker ? checker(ctx) : [unsupported('効果の種類 "' + e.type + '" の確認部品がありません')];
          vars.forEach((v) => {
            cases.push({
              tags: [pid, identityId, holder.egoId, holder.tag, e.type, holder.name, pd.identities[identityId].name].filter(Boolean),
              name: holder.name + ' / 効果' + (idx + 1) + '(' + e.type + ')' + (v.label ? ' / ' + v.label : ''),
              unsupported: v.unsupported,
              run: v.run
            });
          });
        });
      });
    });
  });
  cases.push({
    tags: ['roster', 'sheet'],
    name: 'キャラクターシートの装備から全囚人の味方データを作れる',
    run: () => {
      const R = require('../../../shared/roster.js');
      const fs = require('fs');
      const path = require('path');
      const seasons = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'data', 'seasons.json'), 'utf8'));
      const units = Object.keys(data).map((pid) => {
        const pd = data[pid];
        const r = R.buildAlly(pid, pd.info, pd.identities, pd.egos, seasons, {}, '../');
        check(r.unit.id === pid, pid + ': 味方のIDが囚人IDと違います');
        check(r.notes.length === 0, pid + ': 既定の装備なのに注意が出ました: ' + r.notes.join(' / '));
        return r.unit;
      });
      const parsed = L.parseSetup({ allies: units });
      check(parsed.errors.length === 0, parsed.errors.join(' / '));
    }
  });
  cases.push({
    tags: ['roster', 'sheet'],
    name: '未所持・未公開の人格を装備していても既定の人格に戻る',
    run: () => {
      const R = require('../../../shared/roster.js');
      const pd = data[Object.keys(data)[0]];
      const base = Object.keys(pd.identities)[0];
      const identities = Object.assign({}, pd.identities, {
        locked: Object.assign({}, pd.identities[base], { name: '未所持', initial: false }),
        future: Object.assign({}, pd.identities[base], { name: '未公開', initial: false, season: 'next' })
      });
      const info = Object.assign({}, pd.info, { identities: pd.info.identities.concat(['locked', 'future']) });
      const seasons = { next: { name: 'N', released: false } };
      const a = R.buildAlly(pd.id, info, identities, pd.egos, seasons, { identity: 'locked', owned: {} }, '');
      check(a.unit.identityName === pd.identities[pd.info.default.identity].name && a.notes.length === 1, '未所持の人格が使われました');
      const b = R.buildAlly(pd.id, info, identities, pd.egos, seasons, { identity: 'future', owned: { future: true } }, '');
      check(b.unit.identityName === a.unit.identityName && b.notes.length === 1, '未公開の人格が使われました');
      const c = R.buildAlly(pd.id, info, identities, pd.egos, { next: { name: 'N', released: true } }, { identity: 'future', owned: { future: true } }, '');
      check(c.unit.identityName === '未公開' && c.notes.length === 0, '公開済み・所持済みの人格が使われませんでした');
    }
  });
  return cases;
}

module.exports = { collect, CHECKERS };
