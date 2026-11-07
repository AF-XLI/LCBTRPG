(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LC = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SINS = {
    wrath: { label: '憤怒', color: 'rgb(220, 60, 50)' },
    lust: { label: '色欲', color: 'rgb(240, 140, 50)' },
    sloth: { label: '怠惰', color: 'rgb(230, 200, 60)' },
    gluttony: { label: '暴食', color: 'rgb(110, 190, 70)' },
    gloom: { label: '憂鬱', color: 'rgb(60, 190, 200)' },
    pride: { label: '傲慢', color: 'rgb(70, 120, 230)' },
    envy: { label: '嫉妬', color: 'rgb(150, 70, 220)' }
  };
  var PHYS = { slash: '斬撃', pierce: '貫通', blunt: '打撃' };
  var RES_MULT = { normal: 1, weak: 2, resist: 0.75 };
  var RES_LABEL = { normal: '普通', weak: '脆弱', resist: '抵抗' };
  var SP_MIN = -45;
  var SP_MAX = 45;
  var KIND_LABEL = { attack: '攻撃', defense: '守備', counter: '反撃' };

  var STATUS = {
    burn: { label: '火傷', type: 'pc', kind: 'debuff', glyph: '火', color: 'rgb(235, 110, 50)', text: 'ラウンド終了時に威力分のダメージ' },
    bleed: { label: '出血', type: 'pc', kind: 'debuff', glyph: '血', color: 'rgb(210, 50, 70)', text: 'コイントス時に威力分のダメージ' },
    vibration: { label: '振動', type: 'pc', kind: 'debuff', glyph: '振', color: 'rgb(140, 170, 235)', text: '振動爆発で混乱線が前進する' },
    rupture: { label: '破裂', type: 'pc', kind: 'debuff', glyph: '破', color: 'rgb(235, 130, 190)', text: 'ダメージ時に威力分の固定ダメージ' },
    sinking: { label: '沈潜', type: 'pc', kind: 'debuff', glyph: '沈', color: 'rgb(80, 130, 210)', text: 'ダメージ時に威力分の精神力ダメージ' },
    breath: { label: '呼吸', type: 'pc', kind: 'buff', glyph: '呼', color: 'rgb(110, 205, 150)', text: '威力×5%でクリティカル' },
    charge: { label: '充電', type: 'pc', kind: 'buff', glyph: '充', color: 'rgb(240, 215, 80)', maxCount: 20, keepPotency: true, text: '消耗でスキルが強化される' },
    paralysis: { label: '麻痺', type: 'val', kind: 'debuff', glyph: '麻', color: 'rgb(200, 190, 90)', text: 'コイン威力を0にする(トスごとに-1)' },
    bind: { label: '束縛', type: 'val', kind: 'debuff', glyph: '縛', color: 'rgb(160, 130, 100)', text: '速度が減少' },
    dmgDown: { label: 'ダメージ量減少', type: 'val', kind: 'debuff', glyph: '攻↓', color: 'rgb(170, 140, 140)', max: 10, text: '与えるダメージが数値×10%減少' },
    fragile: { label: '脆弱', type: 'val', kind: 'debuff', glyph: '脆', color: 'rgb(230, 120, 120)', max: 10, text: '受けるダメージが数値×10%増加' },
    powerDown: { label: '威力減少', type: 'val', kind: 'debuff', glyph: '威↓', color: 'rgb(170, 140, 140)', text: '最終威力を数値分減らす' },
    atkPowerDown: { label: '攻撃威力減少', type: 'val', kind: 'debuff', glyph: '攻威↓', color: 'rgb(170, 140, 140)', text: '攻撃スキルの最終威力を減らす' },
    defPowerDown: { label: '守備威力減少', type: 'val', kind: 'debuff', glyph: '守威↓', color: 'rgb(170, 140, 140)', text: '守備スキルの最終威力を減らす' },
    matchPowerDown: { label: 'マッチ威力減少', type: 'val', kind: 'debuff', glyph: '合威↓', color: 'rgb(170, 140, 140)', text: 'マッチ時の最終威力を減らす' },
    coinWeak: { label: '加算コイン弱化', type: 'val', kind: 'debuff', glyph: '幣↓', color: 'rgb(170, 140, 140)', text: 'コインの加算分を減らす' },
    quick: { label: 'クイック', type: 'val', kind: 'buff', glyph: '速', color: 'rgb(120, 210, 230)', text: '速度が増加' },
    dmgUp: { label: 'ダメージ量増加', type: 'val', kind: 'buff', glyph: '攻↑', color: 'rgb(240, 170, 90)', max: 10, text: '与えるダメージが数値×10%増加' },
    protect: { label: '保護', type: 'val', kind: 'buff', glyph: '護', color: 'rgb(120, 190, 240)', max: 10, text: '受けるダメージが数値×10%減少' },
    powerUp: { label: '威力増加', type: 'val', kind: 'buff', glyph: '威↑', color: 'rgb(240, 170, 90)', text: '最終威力を数値分増やす' },
    atkPowerUp: { label: '攻撃威力増加', type: 'val', kind: 'buff', glyph: '攻威↑', color: 'rgb(240, 170, 90)', text: '攻撃スキルの最終威力を増やす' },
    defPowerUp: { label: '守備威力増加', type: 'val', kind: 'buff', glyph: '守威↑', color: 'rgb(240, 170, 90)', text: '守備スキルの最終威力を増やす' },
    matchPowerUp: { label: 'マッチ威力増加', type: 'val', kind: 'buff', glyph: '合威↑', color: 'rgb(240, 170, 90)', text: 'マッチ時の最終威力を増やす' },
    coinStrong: { label: '加算コイン強化', type: 'val', kind: 'buff', glyph: '幣↑', color: 'rgb(240, 170, 90)', text: 'コインの加算分を増やす' }
  };
  var VARIANT_BASES = { dmgUp: 1, dmgDown: 1, fragile: 1, protect: 1 };

  function A(x) { return Array.isArray(x) ? x : []; }
  function O(x) { return x && typeof x === 'object' ? x : {}; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : (d === undefined ? 0 : d); }
  function randInt(min, max, rng) {
    var lo = Math.ceil(min);
    var hi = Math.floor(max);
    if (hi < lo) { hi = lo; }
    return lo + Math.floor(rng() * (hi - lo + 1));
  }
  function shuffle(arr, rng) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i -= 1) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function normalize(v) {
    if (Array.isArray(v)) { return v.map(normalize); }
    if (v && typeof v === 'object') {
      var keys = Object.keys(v);
      if (keys.length && keys.every(function (k) { return /^\d+$/.test(k); })) {
        var n = Math.max.apply(null, keys.map(Number)) + 1;
        var arr = new Array(n).fill(null);
        keys.forEach(function (k) { arr[Number(k)] = normalize(v[k]); });
        return arr;
      }
      var o = {};
      keys.forEach(function (k) {
        if (v[k] !== null && v[k] !== undefined) { o[k] = normalize(v[k]); }
      });
      return o;
    }
    return v;
  }

  function resBonus(mult) { return mult >= 1 ? mult - 1 : (mult - 1) / 2; }
  function resMultOf(table, key) {
    var v = O(table)[key];
    if (typeof v === 'number') { return v; }
    return RES_MULT[v] !== undefined ? RES_MULT[v] : 1;
  }
  function staggerPhysMult(level) { return 2 + 0.5 * (level - 1); }

  function headsProb(sp) { return clamp(50 + num(sp, 0), 0, 100) / 100; }

  function newState() {
    return { round: 0, phase: 'setup', units: {}, pieces: [], plan: [], proc: { i: 0 }, log: [], fx: { seq: 0, items: [] }, settings: { autoNext: false }, result: '' };
  }

  function sanitizeId(id, fallback, used) {
    var s = String(id === undefined || id === null || id === '' ? fallback : id).replace(/[^A-Za-z0-9_\-]/g, '_');
    if (!/^[A-Za-z_]/.test(s)) { s = 'u' + s; }
    var base = s;
    var n = 2;
    while (used[s]) { s = base + '_' + n; n += 1; }
    used[s] = true;
    return s;
  }

  function initBearerCommon(b, max, rng) {
    b.sp = b.noSp ? 0 : clamp(num(b.sp, 0), SP_MIN, SP_MAX);
    b.speed = A(b.speed).length === 2 ? [num(b.speed[0], 1), num(b.speed[1], 1)] : [1, 1];
    b.st = O(b.st);
    b.next = O(b.next);
    b.resist = O(b.resist);
    b.lines = A(b.lines).length ? b.lines : A(b.thr).map(function (p) { return Math.round(max * num(p, 0) * 10 / 100) / 10; }).sort(function (x, y) { return y - x; });
    b.spd = num(b.spd, 0);
    return b;
  }

  function initUnit(raw, ord, usedIds, rng) {
    var u = clone(raw);
    u.side = u.side === 'enemy' ? 'enemy' : 'ally';
    u.id = sanitizeId(u.id, (u.side === 'enemy' ? 'e' : 'a') + (ord + 1), usedIds);
    u.name = u.name || u.id;
    u.ord = ord;
    u.img = u.img || '';
    u.dead = false;
    u.flags = O(u.flags);
    u.dmgBonus = num(u.dmgBonus, 0);
    if (u.side === 'ally') {
      u.maxHp = Math.max(1, num(u.maxHp, 100));
      u.hp = clamp(num(u.hp, u.maxHp), 0, u.maxHp);
      initBearerCommon(u, u.maxHp, rng);
      u.skills = u.skills || {};
      u.replace = A(u.replace);
      u.deck = { q: [] };
      u.choice = null;
      u.owner = null;
      u.stagger = null;
    } else {
      u.kind = u.kind === 'abnormality' ? 'abnormality' : 'normal';
      u.maxHp = Math.max(1, num(u.maxHp, 100));
      u.hp = clamp(num(u.hp, u.maxHp), 0, u.maxHp);
      u.parts = A(u.parts);
      if (!u.parts.length) { u.parts = [{ name: u.name }]; }
      if (u.kind === 'normal') { u.parts = [u.parts[0]]; }
      u.parts.forEach(function (p, idx) {
        p.name = p.name || ('部位' + (idx + 1));
        if (p.noSp === undefined) { p.noSp = !!u.noSp; }
        p.noSp = !!p.noSp;
        if (u.kind === 'abnormality') {
          p.maxDur = Math.max(1, num(p.maxDur, 50));
          p.dur = clamp(num(p.dur, p.maxDur), 0, p.maxDur);
          p.destroyable = !!p.destroyable;
          p.destroyed = false;
          initBearerCommon(p, p.maxDur, rng);
        } else {
          initBearerCommon(p, u.maxHp, rng);
        }
        p.skills = O(p.skills);
        p.skillSets = A(p.skillSets);
        p.setIdx = 0;
        p.loopPos = 0;
        p.stagger = null;
        p.img = p.img || '';
      });
    }
    return u;
  }

  function parseSetup(input) {
    var errors = [];
    var data = input;
    if (typeof input === 'string') {
      try { data = JSON.parse(input); } catch (e) { return { units: [], errors: ['JSONの形式が正しくありません: ' + e.message] }; }
    }
    var list = [];
    if (Array.isArray(data)) { list = data; }
    else if (data && typeof data === 'object') {
      list = A(data.allies).map(function (u) { var c = clone(u); c.side = 'ally'; return c; })
        .concat(A(data.enemies).map(function (u) { var c = clone(u); c.side = 'enemy'; return c; }));
      if (!list.length && (data.name || data.maxHp)) { list = [data]; }
    }
    if (!list.length) { errors.push('キャラクターが1体も見つかりませんでした(allies / enemies を確認してください)'); }
    list.forEach(function (u, i) {
      if (!u || typeof u !== 'object') { errors.push((i + 1) + '番目が不正です'); return; }
      if (u.side === 'ally') {
        [1, 2, 3, 0].forEach(function (n) {
          if (!u.skills || !u.skills[n]) { errors.push((u.name || (i + 1) + '番目') + ': スキル' + n + 'がありません'); }
        });
      }
    });
    return { units: list, errors: errors };
  }

  function loadUnits(state, rawList, rng) {
    var used = {};
    Object.keys(state.units).forEach(function (k) { used[k] = true; });
    var ord = Object.keys(state.units).length;
    rawList.forEach(function (raw) {
      var u = initUnit(raw, ord, used, rng);
      state.units[u.id] = u;
      ord += 1;
    });
  }

  function getB(state, ref) {
    var unit = state.units[ref.u];
    if (!unit) { return null; }
    var part = unit.side === 'enemy' ? unit.parts[ref.p === null || ref.p === undefined ? 0 : ref.p] : null;
    if (unit.side === 'enemy' && !part) { return null; }
    return { unit: unit, part: part, b: part || unit, ref: { u: ref.u, p: unit.side === 'enemy' ? (ref.p || 0) : null } };
  }
  function nameOf(state, ref) {
    var g = getB(state, ref);
    if (!g) { return '?'; }
    if (g.unit.side === 'enemy' && g.unit.parts.length > 1) { return g.unit.name + '・' + g.part.name; }
    return g.unit.name;
  }
  function hpInfo(unit, part) {
    if (unit.side === 'enemy' && unit.kind === 'abnormality' && part) { return { cur: part.dur, max: part.maxDur }; }
    return { cur: unit.hp, max: unit.maxHp };
  }
  function isOut(g) {
    if (!g) { return true; }
    if (g.unit.dead) { return true; }
    if (g.part && g.part.destroyed) { return true; }
    return false;
  }
  function log(state, text) {
    state.log = A(state.log);
    state.log.push('R' + state.round + ' ' + text);
    if (state.log.length > 160) { state.log = state.log.slice(state.log.length - 160); }
  }
  function fx(state, ref, text, kind) {
    state.fx = state.fx || { seq: 0, items: [] };
    state.fx.items = A(state.fx.items);
    state.fx.items.push({ u: ref.u, p: ref.p === undefined ? null : ref.p, text: text, kind: kind || 'dmg' });
  }

  function statusParts(id) {
    var s = String(id).split('@');
    return { base: s[0], suf: s[1] || '' };
  }
  function addStatus(b, id, amt) {
    var sp = statusParts(id);
    var def = STATUS[sp.base];
    if (!def) { return; }
    amt = amt || {};
    b.st = O(b.st);
    var cur = b.st[id];
    if (def.type === 'pc') {
      if ((!cur || num(cur.c, 0) <= 0) && num(amt.p, 0) > 0 && !(num(amt.c, 0) > 0)) { amt = { p: amt.p, c: 1, k: amt.k }; }
      cur = cur || { p: 0, c: 0 };
      cur.p = Math.min(99, num(cur.p, 0) + num(amt.p, 0));
      cur.c = Math.min(def.maxCount || 99, num(cur.c, 0) + num(amt.c, 0));
      if (def.keepPotency && cur.c >= 1 && cur.p < 1) { cur.p = 1; }
      if (sp.base === 'vibration') { cur.k = amt.k || cur.k || 'vibration'; }
      if (cur.c <= 0 && !(def.keepPotency && cur.p > 0)) { delete b.st[id]; } else { b.st[id] = cur; }
    } else {
      cur = cur || { v: 0 };
      cur.v = Math.min(def.max || 99, num(cur.v, 0) + num(amt.v, 0));
      if (cur.v <= 0) { delete b.st[id]; } else { b.st[id] = cur; }
    }
  }
  function sumVal(b, base, skill) {
    var st = O(b && b.st);
    var s = 0;
    Object.keys(st).forEach(function (k) {
      var sp = statusParts(k);
      if (sp.base !== base) { return; }
      if (!sp.suf || (skill && (sp.suf === skill.sin || sp.suf === skill.phys))) { s += num(st[k].v, 0); }
    });
    return s;
  }
  function vOf(b, id) { var s = O(b && b.st)[id]; return s ? num(s.v, 0) : 0; }

  function condOk(state, g, when, targetG) {
    if (!when) { return true; }
    if (when.manual) { return !!O(g.unit.flags)[when.manual]; }
    if (when.status) {
      var holder = when.of === 'target' && targetG ? targetG.b : g.b;
      var st = O(holder.st)[when.status] || {};
      var f = when.field || 'c';
      var v = num(st[f], 0);
      var min = when.min === undefined ? -Infinity : when.min;
      var max = when.max === undefined ? Infinity : when.max;
      return v >= min && v < max;
    }
    return true;
  }
  function slotSkill(state, unit, n) {
    var sk = O(unit.skills)[n] || null;
    var g = { unit: unit, b: unit };
    A(unit.replace).forEach(function (r) {
      if (r.slot === n && r.with && condOk(state, g, r.when, null)) { sk = r.with; }
    });
    return sk;
  }
  function skillView(state, g, skill, targetG) {
    var hit = null;
    A(skill && skill.branches).forEach(function (br) {
      if (!hit && condOk(state, g, br.when, targetG)) { hit = br; }
    });
    return hit;
  }

  function ensureDeck(unit, rng) {
    unit.deck = unit.deck || { q: [] };
    unit.deck.q = A(unit.deck.q);
    if (unit.deck.q.length <= 2) { unit.deck.q = unit.deck.q.concat(shuffle([1, 1, 1, 2, 2, 3], rng)); }
  }
  function handOf(state, unit) {
    var q = A(unit.deck && unit.deck.q);
    function card(pos) {
      if (q[pos] === undefined) { return null; }
      return { pos: pos, num: q[pos], skill: slotSkill(state, unit, q[pos]) };
    }
    return { sel: [card(0), card(1)], preview: card(2), def: { num: 0, skill: O(unit.skills)[0] || null } };
  }

  function chosenSkill(state, unit) {
    var ch = unit.choice;
    if (!ch) { return null; }
    if (ch.sel === 'def') { return O(unit.skills)[0] || null; }
    var q = A(unit.deck && unit.deck.q);
    var pos = ch.sel === 'c1' ? 1 : 0;
    if (q[pos] === undefined) { return null; }
    return slotSkill(state, unit, q[pos]);
  }

  function pieceId(u, p, n) { return u + '|' + p + '|' + n; }
  function getPiece(state, pid) {
    if (!pid) { return null; }
    var found = null;
    A(state.pieces).forEach(function (p) { if (p.pid === pid) { found = p; } });
    if (found) { return found; }
    var s = String(pid).split('|');
    if (s.length === 3 && s[2] === 'b' && state.units[s[0]]) {
      return { pid: pid, unitId: s[0], partIdx: Number(s[1]), key: '', blank: true, target: null };
    }
    return null;
  }
  function pieceSkill(state, P) {
    if (!P || P.blank) { return null; }
    var u = state.units[P.unitId];
    var part = u && u.parts[P.partIdx];
    return part ? O(part.skills)[P.key] || null : null;
  }
  function pieceRef(P) { return { u: P.unitId, p: P.partIdx }; }

  function enemySetMatches(state, unit, part, when) {
    if (!when) { return true; }
    var ok = true;
    if (when.round !== undefined && state.round < when.round) { ok = false; }
    if (when.hpBelow !== undefined) {
      var info = hpInfo(unit, part);
      if (!(info.cur <= when.hpBelow)) { ok = false; }
    }
    if (when.hpSharedBelow !== undefined && !(unit.hp <= when.hpSharedBelow)) { ok = false; }
    if (when.partDestroyed !== undefined) {
      var tp = unit.parts[when.partDestroyed];
      if (!tp || !tp.destroyed) { ok = false; }
    }
    if (when.selfStatus) {
      var st = O(part.st)[when.selfStatus.key] || {};
      if (num(st[when.selfStatus.field || 'c'], 0) < num(when.selfStatus.min, 1)) { ok = false; }
    }
    if (when.opponentStatus) {
      var cnt = 0;
      Object.keys(state.units).forEach(function (id) {
        var x = state.units[id];
        if (x.side === 'ally' && !x.dead) {
          var s = O(x.st)[when.opponentStatus.key] || {};
          cnt += num(s[when.opponentStatus.field || 'c'], 0);
        }
      });
      if (cnt < num(when.opponentStatus.min, 1)) { ok = false; }
    }
    if (when.allyStatus) {
      var cnt2 = 0;
      Object.keys(state.units).forEach(function (id) {
        var x = state.units[id];
        if (x.side === 'enemy' && !x.dead) {
          x.parts.forEach(function (pp) {
            var s = O(pp.st)[when.allyStatus.key] || {};
            cnt2 += num(s[when.allyStatus.field || 'c'], 0);
          });
        }
      });
      if (cnt2 < num(when.allyStatus.min, 1)) { ok = false; }
    }
    return ok;
  }

  function planEnemyPieces(state) {
    var pieces = [];
    Object.keys(state.units).forEach(function (id) {
      var u = state.units[id];
      if (u.side !== 'enemy' || u.dead) { return; }
      u.parts.forEach(function (part, pi) {
        if (part.destroyed) { return; }
        var sets = A(part.skillSets);
        var idx = 0;
        sets.forEach(function (s, i) { if (enemySetMatches(state, u, part, s.when)) { idx = i; } });
        if (idx !== part.setIdx) { part.setIdx = idx; part.loopPos = 0; }
        var set = sets[idx];
        var keys = [];
        if (set && A(set.loop).length) {
          keys = A(set.loop[part.loopPos % set.loop.length]);
          part.loopPos += 1;
        }
        keys.forEach(function (k, n) {
          if (O(part.skills)[k]) { pieces.push({ pid: pieceId(id, pi, n), unitId: id, partIdx: pi, key: k, target: null }); }
        });
      });
    });
    state.pieces = pieces;
  }

  function rebuildPiecesFor(state, unitId, partIdx, keys) {
    var keep = A(state.pieces).filter(function (p) { return !(p.unitId === unitId && p.partIdx === partIdx); });
    var u = state.units[unitId];
    var part = u && u.parts[partIdx];
    if (!part) { return; }
    var add = [];
    keys.forEach(function (k, n) {
      if (O(part.skills)[k]) { add.push({ pid: pieceId(unitId, partIdx, n), unitId: unitId, partIdx: partIdx, key: k, target: null }); }
    });
    state.pieces = keep.concat(add);
  }

  function startRound(state, rng) {
    state.round += 1;
    state.phase = 'enemy';
    state.plan = [];
    state.proc = { i: 0 };
    state.fx = { seq: (state.fx ? state.fx.seq : 0) + 1, items: [] };
    log(state, '--- ラウンド' + state.round + ' 開始 ---');
    function activate(b) {
      b.st = O(b.st);
      Object.keys(O(b.next)).forEach(function (id) { addStatus(b, id, b.next[id]); });
      b.next = {};
    }
    function drawSpeed(b) {
      var base = randInt(b.speed[0], b.speed[1], rng);
      b.spd = Math.max(0, base + vOf(b, 'quick') - vOf(b, 'bind'));
    }
    Object.keys(state.units).forEach(function (id) {
      var u = state.units[id];
      if (u.dead) { return; }
      if (u.side === 'ally') {
        activate(u);
        drawSpeed(u);
        u.choice = null;
        ensureDeck(u, rng);
        if (u.stagger) { u.choice = { sel: 'stag', target: null, confirmed: true, ts: 0 }; }
      } else {
        u.parts.forEach(function (p) { activate(p); drawSpeed(p); });
      }
    });
    planEnemyPieces(state);
  }

  function beginCombat(state, rng) {
    state.round = 0;
    state.log = [];
    Object.keys(state.units).forEach(function (id) {
      var u = state.units[id];
      if (u.side === 'ally') { u.deck = { q: [] }; }
    });
    startRound(state, rng);
  }

  function gmConfirm(state) {
    A(state.pieces).forEach(function (p) {
      var sk = pieceSkill(state, p);
      if (sk && sk.kind === 'counter') { p.target = null; }
    });
    state.phase = 'player';
  }

  function allyChoiceList(state) {
    var list = [];
    Object.keys(state.units).forEach(function (id) {
      var u = state.units[id];
      if (u.side !== 'ally' || u.dead || u.stagger) { return; }
      var ch = u.choice;
      if (!ch || !ch.target) { return; }
      var sk = chosenSkill(state, u);
      if (!sk || (sk.kind !== 'attack' && sk.kind !== 'defense')) { return; }
      list.push({ id: id, ts: num(ch.ts, 0), pid: ch.target, spd: u.spd, def: sk.kind === 'defense' });
    });
    list.sort(function (a, b) { return a.ts - b.ts; });
    return list;
  }

  function pieceSpeed(state, P) {
    var g = getB(state, pieceRef(P));
    return g ? g.b.spd : 0;
  }

  function computePairs(state) {
    var matchOf = {};
    var allyMatch = {};
    var defenders = {};
    allyChoiceList(state).forEach(function (a) {
      var P = getPiece(state, a.pid);
      if (!P) { return; }
      var sk = pieceSkill(state, P);
      if (!sk || sk.kind !== 'attack') { return; }
      if (a.spd > pieceSpeed(state, P)) { matchOf[P.pid] = a.id; defenders[P.pid] = a.def; }
      else if (P.target === a.id && !matchOf[P.pid]) { matchOf[P.pid] = a.id; defenders[P.pid] = a.def; }
    });
    Object.keys(matchOf).forEach(function (pid) { allyMatch[matchOf[pid]] = pid; });
    Object.keys(defenders).forEach(function (pid) { if (!defenders[pid]) { delete defenders[pid]; } });
    return { matchOf: matchOf, allyMatch: allyMatch, defenders: defenders };
  }

  function allConfirmed(state) {
    var ok = true;
    Object.keys(state.units).forEach(function (id) {
      var u = state.units[id];
      if (u.side !== 'ally' || u.dead) { return; }
      if (!u.choice || !u.choice.confirmed) { ok = false; }
    });
    return ok;
  }

  function canConfirm(state, unit) {
    var ch = unit.choice;
    if (!ch) { return false; }
    if (ch.sel === 'stag' || ch.sel === 'none') { return true; }
    var sk = chosenSkill(state, unit);
    if (!sk) { return false; }
    if (sk.kind === 'counter') { return true; }
    return !!ch.target;
  }

  function checkStagger(state, ref) {
    var g = getB(state, ref);
    if (!g || isOut(g)) { return false; }
    var info = hpInfo(g.unit, g.part);
    var lines = A(g.b.lines);
    var crossed = lines.filter(function (l) { return info.cur < l; });
    if (!crossed.length) { return false; }
    g.b.lines = lines.filter(function (l) { return info.cur >= l; });
    var lvl = crossed.length;
    var cur = g.b.stagger;
    g.b.stagger = { level: (cur ? cur.level : 0) + lvl, until: state.round + 1 };
    var label = '混乱' + new Array(g.b.stagger.level).join('+');
    log(state, nameOf(state, ref) + ' が' + label + '状態になった(耐性低下・行動不能)');
    fx(state, ref, label, 'stagger');
    return true;
  }

  function dealHp(state, ref, amount, why) {
    var g = getB(state, ref);
    if (!g || isOut(g)) { return 0; }
    amount = Math.max(0, Math.floor(amount));
    var bar = num(g.b.barrier, 0);
    if (bar > 0 && amount > 0) {
      var ab = Math.min(bar, amount);
      g.b.barrier = bar - ab;
      amount -= ab;
      log(state, '  バリアが ' + ab + ' 軽減(残り' + g.b.barrier + ')');
      fx(state, ref, 'バリア-' + ab, 'guard');
      if (amount <= 0) { return 0; }
    }
    if (g.unit.side === 'ally' || g.unit.kind === 'normal') {
      g.unit.hp = Math.max(0, g.unit.hp - amount);
    } else {
      g.unit.hp = Math.max(0, g.unit.hp - amount);
      g.part.dur = Math.max(0, g.part.dur - amount);
    }
    if (g.unit.hp <= 0) {
      g.unit.dead = true;
      log(state, nameOf(state, { u: ref.u, p: null }) + ' が倒れた(戦闘から離脱)');
      fx(state, ref, '離脱', 'down');
      return amount;
    }
    if (g.part && g.part.dur <= 0 && g.part.destroyable) {
      g.part.destroyed = true;
      log(state, nameOf(state, ref) + ' が破壊された');
      fx(state, ref, '破壊', 'down');
      return amount;
    }
    checkStagger(state, ref);
    return amount;
  }

  function changeSp(state, ref, delta) {
    var g = getB(state, ref);
    if (!g || g.b.noSp) { return; }
    g.b.sp = clamp(num(g.b.sp, 0) + delta, SP_MIN, SP_MAX);
    if (g.b.sp <= SP_MIN) { log(state, nameOf(state, ref) + ' の精神力が' + SP_MIN + 'になった(パニック)'); }
  }

  function coinAdd(b, c) {
    return Math.max(0, num(c, 0) + vOf(b, 'coinStrong') - vOf(b, 'coinWeak'));
  }
  function powerAdj(b, skill, clash) {
    var a = vOf(b, 'powerUp') - vOf(b, 'powerDown');
    if (skill.kind === 'attack') { a += vOf(b, 'atkPowerUp') - vOf(b, 'atkPowerDown'); }
    else { a += vOf(b, 'defPowerUp') - vOf(b, 'defPowerDown'); }
    if (clash) { a += vOf(b, 'matchPowerUp') - vOf(b, 'matchPowerDown'); }
    return a;
  }

  function onToss(state, ref, skill) {
    var g = getB(state, ref);
    if (!g || isOut(g)) { return; }
    var bl = O(g.b.st).bleed;
    var bleeds = skill.kind === 'attack' || (skill.kind === 'defense' && skill.sub !== 'evade');
    if (bl && num(bl.p, 0) > 0 && bleeds) {
      var dmg = num(bl.p, 0);
      log(state, nameOf(state, ref) + ' は出血で ' + dmg + ' ダメージ');
      fx(state, ref, '-' + dmg, 'bleed');
      bl.c -= 1;
      if (bl.c <= 0) { delete g.b.st.bleed; }
      dealHp(state, ref, dmg, 'bleed');
    }
  }

  function tossOne(state, ref, skill, coinPower, rng) {
    var g = getB(state, ref);
    onToss(state, ref, skill);
    var heads = rng() < headsProb(g.b.sp);
    var add = heads ? coinAdd(g.b, coinPower) : 0;
    var pa = O(g.b.st).paralysis;
    if (pa && pa.v > 0) {
      if (heads) { add = 0; }
      pa.v -= 1;
      if (pa.v <= 0) { delete g.b.st.paralysis; }
    }
    return { heads: heads, add: add };
  }

  function tossSet(state, ref, skill, coins, rng, isClash) {
    var g = getB(state, ref);
    var sum = 0;
    var heads = [];
    coins.forEach(function (c) {
      if (isOut(getB(state, ref))) { return; }
      var r = tossOne(state, ref, skill, c, rng);
      heads.push(r.heads);
      sum += r.add;
    });
    var power = Math.max(0, num(skill.base, 0) + sum + powerAdj(g.b, skill, isClash !== false));
    return { heads: heads, power: power };
  }

  function buffFrame(atkB, atkUnit, defB, skill) {
    var f = 1 + 0.1 * (sumVal(atkB, 'dmgUp', skill) - sumVal(atkB, 'dmgDown', skill) + sumVal(defB, 'fragile', skill) - sumVal(defB, 'protect', skill));
    f += num(skill.dmgBonus, 0) + num(atkUnit.dmgBonus, 0);
    A(atkUnit.dmgBonusIf).forEach(function (r) {
      if (r.when === 'targetSpLower' && !defB.noSp && num(defB.sp, 0) < num(atkB.sp, 0)) { f += num(r.value, 0); }
    });
    return Math.max(0, f);
  }
  function resFrame(defG, skill, matches, crit) {
    var physM = defG.b.stagger ? staggerPhysMult(defG.b.stagger.level) : resMultOf(defG.b.resist, skill.phys);
    var sinM = resMultOf(defG.b.resist, skill.sin);
    var f = 1 + resBonus(physM) + resBonus(sinM) + 0.03 * matches + (crit ? 0.2 : 0);
    return Math.max(0, f);
  }
  function calcDamage(power, bf, rf) {
    return Math.max(1, Math.floor(power * bf * rf));
  }

  function applyGrants(state, atkRef, defRef, skill, when, coin) {
    A(skill.grants).forEach(function (gr) {
      if ((gr.when || 'hit') !== when) { return; }
      if (coin === undefined) { if (gr.coin) { return; } }
      else if (gr.coin !== coin) { return; }
      var tref = gr.to === 'self' ? atkRef : defRef;
      var tg = getB(state, tref);
      if (!tg || isOut(tg)) { return; }
      if (gr.next) {
        tg.b.next = O(tg.b.next);
        var cur = tg.b.next[gr.status] || { p: 0, c: 0, v: 0 };
        cur.p += num(gr.p, 0);
        cur.c += num(gr.c, 0);
        cur.v += num(gr.v, 0);
        tg.b.next[gr.status] = cur;
        log(state, nameOf(state, tref) + ' に次ラウンド付与: ' + (STATUS[statusParts(gr.status).base] || { label: gr.status }).label);
      } else {
        addStatus(tg.b, gr.status, { p: gr.p, c: gr.c, v: gr.v, k: gr.k });
        log(state, nameOf(state, tref) + ' に ' + (STATUS[statusParts(gr.status).base] || { label: gr.status }).label + ' を付与');
      }
    });
  }

  function attackSeq(state, atk, defRef, matches, rng, evade) {
    var skill = atk.skill;
    var sum = 0;
    var hit = false;
    var coins = atk.coins;
    for (var i = 0; i < coins.length; i += 1) {
      var ag = getB(state, atk.ref);
      var dg = getB(state, defRef);
      if (isOut(ag) || isOut(dg)) { break; }
      var r = tossOne(state, atk.ref, skill, coins[i], rng);
      if (isOut(getB(state, atk.ref))) { break; }
      sum += r.add;
      var power = Math.max(0, num(skill.base, 0) + sum + powerAdj(ag.b, skill, false));
      if (evade && evade.active) {
        var ev = tossSet(state, evade.ref, evade.skill, evade.skill.coins, rng, false);
        applyGrants(state, evade.ref, atk.ref, evade.skill, 'use');
        if (power <= ev.power) {
          log(state, nameOf(state, atk.ref) + ' コイン' + (i + 1) + ' 威力' + power + ' → ' + nameOf(state, defRef) + ' が回避成功(回避威力' + ev.power + ')');
          fx(state, defRef, '回避', 'guard');
          continue;
        }
        evade.active = false;
        evade.fail();
        log(state, nameOf(state, defRef) + ' の回避は失敗(回避威力' + ev.power + ' < 攻撃威力' + power + ')');
      }
      var crit = false;
      var br = O(ag.b.st).breath;
      if (br && br.c > 0 && (skill.kind === 'attack' || skill.kind === 'counter')) {
        if (rng() < Math.min(1, num(br.p, 0) * 0.05)) {
          crit = true;
          br.c -= 1;
          if (br.c <= 0) { delete ag.b.st.breath; }
        }
      }
      var bf = buffFrame(ag.b, ag.unit, dg.b, skill);
      var rf = resFrame(dg, skill, matches, crit);
      var dmg = calcDamage(power, bf, rf);
      dealHp(state, defRef, dmg, 'attack');
      hit = true;
      log(state, nameOf(state, atk.ref) + ' コイン' + (i + 1) + ' ' + (r.heads ? '表' : '裏') + ' 威力' + power + ' → ' + nameOf(state, defRef) + ' に ' + dmg + (crit ? ' (クリティカル)' : ''));
      fx(state, defRef, String(dmg), crit ? 'crit' : 'dmg');
      var dg2 = getB(state, defRef);
      var ru = O(dg2.b.st).rupture;
      if (ru && num(ru.p, 0) > 0 && !isOut(dg2)) {
        var fixed = num(ru.p, 0);
        ru.c -= 1;
        if (ru.c <= 0) { delete dg2.b.st.rupture; }
        dealHp(state, defRef, fixed, 'rupture');
        log(state, '  破裂: ' + nameOf(state, defRef) + ' に固定 ' + fixed);
        fx(state, defRef, String(fixed), 'rupture');
      }
      var dg3 = getB(state, defRef);
      var sk = O(dg3.b.st).sinking;
      if (sk && num(sk.p, 0) > 0 && !isOut(dg3)) {
        var pot = num(sk.p, 0);
        sk.c -= 1;
        if (sk.c <= 0) { delete dg3.b.st.sinking; }
        if (dg3.b.noSp) {
          var conv = Math.max(1, Math.floor(pot * (1 + resBonus(resMultOf(dg3.b.resist, 'gloom')))));
          dealHp(state, defRef, conv, 'sinking');
          log(state, '  沈潜: ' + nameOf(state, defRef) + ' に憂鬱ダメージ ' + conv);
          fx(state, defRef, String(conv), 'sinking');
        } else {
          changeSp(state, defRef, -pot);
          log(state, '  沈潜: ' + nameOf(state, defRef) + ' の精神力 -' + pot);
          fx(state, defRef, '精神-' + pot, 'sinking');
        }
      }
      applyGrants(state, atk.ref, defRef, skill, 'hit', i + 1);
    }
    if (hit) { applyGrants(state, atk.ref, defRef, skill, 'hit'); }
    return hit;
  }

  function consumeBranch(state, g, consume) {
    var st = O(g.b.st)[consume.status];
    if (!st) { return; }
    var n = consume.amount === 'all' ? num(st.c, 0) : Math.min(num(consume.amount, 0), num(st.c, 0));
    st.c = num(st.c, 0) - n;
    if (consume.status === 'charge') {
      var before = Math.floor(num(g.b.chargeUsed, 0) / 10);
      g.b.chargeUsed = num(g.b.chargeUsed, 0) + n;
      var after = Math.floor(g.b.chargeUsed / 10);
      if (after > before) { st.p = Math.min(99, num(st.p, 0) + after - before); }
      if (st.c <= 0 && num(st.p, 0) <= 0) { delete g.b.st.charge; }
    } else if (st.c <= 0) {
      delete g.b.st[consume.status];
    }
  }

  function resolveSkill(state, ref, skill, targetRef) {
    var g = getB(state, ref);
    var tg = targetRef ? getB(state, targetRef) : null;
    var s = clone(skill);
    var hit = skillView(state, g, skill, tg);
    if (hit) {
      var as = hit.as || {};
      Object.keys(as).forEach(function (k) { s[k] = clone(as[k]); });
      s.branched = hit.label || true;
      if (hit.consume) { consumeBranch(state, g, hit.consume); }
      log(state, nameOf(state, ref) + ' のスキルが変化: ' + (s.name || ''));
    }
    s.coins = A(s.coins).slice();
    s.kind = s.kind || 'attack';
    if (s.kind === 'defense' && !s.sub) { s.sub = 'guard'; }
    return s;
  }

  function reactiveType(skill) {
    if (!skill) { return ''; }
    if (skill.kind === 'counter') { return 'counter'; }
    if (skill.kind === 'defense') { return skill.sub === 'evade' ? 'evade' : 'guard'; }
    return '';
  }

  function targetGone(state, P) {
    if (!P.target) { return true; }
    var au = state.units[P.target];
    if (!au || au.dead || au.stagger) { return true; }
    var ch = au.choice;
    return !!(ch && (ch.acted || ch.sel === 'none' || ch.sel === 'stag'));
  }

  function findReactive(state, defRef, atk) {
    var g = getB(state, defRef);
    var uid = atk ? atk.uid : 0;
    if (!g || isOut(g)) { return null; }
    if (g.b.stagger) { return null; }
    if (g.unit.side === 'ally') {
      var ch = g.unit.choice;
      if (!ch || ch.sel !== 'def') { return null; }
      var sk = O(g.unit.skills)[0];
      var t = reactiveType(sk);
      if (!t) { return null; }
      if (t !== 'counter' && !ch.defActive) { return null; }
      if (t === 'evade' && ch.evadeOff) { return null; }
      ch.cUsed = O(ch.cUsed);
      return {
        type: t,
        ref: defRef,
        raw: sk,
        used: t === 'counter' ? !!ch.cUsed[uid] : !!ch.defUsed,
        evadeOff: !!ch.evadeOff,
        mark: function () { if (t === 'counter') { g.unit.choice.cUsed[uid] = true; } else { g.unit.choice.defUsed = true; } },
        fail: function () { g.unit.choice.evadeOff = true; }
      };
    }
    var list = [];
    A(state.pieces).forEach(function (P, idx) {
      if (P.unitId !== defRef.u || P.partIdx !== (defRef.p || 0)) { return; }
      var sk2 = pieceSkill(state, P);
      var t2 = reactiveType(sk2);
      if (!t2) { return; }
      var targeted = false;
      if (t2 === 'counter') {
        P.cUsed = O(P.cUsed);
        if (P.cUsed[uid]) { return; }
      } else {
        if (t2 === 'evade' && P.evadeOff) { return; }
        if (t2 === 'guard' && P.defUsed) { return; }
        if (P.defActive) { targeted = true; }
        else if (!P.target || targetGone(state, P)) { targeted = false; }
        else { return; }
      }
      list.push({ P: P, type: t2, raw: sk2, targeted: targeted, idx: idx });
    });
    if (!list.length) { return null; }
    list.sort(function (x, y) { return (y.targeted ? 1 : 0) - (x.targeted ? 1 : 0) || x.idx - y.idx; });
    var pick = list[0];
    var P2 = pick.P;
    if (pick.type !== 'counter' && !P2.defActive) {
      P2.defActive = true;
      log(state, nameOf(state, defRef) + ' の' + (pick.type === 'evade' ? '回避' : '防御') + '「' + (pick.raw.name || '') + '」が最初に受けた攻撃で発動');
    }
    return {
      type: pick.type,
      ref: defRef,
      raw: pick.raw,
      used: pick.type === 'counter' ? !!O(P2.cUsed)[uid] : !!P2.defUsed,
      evadeOff: !!P2.evadeOff,
      mark: function () { if (pick.type === 'counter') { P2.cUsed = O(P2.cUsed); P2.cUsed[uid] = true; } else { P2.defUsed = true; } },
      fail: function () { P2.evadeOff = true; }
    };
  }

  function clash(state, X, Y, rng) {
    var matches = 0;
    var guard = 0;
    while (X.coins.length && Y.coins.length && guard < 80) {
      guard += 1;
      var rx = tossSet(state, X.ref, X.skill, X.coins, rng);
      var ry = tossSet(state, Y.ref, Y.skill, Y.coins, rng);
      matches += 1;
      var ox = isOut(getB(state, X.ref));
      var oy = isOut(getB(state, Y.ref));
      if (ox || oy) { break; }
      log(state, 'マッチ: ' + nameOf(state, X.ref) + ' 威力' + rx.power + ' VS ' + nameOf(state, Y.ref) + ' 威力' + ry.power);
      if (rx.power > ry.power) { Y.coins.shift(); }
      else if (rx.power < ry.power) { X.coins.shift(); }
      else { log(state, '  同値のため振り直し'); }
    }
    var winner = null;
    var loser = null;
    if (X.coins.length && !Y.coins.length) { winner = X; loser = Y; }
    else if (Y.coins.length && !X.coins.length) { winner = Y; loser = X; }
    if (winner) {
      log(state, '  → ' + nameOf(state, winner.ref) + ' の勝利 (マッチ' + matches + '回)');
      var wg = getB(state, winner.ref);
      if (wg && !isOut(wg)) {
        var gain = 8 + matches * 2;
        changeSp(state, winner.ref, gain);
        fx(state, winner.ref, '精神+' + gain, 'sp');
      }
      var lg = getB(state, loser.ref);
      if (!isOut(wg) && !isOut(lg)) {
        if (winner.skill.kind === 'attack' || winner.skill.kind === 'counter') {
          attackWithReactive(state, winner, loser.ref, matches, rng);
        } else {
          log(state, '  ' + nameOf(state, winner.ref) + ' は攻撃を防いだ');
          fx(state, winner.ref, '防御', 'guard');
        }
      }
    }
    return { winner: winner, matches: matches };
  }

  function sideOfAlly(state, unit, skill) {
    state.atkSeq = num(state.atkSeq, 0) + 1;
    return { ref: { u: unit.id, p: null }, skill: skill, coins: skill.coins.slice(), uid: 'k' + state.atkSeq };
  }
  function sideOfPiece(state, P, skill) {
    state.atkSeq = num(state.atkSeq, 0) + 1;
    return { ref: pieceRef(P), skill: skill, coins: skill.coins.slice(), uid: 'k' + state.atkSeq };
  }

  function activateEnemyDefense(state, allyId, partRef) {
    var g = getB(state, partRef);
    if (!g || g.unit.side !== 'enemy' || isOut(g) || g.b.stagger) { return; }
    A(state.pieces).forEach(function (P) {
      if (P.unitId !== partRef.u || P.partIdx !== (partRef.p || 0) || P.target !== allyId || P.defActive) { return; }
      var sk = pieceSkill(state, P);
      var t = reactiveType(sk);
      if (t === 'guard' || t === 'evade') {
        P.defActive = true;
        log(state, nameOf(state, partRef) + ' の' + (t === 'evade' ? '回避' : '防御') + '「' + (sk.name || '') + '」が発動可能になった');
      }
    });
  }

  function engage(state, atk, defRef, rng) {
    attackWithReactive(state, atk, defRef, 0, rng);
  }

  function attackWithReactive(state, atk, defRef, matches, rng) {
    var react = findReactive(state, defRef, atk);
    if (!react) { attackSeq(state, atk, defRef, matches, rng); return; }
    var skill = resolveSkill(state, defRef, react.raw, null);
    if (react.type === 'guard') {
      if (!react.used) {
        react.mark();
        var gr = tossSet(state, defRef, skill, skill.coins, rng, false);
        var gg = getB(state, defRef);
        gg.b.barrier = num(gg.b.barrier, 0) + gr.power;
        log(state, nameOf(state, defRef) + ' が防御「' + (skill.name || '') + '」でバリア ' + gr.power + ' を獲得');
        fx(state, defRef, 'バリア+' + gr.power, 'guard');
        applyGrants(state, defRef, atk.ref, skill, 'use');
      }
      attackSeq(state, atk, defRef, matches, rng);
      return;
    }
    if (react.type === 'evade') {
      var ev = { ref: defRef, skill: skill, active: !react.evadeOff, fail: react.fail };
      attackSeq(state, atk, defRef, matches, rng, ev);
      return;
    }
    var gb = getB(state, defRef);
    var landed = attackSeq(state, atk, defRef, matches, rng);
    var doCounter = !react.used && (gb.unit.side === 'ally' || landed);
    if (!doCounter) { return; }
    react.mark();
    var dg = getB(state, defRef);
    var ag = getB(state, atk.ref);
    if (isOut(dg) || isOut(ag) || dg.b.stagger) {
      log(state, nameOf(state, defRef) + ' は反撃できなかった');
      return;
    }
    log(state, nameOf(state, defRef) + ' が反撃「' + (skill.name || '') + '」');
    applyGrants(state, defRef, atk.ref, skill, 'use');
    attackSeq(state, { ref: defRef, skill: skill, coins: skill.coins.slice() }, atk.ref, 0, rng);
  }

  function planEntryFor(state, kind, id) {
    var found = null;
    A(state.plan).forEach(function (e) {
      if (e.kind === kind && (kind === 'ally' ? e.unitId === id : e.pid === id)) { found = e; }
    });
    return found;
  }

  function buildPlan(state, rng) {
    var entries = [];
    Object.keys(state.units).forEach(function (id) {
      var u = state.units[id];
      if (u.dead) { return; }
      if (u.side === 'ally') {
        var ch = u.choice;
        if (!ch || ch.sel === 'stag' || ch.sel === 'none' || ch.sel === 'def') { return; }
        var bsk = chosenSkill(state, u);
        if (bsk && (bsk.kind === 'defense' || bsk.kind === 'counter')) { return; }
        entries.push({ kind: 'ally', unitId: id, spd: u.spd, done: false });
      }
    });
    A(state.pieces).forEach(function (P) {
      entries.push({ kind: 'piece', pid: P.pid, unitId: P.unitId, partIdx: P.partIdx, spd: pieceSpeed(state, P), done: false });
    });
    var sorted = shuffle(entries, rng);
    sorted.sort(function (a, b) { return b.spd - a.spd; });
    state.plan = sorted;
    state.proc = { i: 0, pairs: computePairs(state) };
    state.phase = 'process';
    A(state.pieces).forEach(function (P) { P.acted = false; P.defUsed = false; P.defActive = false; P.evadeOff = false; P.cUsed = {}; });
    Object.keys(state.units).forEach(function (id) {
      var u = state.units[id];
      if (u.side === 'ally' && u.choice) { u.choice.acted = false; u.choice.defUsed = false; u.choice.defActive = false; u.choice.evadeOff = false; u.choice.cUsed = {}; }
    });
    log(state, '--- 戦闘開始 ---');
  }

  function runAlly(state, e, rng) {
    var u = state.units[e.unitId];
    var ch = u.choice;
    if (u.dead) { return; }
    if (u.stagger) { log(state, u.name + ' は混乱しており行動できない'); return; }
    if (ch.sel === 'def') {
      log(state, u.name + ' は守備の構え');
      return;
    }
    var base = chosenSkill(state, u);
    if (!base) { return; }
    if (base.kind === 'defense' || base.kind === 'counter') {
      ch.sel = 'def';
      ch.acted = true;
      return;
    }
    var P = getPiece(state, ch.target);
    if (!P) { log(state, u.name + ' の対象がありません'); return; }
    var tg = getB(state, pieceRef(P));
    if (isOut(tg)) {
      log(state, u.name + ' の攻撃は対象が既にいないため取り消された');
      fx(state, { u: u.id, p: null }, '取消', 'cancel');
      return;
    }
    var skill = resolveSkill(state, { u: u.id, p: null }, base, pieceRef(P));
    applyGrants(state, { u: u.id, p: null }, pieceRef(P), skill, 'use');
    ch.acted = true;
    log(state, u.name + ' が「' + (skill.name || '') + '」で ' + nameOf(state, pieceRef(P)) + ' を攻撃');
    var pairs = state.proc.pairs || { matchOf: {} };
    activateEnemyDefense(state, u.id, pieceRef(P));
    var X = sideOfAlly(state, u, skill);
    var partnerOk = false;
    if (pairs.matchOf[P.pid] === u.id && !P.blank && !P.acted) {
      var psk = pieceSkill(state, P);
      var pg = getB(state, pieceRef(P));
      if (psk && !pg.b.stagger && !isOut(pg) && psk.kind === 'attack') { partnerOk = true; }
    }
    if (partnerOk) {
      P.acted = true;
      var pe = planEntryFor(state, 'piece', P.pid);
      if (pe) { pe.done = true; }
      var pskill = resolveSkill(state, pieceRef(P), pieceSkill(state, P), { u: u.id, p: null });
      applyGrants(state, pieceRef(P), { u: u.id, p: null }, pskill, 'use');
      clash(state, X, sideOfPiece(state, P, pskill), rng);
    } else {
      engage(state, X, pieceRef(P), rng);
    }
  }

  function runPiece(state, e, rng) {
    var P = getPiece(state, e.pid);
    if (!P || P.acted) { return; }
    var ref = pieceRef(P);
    var g = getB(state, ref);
    if (isOut(g)) { return; }
    var sk0 = pieceSkill(state, P);
    if (!sk0) { return; }
    if (g.b.stagger) {
      log(state, nameOf(state, ref) + ' は混乱しており「' + (sk0.name || '') + '」を使えない');
      fx(state, ref, '取消', 'cancel');
      return;
    }
    if (sk0.kind === 'defense' || sk0.kind === 'counter') { return; }
    var pairs = state.proc.pairs || { matchOf: {} };
    var allyId = pairs.matchOf[P.pid] || P.target;
    if (!allyId) { log(state, nameOf(state, ref) + ' の対象が未設定'); return; }
    var au = state.units[allyId];
    if (!au || au.dead) {
      log(state, nameOf(state, ref) + ' の攻撃は対象が既にいないため取り消された');
      fx(state, ref, '取消', 'cancel');
      return;
    }
    P.acted = true;
    var skill = resolveSkill(state, ref, sk0, { u: allyId, p: null });
    applyGrants(state, ref, { u: allyId, p: null }, skill, 'use');
    log(state, nameOf(state, ref) + ' が「' + (skill.name || '') + '」で ' + au.name + ' を攻撃');
    if (O(pairs.defenders)[P.pid] && au.choice && !au.stagger) {
      au.choice.defActive = true;
      au.choice.acted = true;
      var dsk = chosenSkill(state, au);
      log(state, au.name + ' の' + (dsk && dsk.sub === 'evade' ? '回避' : '防御') + '「' + (dsk ? dsk.name || '' : '') + '」が発動可能になった');
    }
    var X = sideOfPiece(state, P, skill);
    var partnerOk = false;
    if (pairs.matchOf[P.pid] === allyId && au.choice && !au.choice.acted && !au.stagger) {
      var ask = chosenSkill(state, au);
      if (ask && ask.kind === 'attack' && au.choice.target === P.pid) { partnerOk = true; }
    }
    if (partnerOk) {
      au.choice.acted = true;
      var ae = planEntryFor(state, 'ally', au.id);
      if (ae) { ae.done = true; }
      var askill = resolveSkill(state, { u: au.id, p: null }, chosenSkill(state, au), ref);
      applyGrants(state, { u: au.id, p: null }, ref, askill, 'use');
      activateEnemyDefense(state, au.id, ref);
      clash(state, X, sideOfAlly(state, au, askill), rng);
    } else {
      engage(state, X, { u: allyId, p: null }, rng);
    }
  }

  function checkEnd(state) {
    var allyAlive = false;
    var enemyAlive = false;
    Object.keys(state.units).forEach(function (id) {
      var u = state.units[id];
      if (u.dead) { return; }
      if (u.side === 'ally') { allyAlive = true; } else { enemyAlive = true; }
    });
    if (!enemyAlive) { state.result = 'victory'; }
    else if (!allyAlive) { state.result = 'defeat'; }
    return state.result;
  }

  function endOfRound(state, rng) {
    function each(fn) {
      Object.keys(state.units).forEach(function (id) {
        var u = state.units[id];
        if (u.dead) { return; }
        if (u.side === 'ally') { fn({ u: id, p: null }, u); }
        else { u.parts.forEach(function (p, pi) { if (!p.destroyed) { fn({ u: id, p: pi }, p); } }); }
      });
    }
    each(function (ref, b) {
      var bu = O(b.st).burn;
      if (bu && num(bu.p, 0) > 0) {
        var d = num(bu.p, 0);
        log(state, nameOf(state, ref) + ' は火傷で ' + d + ' ダメージ');
        fx(state, ref, String(d), 'burn');
        bu.c -= 1;
        if (bu.c <= 0) { delete b.st.burn; }
        dealHp(state, ref, d, 'burn');
      }
    });
    each(function (ref, b) {
      b.barrier = 0;
      var vi = O(b.st).vibration;
      if (vi) { vi.c -= 1; if (vi.c <= 0) { delete b.st.vibration; } }
      var br = O(b.st).breath;
      if (br) { br.c -= 1; if (br.c <= 0) { delete b.st.breath; } }
      var ch = O(b.st).charge;
      if (ch) { ch.c -= 1; if (ch.c <= 0) { ch.c = 0; ch.p = ch.p || 0; if (!(ch.p > 0)) { delete b.st.charge; } } }
      Object.keys(O(b.st)).forEach(function (k) {
        var def = STATUS[statusParts(k).base];
        if (def && def.type === 'val') { delete b.st[k]; }
      });
      if (b.stagger && b.stagger.until <= state.round) {
        log(state, nameOf(state, ref) + ' の混乱が回復した');
        b.stagger = null;
      }
    });
    Object.keys(state.units).forEach(function (id) {
      var u = state.units[id];
      if (u.side !== 'ally' || u.dead) { return; }
      var ch = u.choice;
      ensureDeck(u, rng);
      if (ch && (ch.acted || ch.sel === 'def')) {
        var q = A(u.deck.q);
        if (ch.sel === 'def') { q.splice(0, 1); }
        else if (ch.sel === 'c0') { q.splice(0, 1); }
        else if (ch.sel === 'c1') { q.splice(1, 1); }
        u.deck.q = q;
      }
      ensureDeck(u, rng);
    });
    log(state, '--- ラウンド' + state.round + ' 終了 ---');
  }

  function stepProcess(state, rng) {
    var plan = A(state.plan);
    var proc = state.proc;
    while (proc.i < plan.length && plan[proc.i].done) { proc.i += 1; }
    state.fx = { seq: (state.fx ? state.fx.seq : 0) + 1, items: [] };
    if (proc.i >= plan.length) {
      endOfRound(state, rng);
      checkEnd(state);
      state.phase = state.result ? 'over' : 'roundEnd';
      return false;
    }
    var e = plan[proc.i];
    e.done = true;
    proc.i += 1;
    if (e.kind === 'ally') { runAlly(state, e, rng); } else { runPiece(state, e, rng); }
    checkEnd(state);
    if (state.result) { state.phase = 'over'; }
    return true;
  }

  function selectChoice(state, unitId, sel, ts) {
    var u = state.units[unitId];
    if (!u || u.dead || u.stagger) { return; }
    var old = u.choice || {};
    u.choice = { sel: sel, target: old.sel === sel ? old.target || null : null, confirmed: false, ts: ts };
    var sk = chosenSkill(state, u);
    if (!sk || (sk.kind !== 'attack' && sk.kind !== 'defense')) { u.choice.target = null; }
  }
  function setTarget(state, unitId, pid, ts) {
    var u = state.units[unitId];
    if (!u || !u.choice) { return; }
    u.choice.target = pid;
    u.choice.ts = ts;
    u.choice.confirmed = false;
  }

  function vibrationBurst(state, ref, rng) {
    var g = getB(state, ref);
    if (!g) { return; }
    var vi = O(g.b.st).vibration;
    if (!vi) { return; }
    var lines = A(g.b.lines).slice().sort(function (a, b) { return b - a; });
    if (!lines.length) { log(state, nameOf(state, ref) + ' には前進できる混乱線がない'); return; }
    var info = hpInfo(g.unit, g.part);
    var max = info.max;
    lines[0] = Math.min(max, lines[0] + num(vi.p, 0));
    g.b.lines = lines;
    log(state, nameOf(state, ref) + ' の混乱線が ' + num(vi.p, 0) + ' 前進');
    checkStagger(state, ref);
  }
  function convertVibration(state, ref, kind) {
    var g = getB(state, ref);
    if (!g) { return; }
    var vi = O(g.b.st).vibration;
    if (!vi) { return; }
    vi.k = kind;
    log(state, nameOf(state, ref) + ' の振動を「' + kind + '」に振幅変換');
  }
  function reviveUnit(state, ref) {
    var g = getB(state, ref);
    if (!g) { return; }
    if (g.part) {
      g.part.destroyed = false;
      g.part.dur = g.part.maxDur;
      g.part.lines = A(g.part.lines);
    }
    if (g.unit.dead) { g.unit.dead = false; g.unit.hp = Math.max(1, g.unit.hp); }
  }

  var ALL_RES_KEYS = ['slash', 'pierce', 'blunt', 'wrath', 'lust', 'sloth', 'gluttony', 'gloom', 'pride', 'envy'];
  function applyEgo(state, unitId, idx) {
    var u = state.units[unitId];
    var ego = u && A(u.egos)[idx];
    if (!ego) { return; }
    var r = O(ego.resist);
    var next = {};
    ALL_RES_KEYS.forEach(function (k) {
      next[k] = A(r.weak).indexOf(k) >= 0 ? 'weak' : (A(r.resist).indexOf(k) >= 0 ? 'resist' : 'normal');
    });
    u.resist = next;
    u.egoUsed = idx;
    log(state, u.name + ' がE.G.O「' + (ego.name || '') + '」を使用(耐性が戦闘終了まで上書きされる)');
  }

  function parsePid(pid) {
    var s = String(pid || '').split('|');
    return { u: s[0], p: Number(s[1]), n: s[2] };
  }

  return {
    SINS: SINS, PHYS: PHYS, RES_MULT: RES_MULT, RES_LABEL: RES_LABEL, STATUS: STATUS, KIND_LABEL: KIND_LABEL, SP_MIN: SP_MIN, SP_MAX: SP_MAX,
    A: A, O: O, clone: clone, normalize: normalize, clamp: clamp, num: num, shuffle: shuffle, randInt: randInt,
    newState: newState, parseSetup: parseSetup, loadUnits: loadUnits, initUnit: initUnit,
    getB: getB, nameOf: nameOf, hpInfo: hpInfo, isOut: isOut, resBonus: resBonus, resMultOf: resMultOf, staggerPhysMult: staggerPhysMult,
    handOf: handOf, chosenSkill: chosenSkill, slotSkill: slotSkill, getPiece: getPiece, pieceSkill: pieceSkill, pieceRef: pieceRef, pieceId: pieceId, parsePid: parsePid,
    startRound: startRound, beginCombat: beginCombat, gmConfirm: gmConfirm, planEnemyPieces: planEnemyPieces, rebuildPiecesFor: rebuildPiecesFor,
    computePairs: computePairs, allConfirmed: allConfirmed, canConfirm: canConfirm,
    buildPlan: buildPlan, stepProcess: stepProcess, selectChoice: selectChoice, setTarget: setTarget,
    addStatus: addStatus, statusParts: statusParts, dealHp: dealHp, changeSp: changeSp, checkStagger: checkStagger, checkEnd: checkEnd,
    vibrationBurst: vibrationBurst, convertVibration: convertVibration, reviveUnit: reviveUnit, applyEgo: applyEgo, ALL_RES_KEYS: ALL_RES_KEYS,
    engage: engage, findReactive: findReactive, calcDamage: calcDamage, buffFrame: buffFrame, resFrame: resFrame, headsProb: headsProb, log: log
  };
}));
