(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LCEffects = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var SINS = [
    { id: 'wrath', label: '憤怒', color: 'rgb(220, 60, 50)', text: 'rgb(255, 255, 255)' },
    { id: 'lust', label: '色欲', color: 'rgb(240, 140, 50)', text: 'rgb(255, 255, 255)' },
    { id: 'sloth', label: '怠惰', color: 'rgb(230, 200, 60)', text: 'rgb(24, 16, 6)' },
    { id: 'gluttony', label: '暴食', color: 'rgb(110, 190, 70)', text: 'rgb(255, 255, 255)' },
    { id: 'gloom', label: '憂鬱', color: 'rgb(60, 190, 200)', text: 'rgb(255, 255, 255)' },
    { id: 'pride', label: '傲慢', color: 'rgb(70, 120, 230)', text: 'rgb(255, 255, 255)' },
    { id: 'envy', label: '嫉妬', color: 'rgb(150, 70, 220)', text: 'rgb(255, 255, 255)' }
  ];
  var SIN_BY_ID = {};
  SINS.forEach(function (x) { SIN_BY_ID[x.id] = x; });

  var PHYS = { slash: '斬撃', pierce: '貫通', blunt: '打撃' };

  var STATUS = {
    burn: { label: '火傷', type: 'pc', kind: 'debuff', icon: 'burn.png', color: 'rgb(235, 110, 50)' },
    bleed: { label: '出血', type: 'pc', kind: 'debuff', icon: 'bleed.png', color: 'rgb(210, 50, 70)' },
    vibration: { label: '振動', type: 'pc', kind: 'debuff', icon: 'tremor.png', color: 'rgb(140, 170, 235)' },
    rupture: { label: '破裂', type: 'pc', kind: 'debuff', icon: 'rupture.png', color: 'rgb(235, 130, 190)' },
    sinking: { label: '沈潜', type: 'pc', kind: 'debuff', icon: 'sinking.png', color: 'rgb(110, 190, 230)' },
    breath: { label: '呼吸', type: 'pc', kind: 'buff', icon: 'poise.png', color: 'rgb(110, 205, 150)' },
    charge: { label: '充電', type: 'pc', kind: 'buff', icon: 'charge.png', color: 'rgb(240, 215, 80)' },
    trance: { label: '夢現', type: 'pc', kind: 'buff', icon: 'trance.png', color: 'rgb(240, 160, 70)' },
    paralysis: { label: '麻痺', type: 'val', kind: 'debuff', icon: 'paralyze.png', color: 'rgb(200, 190, 90)' },
    bind: { label: '束縛', type: 'val', kind: 'debuff', icon: 'bind.png', color: 'rgb(200, 170, 120)' },
    dmgDown: { label: 'ダメージ量減少', type: 'val', kind: 'debuff', icon: 'damage-down.png', color: 'rgb(170, 140, 140)' },
    fragile: { label: '脆弱', type: 'val', kind: 'debuff', icon: 'fragile.png', color: 'rgb(230, 120, 120)' },
    powerDown: { label: '威力減少', type: 'val', kind: 'debuff', icon: 'power-down.png', color: 'rgb(230, 120, 100)' },
    atkPowerDown: { label: '攻撃威力減少', type: 'val', kind: 'debuff', icon: 'attack-power-down.png', color: 'rgb(170, 140, 140)' },
    defPowerDown: { label: '守備威力減少', type: 'val', kind: 'debuff', icon: 'defense-power-down.png', color: 'rgb(170, 140, 140)' },
    matchPowerDown: { label: 'マッチ威力減少', type: 'val', kind: 'debuff', icon: 'clash-power-down.png', color: 'rgb(170, 140, 140)' },
    coinWeak: { label: '加算コイン弱化', type: 'val', kind: 'debuff', icon: 'plus-coin-drop.png', color: 'rgb(170, 140, 140)' },
    quick: { label: 'クイック', type: 'val', kind: 'buff', icon: 'haste.png', color: 'rgb(120, 210, 230)' },
    dmgUp: { label: 'ダメージ量増加', type: 'val', kind: 'buff', icon: 'damage-up.png', color: 'rgb(240, 170, 90)' },
    protect: { label: '保護', type: 'val', kind: 'buff', icon: 'protection.png', color: 'rgb(120, 190, 240)' },
    powerUp: { label: '威力増加', type: 'val', kind: 'buff', icon: 'power-up.png', color: 'rgb(240, 170, 90)' },
    atkPowerUp: { label: '攻撃威力増加', type: 'val', kind: 'buff', icon: 'attack-power-up.png', color: 'rgb(240, 170, 90)' },
    defPowerUp: { label: '守備威力増加', type: 'val', kind: 'buff', icon: 'defense-power-up.png', color: 'rgb(240, 170, 90)' },
    matchPowerUp: { label: 'マッチ威力増加', type: 'val', kind: 'buff', icon: 'clash-power-up.png', color: 'rgb(240, 170, 90)' },
    coinStrong: { label: '加算コイン強化', type: 'val', kind: 'buff', icon: 'plus-coin-boost.png', color: 'rgb(240, 170, 90)' }
  };
  var DEFAULT_STATUS_COLOR = 'rgb(238, 228, 210)';

  var TIMINGS = {
    battleEnter: { label: '戦闘突入時', coin: false, when: 'firstRound' },
    battleStart: { label: '戦闘開始時', coin: false, when: 'combatStart' },
    turnStart: { label: 'ターン開始時', coin: false, when: 'roundStart' },
    use: { label: '使用時', coin: false, when: 'use' },
    beforeAttack: { label: '攻撃前', coin: false, when: 'beforeAttack' },
    matchWin: { label: 'マッチ勝利時', coin: false, when: 'matchWin' },
    matchLose: { label: 'マッチ敗北時', coin: false, when: 'matchLose' },
    hit: { label: '的中時', coin: true, when: 'hit' },
    headsHit: { label: '表面的中時', coin: true, when: 'hit', side: 'heads' },
    tailsHit: { label: '裏面的中時', coin: true, when: 'hit', side: 'tails' },
    hpCond: { label: null, coin: false, cond: true, checkAt: true, when: 'hit' },
    spCond: { label: null, coin: false, cond: true, when: 'hit' }
  };
  var TIMING_ORDER = ['battleEnter', 'battleStart', 'turnStart', 'use', 'beforeAttack', 'matchWin', 'matchLose', 'hit', 'headsHit', 'tailsHit', 'hpCond', 'spCond'];

  var OPS = { lte: '以下', gte: '以上', lt: '未満', gt: '超' };
  var TARGETS = { self: '自分', target: '対象', ally: '味方', allAllies: '味方全員', enemy: '敵' };
  var IF = { dispelled: '解除したなら、' };
  var DELAY = { nextTurn: '次のターンに' };
  var CHECK_AT = ['beforeDamage', 'afterDamage'];

  function statusInfo(id) {
    var parts = String(id).split('@');
    var def = STATUS[parts[0]];
    var suf = parts[1] || '';
    var sufLabel = suf ? (SIN_BY_ID[suf] ? SIN_BY_ID[suf].label : (PHYS[suf] || suf)) : '';
    var icon = def ? def.icon : parts[0] + '.png';
    if (suf && parts[0] === 'dmgUp') { icon = suf + '-dmg-up.png'; }
    if (suf && parts[0] === 'protect') { icon = suf + '-protection.png'; }
    return {
      known: !!def,
      label: (def ? def.label : parts[0]) + (sufLabel ? '(' + sufLabel + ')' : ''),
      icon: 'image/icon/status/' + icon,
      color: def ? def.color : DEFAULT_STATUS_COLOR
    };
  }

  function Segs() {
    this.list = [];
  }
  Segs.prototype.text = function (t) {
    if (!t) { return this; }
    var last = this.list[this.list.length - 1];
    if (last && last.text !== undefined) { last.text += t; } else { this.list.push({ text: t }); }
    return this;
  };
  Segs.prototype.status = function (id) {
    this.list.push({ status: id });
    return this;
  };
  Segs.prototype.add = function (other) {
    var self = this;
    other.list.forEach(function (g) { if (g.status) { self.status(g.status); } else { self.text(g.text); } });
    return this;
  };

  function items(e) {
    if (e.items) { return e.items; }
    return [{ status: e.status, power: e.power, count: e.count }];
  }

  function head(e, mid) {
    var s = new Segs();
    if (e['if']) { s.text(IF[e['if']]); }
    if (e.delay) { s.text(DELAY[e.delay]); }
    return s.add(mid);
  }

  var BATTLE_TO = { target: 'target', enemy: 'target', self: 'self', allAllies: 'allies', ally: 'allies' };
  var BATTLE_OPS = { lte: '<=', gte: '>=', lt: '<', gt: '>' };

  function battleTo(e) {
    return BATTLE_TO[e.target || 'target'] || 'target';
  }

  function amountKey(id) {
    var def = STATUS[String(id).split('@')[0]];
    return def && def.type === 'val' ? 'v' : 'p';
  }

  var TYPES = {
    grant: {
      required: ['items|status'],
      statuses: function (e) { return items(e).map(function (i) { return i.status; }); },
      grants: function (e) {
        return items(e).map(function (i) {
          var g = { status: i.status, to: battleTo(e) };
          if (i.power !== undefined) { g[amountKey(i.status)] = i.power; }
          if (i.count !== undefined) { g.c = i.count; }
          if (e.delay === 'nextTurn') { g.next = true; }
          return g;
        });
      },
      render: function (e) {
        var s = new Segs();
        if (e.target && e.target !== 'target' && e.target !== 'enemy') { s.text(TARGETS[e.target] + 'に'); }
        items(e).forEach(function (i, n) {
          if (n) { s.text('と'); }
          var amount = '';
          if (i.power !== undefined) { amount += String(i.power); }
          if (i.count !== undefined) { amount += i.power !== undefined ? '(回数' + i.count + ')' : '回数' + i.count; }
          s.status(i.status).text(amount);
        });
        return head(e, s.text('を付与'));
      }
    },
    gain: {
      required: ['status', 'count'],
      statuses: function (e) { return [e.status]; },
      grants: function (e) {
        return [{ status: e.status, c: e.count, to: battleTo(e) }];
      },
      render: function (e) {
        var s = new Segs();
        if (e.target && e.target !== 'target' && e.target !== 'enemy') { s.text(TARGETS[e.target] + 'の'); }
        return head(e, s.status(e.status).text('回数が' + e.count + '増加'));
      }
    },
    dispel: {
      required: ['target', 'count'],
      statuses: function () { return []; },
      grants: function (e) {
        return [{ dispel: { count: e.count, kind: e.kind || 'debuff' }, to: battleTo(e) }];
      },
      render: function (e) {
        var s = new Segs();
        s.text(TARGETS[e.target] + 'の解除可能デバフを' + e.count + '種解除');
        return head(e, s);
      }
    },
    dmgBonus: {
      required: ['percent'],
      statuses: function () { return []; },
      grants: function (e) {
        var g = { dmgPct: e.percent, to: e.scope === 'allies' ? 'allies' : 'self', scope: 'round', when: 'combatStart' };
        if (e.when && e.when.targetSp === 'lowerThanSelf') { g.dmgIf = { sp: { of: 'target', vs: 'self', op: '<' } }; }
        return [g];
      },
      render: function (e) {
        var s = new Segs();
        if (e.scope === 'allies') { s.text('味方全員が、'); }
        if (e.when && e.when.targetSp === 'lowerThanSelf') { s.text('自分より精神力が低い敵を攻撃時に'); }
        return head(e, s.text('ダメージ量' + (e.percent >= 0 ? '+' : '') + e.percent + '%'));
      }
    },
    spHeal: {
      required: ['amount'],
      statuses: function () { return []; },
      grants: function (e) {
        var g = { sp: e.amount, to: 'self' };
        if (e.when && e.when.self === 'noDebuff') { g['if'] = { noDebuff: 'self' }; }
        return [g];
      },
      render: function (e) {
        var s = new Segs();
        if (e.when && e.when.self === 'noDebuff') { s.text('自分にデバフが無い場合に'); }
        return head(e, s.text('精神力を' + e.amount + '回復'));
      }
    }
  };

  function condLabel(e) {
    var c = e.cond || {};
    var who = c.of === 'self' ? '自分の' : '';
    var what = e.timing === 'hpCond' ? '体力' : '精神力';
    return who + what + 'が' + c.value + (c.unit === 'percent' ? '%' : '') + OPS[c.op] + 'の時';
  }

  function timingLabel(e) {
    var t = TIMINGS[e.timing];
    if (!t) { return e.timing || ''; }
    return t.cond ? condLabel(e) : t.label;
  }

  function render(e) {
    var type = TYPES[e.type];
    var segs;
    if (e.text !== undefined) {
      segs = new Segs().text(e.text);
    } else {
      segs = type ? type.render(e) : new Segs().text('(未実装: ' + e.type + ')');
    }
    (e.then || []).forEach(function (t) {
      segs.text('。').add(render(t).segs);
    });
    return {
      coin: e.coin,
      timing: e.timing ? timingLabel(e) : null,
      segs: segs
    };
  }

  function toPlain(r) {
    return (r.timing ? '[' + r.timing + '] ' : '') + r.segs.list.map(function (g) {
      return g.status ? statusInfo(g.status).label : g.text;
    }).join('');
  }

  function sortByTiming(effects) {
    return effects.map(function (e, i) { return { e: e, i: i }; }).sort(function (a, b) {
      var d = TIMING_ORDER.indexOf(a.e.timing) - TIMING_ORDER.indexOf(b.e.timing);
      return d || a.i - b.i;
    }).map(function (x) { return x.e; });
  }


  function toGrants(effects, opts) {
    opts = opts || {};
    var out = [];
    (effects || []).forEach(function (e) {
      var t = e.timing ? TIMINGS[e.timing] : null;
      var type = TYPES[e.type];
      if (!type || !type.grants) {
        throw new Error('戦闘用の変換がない効果種類です: ' + e.type);
      }
      var base = {};
      var when = t ? t.when : opts.defaultWhen;
      if (when) { base.when = when; }
      if (t && t.side) { base.side = t.side; }
      if (e.coin !== undefined) { base.coin = e.coin; }
      var cond = null;
      if (t && t.cond) {
        var c = e.cond;
        var key = e.timing === 'hpCond' ? 'hp' : 'sp';
        var one = { of: c.of || 'target', op: BATTLE_OPS[c.op], v: c.value };
        if (c.unit === 'percent') { one.pct = true; }
        cond = {};
        cond[key] = one;
        if (e.checkAt === 'afterDamage') { cond.check = 'after'; }
      }
      var list = type.grants(e);
      var follow = [];
      (e.then || []).forEach(function (x) {
        var sub = {};
        Object.keys(x).forEach(function (k) { sub[k] = x[k]; });
        sub.coin = e.coin;
        sub.timing = e.timing;
        sub.cond = e.cond;
        sub.checkAt = e.checkAt;
        follow = follow.concat(toGrants([sub], opts).map(function (g) {
          if (x['if'] === 'dispelled') { g.ifDispelled = true; }
          return g;
        }));
      });
      list.forEach(function (g) {
        Object.keys(base).forEach(function (k) { if (g[k] === undefined) { g[k] = base[k]; } });
        if (cond) {
          var merged = {};
          Object.keys(cond).forEach(function (k) { merged[k] = cond[k]; });
          Object.keys(g['if'] || {}).forEach(function (k) { merged[k] = g['if'][k]; });
          g['if'] = merged;
        }
        if (e['if'] === 'dispelled') { g.ifDispelled = true; }
        out.push(g);
      });
      out = out.concat(follow);
    });
    return out;
  }

  var ROMAN_NUM = ['', 'Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'];

  function skillText(skill) {
    var max = skill.base + skill.coin * skill.coins;
    var lines = [skill.base + '+' + skill.coin + '×' + skill.coins + '(最大' + max + ')'];
    sortByTiming(skill.effects || []).forEach(function (e) {
      lines.push((e.coin ? ROMAN_NUM[e.coin] : '') + toPlain(render(e)));
    });
    return lines.join('\n');
  }

  function passiveText(effects) {
    return (effects || []).map(function (e) {
      var r = render(e);
      return (e.timing ? r.timing + '、' : '') + toPlain({ timing: null, segs: r.segs });
    }).join('\n');
  }

  function has(e, key) {
    return key.split('|').some(function (k) { return e[k] !== undefined && e[k] !== null; });
  }

  function validate(e, ctx) {
    var errors = [];
    var where = (ctx && ctx.where) || '';
    var err = function (m) { errors.push(where + ': ' + m); };
    var type = TYPES[e.type];
    if (e.text === undefined && !type) {
      err('未実装の効果種類 "' + e.type + '"');
      return errors;
    }
    if (type) {
      type.required.forEach(function (k) { if (!has(e, k)) { err('"' + e.type + '" に必須項目 ' + k + ' がありません'); } });
      if (e.type === 'grant') {
        items(e).forEach(function (i) { if (i.power === undefined && i.count === undefined) { err('付与する威力(power)か回数(count)がありません'); } });
      }
      type.statuses(e).forEach(function (id) {
        if (!id) { err('状態異常が指定されていません'); } else if (!statusInfo(id).known) { err('未登録の状態異常 "' + id + '"'); }
      });
    }
    var t = e.timing ? TIMINGS[e.timing] : null;
    if (e.timing && !t) { err('未登録のタイミング "' + e.timing + '"'); }
    if (t) {
      if (t.coin && !ctx.allowCoin) { err('コイン用のタイミング "' + e.timing + '" がコイン効果以外に使われています'); }
      if (t.coin && e.coin === undefined) { err('タイミング "' + e.timing + '" には coin が必要です'); }
      if (t.cond) {
        var c = e.cond;
        if (!c || c.value === undefined || !OPS[c.op] || (c.unit !== 'percent' && c.unit !== 'value')) { err('"' + e.timing + '" の cond(op/value/unit)が不正です'); }
        if (t.checkAt && CHECK_AT.indexOf(e.checkAt) < 0) { err('"' + e.timing + '" には checkAt(beforeDamage / afterDamage)が必要です'); }
      }
    }
    if (e.coin !== undefined && ctx && ctx.coins && (e.coin < 1 || e.coin > ctx.coins)) { err('coin ' + e.coin + ' がコイン枚数(' + ctx.coins + ')を超えています'); }
    if (e.target && !TARGETS[e.target]) { err('未登録の target "' + e.target + '"'); }
    if (e['if'] && !IF[e['if']]) { err('未登録の if "' + e['if'] + '"'); }
    if (e.delay && !DELAY[e.delay]) { err('未登録の delay "' + e.delay + '"'); }
    (e.then || []).forEach(function (x, i) {
      errors = errors.concat(validate(x, { where: where + ' > then[' + i + ']', allowCoin: ctx && ctx.allowCoin, coins: 0 }));
    });
    return errors;
  }

  return {
    SINS: SINS,
    SIN_BY_ID: SIN_BY_ID,
    PHYS: PHYS,
    STATUS: STATUS,
    TIMINGS: TIMINGS,
    TIMING_ORDER: TIMING_ORDER,
    TYPES: TYPES,
    statusInfo: statusInfo,
    render: render,
    toPlain: toPlain,
    sortByTiming: sortByTiming,
    validate: validate,
    toGrants: toGrants,
    skillText: skillText,
    passiveText: passiveText
  };
}));
