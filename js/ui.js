(function (root) {
  'use strict';

  var L = root.LC;
  var A = L.A;
  var O = L.O;

  var PHASE_LABEL = { setup: '準備', enemy: '敵の行動決定', player: '味方の行動選択', process: '戦闘処理', roundEnd: 'ラウンド終了', over: '決着' };
  var ROLE_LABEL = { kp: 'KP', gm: 'GM', player: 'プレイヤー', observer: '観戦' };
  var SEL_LABEL = { c0: 'カード1', c1: 'カード2', def: '守備' };
  var SUB_LABEL = { guard: '防御', evade: '回避' };

  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c];
    });
  }

  function sinColor(sin) { return L.SINS[sin] ? L.SINS[sin].color : 'rgb(150, 150, 150)'; }
  function kindLabel(sk) {
    if (!sk) { return ''; }
    if (sk.kind === 'defense') { return SUB_LABEL[sk.sub] || '防御'; }
    return L.KIND_LABEL[sk.kind] || '';
  }

  function frameSvg(sin, tier) {
    var c = sinColor(sin);
    function poly(r) {
      var pts = [];
      for (var i = 0; i < 7; i += 1) {
        var a = -Math.PI / 2 + i * 2 * Math.PI / 7;
        pts.push((50 + r * Math.cos(a)).toFixed(1) + ',' + (50 + r * Math.sin(a)).toFixed(1));
      }
      return pts.join(' ');
    }
    var t = Math.max(1, Math.min(4, L.num(tier, 1)));
    var html = '<svg class="frame" viewBox="0 0 100 100" aria-hidden="true">';
    html += '<polygon points="' + poly(47) + '" fill="rgb(24, 22, 26)" stroke="' + c + '" stroke-width="4"/>';
    if (t >= 2) { html += '<polygon points="' + poly(40) + '" fill="none" stroke="' + c + '" stroke-width="1.5" opacity="0.8"/>'; }
    if (t >= 3) { html += '<polygon points="' + poly(34) + '" fill="none" stroke="' + c + '" stroke-width="1.5" opacity="0.6"/>'; }
    if (t >= 4) { html += '<polygon points="' + poly(50) + '" fill="none" stroke="rgb(240, 200, 90)" stroke-width="2"/>'; }
    return html + '</svg>';
  }

  function badges(b) {
    var st = O(b && b.st);
    var order = Object.keys(L.STATUS);
    var keys = Object.keys(st).sort(function (x, y) {
      return order.indexOf(L.statusParts(x).base) - order.indexOf(L.statusParts(y).base);
    });
    var out = '';
    keys.forEach(function (k) {
      var sp = L.statusParts(k);
      var def = L.STATUS[sp.base];
      if (!def) { return; }
      var s = st[k];
      var val;
      if (def.type === 'pc') {
        val = L.num(s.p, 0) + '/' + L.num(s.c, 0);
        if (sp.base === 'vibration' && s.k && s.k !== 'vibration') { val += ' ' + esc(s.k); }
      } else {
        val = String(L.num(s.v, 0));
      }
      var suf = sp.suf ? (L.SINS[sp.suf] ? L.SINS[sp.suf].label : (L.PHYS[sp.suf] || sp.suf)) : '';
      var inert = def.type === 'pc' && L.num(s.p, 0) <= 0 && !def.keepPotency;
      out += '<span class="badge ' + (def.kind === 'buff' ? 'buff' : 'debuff') + (inert ? ' inert' : '') + '" style="--c: ' + def.color + ';" title="' + esc(def.label + (suf ? '(' + suf + ')' : '') + ': ' + def.text) + '">' +
        '<b>' + esc(def.glyph) + '</b>' + esc(val) + '</span>';
    });
    if (L.num(b && b.barrier, 0) > 0) {
      out += '<span class="badge buff" style="--c: rgb(120, 190, 240);" title="バリア: 追加の体力(ラウンド終了で消える)"><b>盾</b>' + b.barrier + '</span>';
    }
    return out;
  }

  function hpBar(info, lines, cls) {
    var ratio = info.max > 0 ? Math.max(0, Math.min(1, info.cur / info.max)) : 0;
    var marks = A(lines).map(function (l) {
      return '<i class="mark" style="left: ' + (Math.min(100, l / info.max * 100)).toFixed(1) + '%;"></i>';
    }).join('');
    return '<div class="bar ' + (cls || '') + '"><div class="fill" style="width: ' + (ratio * 100).toFixed(1) + '%;"></div>' + marks + '<span class="num">' + info.cur + '/' + info.max + '</span></div>';
  }

  function spChip(b) {
    var sp = L.num(b.sp, 0);
    var cls = sp <= -45 ? 'low' : (sp >= 45 ? 'high' : '');
    return '<span class="sp ' + cls + '" title="精神力 / 表の確率 ' + Math.round(L.headsProb(sp) * 100) + '%">' + (sp > 0 ? '+' : '') + sp + '</span>';
  }

  function staggerChip(b) {
    if (!b.stagger) { return ''; }
    return '<span class="stag">混乱' + (b.stagger.level > 1 ? ' Lv' + b.stagger.level : '') + '</span>';
  }

  function portrait(name, img) {
    if (img) { return '<img class="face" src="' + esc(img) + '" alt="">'; }
    return '<span class="face init">' + esc(String(name || '?').charAt(0)) + '</span>';
  }

  function allyToken(u, ctx) {
    var info = L.hpInfo(u);
    var ratio = info.max > 0 ? Math.max(0, Math.min(1, info.cur / info.max)) : 0;
    var R = 34;
    var C = 2 * Math.PI * R;
    var vis = C * 280 / 360;
    var sp = L.num(u.sp, 0);
    var spCls = sp <= -45 ? 'low' : (sp >= 45 ? 'high' : '');
    var ring = '<svg class="ring" viewBox="0 0 84 84" aria-hidden="true">' +
      '<circle cx="42" cy="42" r="' + R + '" class="track" stroke-dasharray="' + vis.toFixed(2) + ' ' + C.toFixed(2) + '" transform="rotate(85 42 42)"/>' +
      '<circle cx="42" cy="42" r="' + R + '" class="gauge" stroke-dasharray="' + (vis * ratio).toFixed(2) + ' ' + C.toFixed(2) + '" transform="rotate(85 42 42)"/>' +
      '</svg>';
    var spd = u.dead ? '' : '<span class="spd" title="速度">' + L.num(u.spd, 0) + '</span>';
    return '<div class="token ' + (u.dead ? 'dead' : '') + '" data-tok="' + esc(u.id) + '">' + ring + portrait(u.name, u.img) + spd +
      '<span class="spc ' + spCls + '">' + sp + '</span></div>';
  }

  function allyCard(S, u, ctx) {
    var info = L.hpInfo(u);
    var ch = u.choice;
    var status = '';
    if (u.dead) { status = '<span class="tag down">戦闘不能</span>'; }
    else if (!u.stagger && ch && S.phase !== 'enemy' && S.phase !== 'setup') {
      var sk = L.chosenSkill(S, u);
      var label = ch.sel === 'def' ? '守備' : (sk ? sk.name || '' : '');
      status = '<span class="tag ' + (ch.confirmed ? 'ok' : 'wait') + '">' + (ch.confirmed ? '確定' : '選択中') + (S.phase === 'player' && !ctx.canSeeChoice(u) ? '' : (label ? ': ' + esc(label) : '')) + '</span>';
    }
    var mine = ctx.me && ctx.me.unitId === u.id ? ' mine' : '';
    return '<div class="ally' + mine + '" data-act="info-unit" data-id="' + esc(u.id) + '">' +
      allyToken(u, ctx) +
      '<div class="ally-body"><div class="name">' + esc(u.name) + '</div>' + hpBar(info, u.lines, 'ally-bar') +
      '<div class="line">' + spChip(u) + staggerChip(u) + status + '</div>' +
      '<div class="badges">' + badges(u) + '</div></div></div>';
  }

  function pieceHtml(S, P, ctx) {
    var sk = L.pieceSkill(S, P);
    var g = L.getB(S, L.pieceRef(P));
    var out = L.isOut(g);
    var cls = 'piece';
    if (P.acted) { cls += ' acted'; }
    if (g && g.b.stagger) { cls += ' staggered'; }
    var targeting = ctx.targeting && sk && !out;
    var act = targeting ? 'target' : 'info-piece';
    var coins = sk ? A(sk.coins).length : 0;
    var pairs = ctx.pairs || { matchOf: {} };
    var matched = pairs.matchOf[P.pid];
    var targetName = '';
    if (P.target && S.units[P.target] && ctx.showEnemyTargets) { targetName = '→' + S.units[P.target].name; }
    return '<button type="button" class="' + cls + (ctx.selectedPid === P.pid ? ' picked' : '') + (matched ? ' matched' : '') + '" data-act="' + act + '" data-pid="' + esc(P.pid) + '" data-piece="' + esc(P.pid) + '">' +
      frameSvg(sk && sk.sin, sk && sk.tier) +
      '<span class="p-body"><span class="p-name">' + esc(sk ? sk.name : '?') + '</span>' +
      '<span class="p-meta">' + esc(kindLabel(sk)) + ' ' + L.num(sk && sk.base, 0) + '+' + coins + '枚</span>' +
      '<span class="p-tgt">' + esc(targetName) + '</span></span></button>';
  }

  function blankHtml(S, unitId, pi, ctx) {
    var pid = L.pieceId(unitId, pi, 'b');
    return '<button type="button" class="piece blank' + (ctx.selectedPid === pid ? ' picked' : '') + '" data-act="' + (ctx.targeting ? 'target' : 'noop') + '" data-pid="' + esc(pid) + '" data-piece="' + esc(pid) + '">' +
      '<span class="p-body"><span class="p-name">空き</span><span class="p-meta">スキルなし</span></span></button>';
  }

  function partHtml(S, u, pi, ctx) {
    var part = u.parts[pi];
    var multi = u.kind === 'abnormality';
    var info = L.hpInfo(u, part);
    var pieces = A(S.pieces).filter(function (P) { return P.unitId === u.id && P.partIdx === pi; });
    var inner = '';
    if (part.destroyed) {
      inner = '<div class="piece destroyed"><span class="p-body"><span class="p-name">破壊</span></span></div>';
    } else if (pieces.length) {
      inner = pieces.map(function (P) { return pieceHtml(S, P, ctx); }).join('');
    } else if (S.phase !== 'setup' && S.phase !== 'over') {
      inner = blankHtml(S, u.id, pi, ctx);
    }
    var spd = ctx.canSeeEnemySpeed ? '<span class="espd" title="速度(KP/GM のみ)">速' + L.num(part.spd, 0) + '</span>' : '';
    var showSp = u.kind === 'normal' || ctx.canSeeEnemySpeed;
    return '<div class="part ' + (part.destroyed ? 'destroyed' : '') + '" data-part="' + esc(u.id + '|' + pi) + '">' +
      '<div class="part-head" data-act="info-part" data-ref="' + esc(u.id + '|' + pi) + '">' +
      (multi ? '<span class="part-name">' + esc(part.name) + '</span>' : '') +
      (multi ? hpBar(info, part.lines, 'part-bar') : '') +
      (showSp ? spChip(part) : '') + staggerChip(part) + spd +
      '</div><div class="badges">' + badges(part) + '</div>' +
      '<div class="pieces">' + inner + '</div></div>';
  }

  function enemyCard(S, u, ctx) {
    var info = L.hpInfo(u);
    var body = u.parts.map(function (p, i) { return partHtml(S, u, i, ctx); }).join('');
    var head = '<div class="e-head"><span class="e-face">' + portrait(u.name, u.img) + '</span><div class="e-title"><div class="name">' + esc(u.name) + '</div>' +
      hpBar(info, u.kind === 'normal' ? u.parts[0].lines : [], 'enemy-bar') + '</div></div>';
    return '<div class="enemy ' + (u.dead ? 'dead' : '') + ' ' + u.kind + '" data-tok="' + esc(u.id) + '">' + head + '<div class="parts">' + body + '</div></div>';
  }

  function stage(S, ctx) {
    var enemies = [];
    var allies = [];
    Object.keys(S.units).forEach(function (id) {
      var u = S.units[id];
      if (u.side === 'enemy') { enemies.push(u); } else { allies.push(u); }
    });
    enemies.sort(function (a, b) { return a.ord - b.ord; });
    allies.sort(function (a, b) { return a.ord - b.ord; });
    if (!enemies.length && !allies.length) {
      return '<p class="empty">まだキャラクターがいません。KPが準備パネルからJSONを読み込んでください。</p>';
    }
    return '<div class="row enemies">' + (enemies.map(function (u) { return enemyCard(S, u, ctx); }).join('') || '<p class="empty">敵がいません</p>') + '</div>' +
      '<div class="row allies">' + (allies.map(function (u) { return allyCard(S, u, ctx); }).join('') || '<p class="empty">味方がいません</p>') + '</div>';
  }

  function head(S, ctx) {
    var me = ctx.me;
    var allyOpts = '';
    Object.keys(S.units).forEach(function (id) {
      if (S.units[id].side === 'ally') { allyOpts += '<option value="' + esc(id) + '"' + (me.unitId === id ? ' selected' : '') + '>' + esc(S.units[id].name) + '</option>'; }
    });
    var unitSel = me.role === 'player' ? '<label class="inline">操作キャラ<select data-change="unit"><option value="">選択</option>' + allyOpts + '</select></label>' : '';
    var filter = '<label class="inline">矢印<select data-change="arrows"><option value="all"' + (ctx.arrowMode === 'all' ? ' selected' : '') + '>すべて</option><option value="mine"' + (ctx.arrowMode === 'mine' ? ' selected' : '') + '>自分のみ</option><option value="off"' + (ctx.arrowMode === 'off' ? ' selected' : '') + '>なし</option></select></label>';
    return '<div class="head-main"><b class="room">' + esc(me.room) + '</b><span class="chip">' + ROLE_LABEL[me.role] + '</span>' +
      '<span class="chip round">R' + S.round + '</span><span class="chip phase">' + PHASE_LABEL[S.phase] + '</span>' +
      '<span class="chip conn ' + ctx.conn + '">' + (ctx.mode === 'firebase' ? (ctx.conn === 'online' ? '接続中' : '切断') : 'ローカル') + '</span></div>' +
      '<div class="head-sub">' + unitSel + filter + '<button type="button" class="btn small" data-act="leave">退室</button></div>';
  }

  function skillDetail(sk, title) {
    if (!sk) { return '<p class="empty">スキルがありません</p>'; }
    var sin = L.SINS[sk.sin] ? L.SINS[sk.sin].label : '';
    var phys = L.PHYS[sk.phys] || '';
    return '<div class="sk" style="--c: ' + sinColor(sk.sin) + ';"><div class="sk-head"><b>' + esc(sk.name) + '</b><span class="chip">' + esc(kindLabel(sk)) + '</span>' +
      (sin ? '<span class="chip">' + sin + '</span>' : '') + (phys ? '<span class="chip">' + phys + '</span>' : '') + '</div>' +
      '<div class="sk-nums">基礎威力 ' + L.num(sk.base, 0) + ' / コイン ' + A(sk.coins).map(function (c) { return '+' + c; }).join(' ') + '</div>' +
      (sk.text ? '<div class="sk-text">' + esc(sk.text).replace(/\n/g, '<br>') + '</div>' : '') + '</div>';
  }

  function resistTable(b) {
    var r = O(b.resist);
    var rows = '';
    var keys = Object.keys(L.PHYS).concat(Object.keys(L.SINS));
    keys.forEach(function (k) {
      var v = r[k] || 'normal';
      var label = L.PHYS[k] || L.SINS[k].label;
      rows += '<span class="res ' + v + '">' + label + ' ' + L.RES_LABEL[v] + '</span>';
    });
    return '<div class="reslist">' + rows + '</div>';
  }

  function partPopup(S, ref, ctx) {
    var p = L.parsePid(ref + '|x');
    var g = L.getB(S, { u: p.u, p: p.p });
    if (!g) { return ''; }
    var info = L.hpInfo(g.unit, g.part);
    var html = '<h3>' + esc(L.nameOf(S, g.ref)) + '</h3>' + hpBar(info, g.b.lines, '') +
      '<div class="line">精神力 ' + spChip(g.b) + staggerChip(g.b) + '</div><div class="badges">' + badges(g.b) + '</div>' +
      resistTable(g.b);
    if (g.unit.kind === 'normal') { html += '<p class="note">体力 ' + g.unit.hp + '/' + g.unit.maxHp + '</p>'; }
    var skills = O(g.b.skills);
    var keys = Object.keys(skills);
    if (keys.length) {
      html += '<h4>スキル</h4>' + keys.map(function (k) { return skillDetail(skills[k]); }).join('');
    }
    return html;
  }

  function unitPopup(S, id) {
    var u = S.units[id];
    if (!u) { return ''; }
    var html = '<h3>' + esc(u.name) + '</h3>' + hpBar(L.hpInfo(u), u.lines, '') +
      '<div class="line">精神力 ' + spChip(u) + ' 速度 ' + L.num(u.spd, 0) + ' (' + u.speed[0] + '〜' + u.speed[1] + ')' + staggerChip(u) + '</div>' +
      '<div class="badges">' + badges(u) + '</div>' + resistTable(u);
    html += '<h4>スキル</h4>';
    [1, 2, 3, 0].forEach(function (n) { html += skillDetail(O(u.skills)[n]); });
    return html;
  }

  function piecePopup(S, pid) {
    var P = L.getPiece(S, pid);
    if (!P) { return ''; }
    var sk = L.pieceSkill(S, P);
    return '<h3>' + esc(L.nameOf(S, L.pieceRef(P))) + '</h3>' + skillDetail(sk);
  }

  function playerPanel(S, ctx) {
    var me = ctx.me;
    if (me.role !== 'player') { return ''; }
    var u = S.units[me.unitId];
    if (!u) { return '<h3>行動選択</h3><p class="empty">上部で操作するキャラクターを選んでください。</p>'; }
    if (u.dead) { return '<h3>' + esc(u.name) + '</h3><p class="empty">戦闘不能です。</p>'; }
    if (S.phase === 'setup') { return '<h3>' + esc(u.name) + '</h3><p class="empty">戦闘開始をお待ちください。</p>'; }
    var hand = L.handOf(S, u);
    var ch = u.choice || {};
    var editable = S.phase === 'player' && !u.stagger;
    var html = '<h3>' + esc(u.name) + ' の行動</h3>';
    if (u.stagger) { return html + '<p class="empty">混乱しているため行動できません。</p>'; }
    var cards = [['c0', hand.sel[0]], ['c1', hand.sel[1]], ['def', hand.def]];
    html += '<div class="hand">';
    cards.forEach(function (c) {
      var card = c[1];
      var sk = card && card.skill;
      var active = ch.sel === c[0];
      html += '<button type="button" class="card' + (active ? ' picked' : '') + '" data-act="sel" data-sel="' + c[0] + '"' + (editable && sk ? '' : ' disabled') + ' style="--c: ' + sinColor(sk && sk.sin) + ';">' +
        '<span class="card-t">' + SEL_LABEL[c[0]] + (card && card.num ? ' (' + card.num + ')' : '') + '</span>' +
        '<b>' + esc(sk ? sk.name : '-') + '</b><span class="card-m">' + esc(kindLabel(sk)) + ' ' + L.num(sk && sk.base, 0) + '+' + (sk ? A(sk.coins).length : 0) + '枚</span></button>';
    });
    html += '</div>';
    if (hand.preview && hand.preview.skill) {
      html += '<p class="note">次のカード: ' + esc(hand.preview.skill.name) + ' (' + hand.preview.num + ')</p>';
    }
    var sel = L.chosenSkill(S, u);
    if (sel) { html += skillDetail(sel); }
    if (ch.sel && ch.sel !== 'def' && sel && sel.kind === 'attack') {
      var P = L.getPiece(S, ch.target);
      html += '<p class="note">対象: ' + (P ? '<b>' + esc(L.nameOf(S, L.pieceRef(P))) + (P.blank ? '(空き)' : ' 「' + esc((L.pieceSkill(S, P) || {}).name || '') + '」') + '</b>' : '<b class="warn">未選択</b>(敵のスキル枠を押してください)') + '</p>';
    } else if (ch.sel === 'def' || (sel && sel.kind !== 'attack')) {
      html += '<p class="note">守備: 相手の攻撃に応じて自動で処理されます。</p>';
    }
    if (editable) {
      if (ch.confirmed) { html += '<button type="button" class="btn" data-act="unconfirm">確定を取り消す</button>'; }
      else { html += '<button type="button" class="btn primary" data-act="confirm"' + (L.canConfirm(S, u) ? '' : ' disabled') + '>この行動で確定</button>'; }
    } else if (S.phase === 'enemy') {
      html += '<p class="note">敵の行動が決まるまでお待ちください。</p>';
    } else if (S.phase === 'process') {
      html += '<p class="note">戦闘処理中です。</p>';
    }
    return html;
  }

  function gmPanel(S, ctx) {
    var me = ctx.me;
    if (me.role !== 'kp' && me.role !== 'gm') { return ''; }
    if (S.phase !== 'enemy') { return ''; }
    var allies = Object.keys(S.units).filter(function (id) { return S.units[id].side === 'ally' && !S.units[id].dead; });
    var html = '<h3>敵の行動決定</h3>';
    var any = false;
    A(S.pieces).forEach(function (P) {
      var sk = L.pieceSkill(S, P);
      if (!sk) { return; }
      any = true;
      var ref = L.nameOf(S, L.pieceRef(P)) + ' 「' + sk.name + '」';
      if (sk.kind === 'defense' || sk.kind === 'counter') {
        html += '<div class="grow"><span>' + esc(ref) + '</span><span class="note">' + esc(kindLabel(sk)) + '(対象なし)</span></div>';
        return;
      }
      html += '<label class="grow"><span>' + esc(ref) + '</span><select data-change="ptarget" data-pid="' + esc(P.pid) + '"><option value="">対象を選択</option>' +
        allies.map(function (id) { return '<option value="' + esc(id) + '"' + (P.target === id ? ' selected' : '') + '>' + esc(S.units[id].name) + '</option>'; }).join('') + '</select></label>';
    });
    if (!any) { html += '<p class="empty">敵のスキルがありません。</p>'; }
    var changes = '';
    Object.keys(S.units).forEach(function (id) {
      var u = S.units[id];
      if (u.side !== 'enemy' || u.dead) { return; }
      u.parts.forEach(function (part, pi) {
        if (part.destroyed || !Object.keys(O(part.skills)).length) { return; }
        changes += '<label class="grow"><span>' + esc(L.nameOf(S, { u: id, p: pi })) + '</span><select data-change="pskill" data-u="' + esc(id) + '" data-p="' + pi + '"><option value="">(変更しない)</option><option value="-">スキルなし</option>' +
          Object.keys(part.skills).map(function (k) { return '<option value="' + esc(k) + '">' + esc(part.skills[k].name || k) + '</option>'; }).join('') + '</select></label>';
      });
    });
    if (changes) { html += '<details class="more"><summary>敵スキルを手動で変更</summary>' + changes + '</details>'; }
    html += '<button type="button" class="btn primary" data-act="gm-confirm">敵の行動を確定する</button>';
    return html;
  }

  function planList(S, ctx) {
    if (S.phase !== 'process' && S.phase !== 'roundEnd' && S.phase !== 'over') { return ''; }
    var plan = A(S.plan);
    if (!plan.length) { return ''; }
    var seeSpd = ctx.canSeeEnemySpeed;
    var html = '<h3>行動順</h3><ol class="plan-list">';
    var cur = -1;
    plan.forEach(function (e, i) { if (!e.done && cur < 0) { cur = i; } });
    plan.forEach(function (e, i) {
      var label;
      var spd;
      if (e.kind === 'ally') {
        var u = S.units[e.unitId];
        if (!u) { return; }
        var sk = L.chosenSkill(S, u);
        label = '<b>' + esc(u.name) + '</b> ' + esc(u.choice && u.choice.sel === 'def' ? '守備' : (sk ? sk.name : ''));
        spd = e.spd;
      } else {
        var P = L.getPiece(S, e.pid);
        var psk = P && L.pieceSkill(S, P);
        label = '<span class="foe">' + esc(L.nameOf(S, { u: e.unitId, p: e.partIdx })) + '</span> ' + esc(psk ? psk.name : '');
        spd = seeSpd ? e.spd : '?';
      }
      html += '<li class="' + (e.done ? 'done' : '') + (i === cur && S.phase === 'process' ? ' now' : '') + '"><span class="n">' + spd + '</span>' + label + '</li>';
    });
    return html + '</ol>';
  }

  function logHtml(S) {
    var lines = A(S.log);
    return '<h3>ログ</h3><div class="log-body">' + lines.map(function (t) { return '<div>' + esc(t) + '</div>'; }).join('') + '</div>';
  }

  function kpPanel(S, ctx) {
    if (ctx.me.role !== 'kp') { return ''; }
    var html = '<h3>KP操作</h3>';
    if (S.phase === 'setup') {
      html += '<p class="note">味方と敵のJSONを読み込み、戦闘を開始します。形式はREADMEをご覧ください。</p>' +
        '<div class="btns"><button type="button" class="btn" data-act="load-sample">サンプルを読み込む</button></div>' +
        '<label class="field">味方JSON<textarea id="jsonAllies" rows="4" placeholder="{&quot;allies&quot;:[...]} を貼り付け"></textarea></label>' +
        '<div class="btns"><button type="button" class="btn" data-act="load-allies">味方を追加</button><label class="btn file">ファイル<input type="file" accept=".json,application/json" data-change="file" data-to="jsonAllies"></label></div>' +
        '<label class="field">敵JSON<textarea id="jsonEnemies" rows="4" placeholder="{&quot;enemies&quot;:[...]} を貼り付け"></textarea></label>' +
        '<div class="btns"><button type="button" class="btn" data-act="load-enemies">敵を追加</button><label class="btn file">ファイル<input type="file" accept=".json,application/json" data-change="file" data-to="jsonEnemies"></label></div>' +
        '<p class="err" id="setupErr"></p>' +
        '<div class="btns"><button type="button" class="btn primary" data-act="begin"' + (Object.keys(S.units).length ? '' : ' disabled') + '>戦闘開始(ラウンド1)</button>' +
        '<button type="button" class="btn danger" data-act="reset">全削除</button></div>';
      return html;
    }
    if (S.phase === 'enemy') {
      html += '<p class="note">敵の行動を確定すると、味方が行動を選べます。</p>';
    }
    if (S.phase === 'player') {
      var done = 0;
      var total = 0;
      Object.keys(S.units).forEach(function (id) {
        var u = S.units[id];
        if (u.side !== 'ally' || u.dead) { return; }
        total += 1;
        if (u.choice && u.choice.confirmed) { done += 1; }
      });
      html += '<p class="note">確定済み ' + done + '/' + total + '</p>' +
        '<button type="button" class="btn primary" data-act="start-process">戦闘開始(処理に進む)</button>';
    }
    if (S.phase === 'process') {
      html += '<div class="btns"><button type="button" class="btn primary" data-act="step">1手進める</button>' +
        '<button type="button" class="btn" data-act="auto">' + (ctx.auto ? '自動進行を止める' : '自動進行') + '</button>' +
        '<button type="button" class="btn" data-act="finish">最後まで進める</button></div>';
    }
    if (S.phase === 'roundEnd') {
      html += '<button type="button" class="btn primary" data-act="next-round">次のラウンドへ</button>';
    }
    if (S.phase === 'over') {
      html += '<p class="note result">' + (S.result === 'victory' ? '味方の勝利' : '味方の敗北') + '</p>' +
        '<button type="button" class="btn danger" data-act="reset">戦闘を終了して準備に戻る</button>';
    }
    html += manualPanel(S, ctx);
    return html;
  }

  function manualPanel(S, ctx) {
    var opts = '';
    Object.keys(S.units).forEach(function (id) {
      var u = S.units[id];
      if (u.side === 'ally') { opts += '<option value="' + esc(id) + '|">' + esc(u.name) + '</option>'; }
      else { u.parts.forEach(function (p, pi) { opts += '<option value="' + esc(id) + '|' + pi + '">' + esc(L.nameOf(S, { u: id, p: pi })) + '</option>'; }); }
    });
    var stOpts = Object.keys(L.STATUS).map(function (k) { return '<option value="' + k + '">' + L.STATUS[k].label + '</option>'; }).join('');
    var sel = ctx.manualTarget || '';
    return '<details class="more"><summary>手動補助(体力・精神力・状態など)</summary>' +
      '<label class="field">対象<select id="mTarget" data-change="mtarget">' + opts.replace('value="' + esc(sel) + '"', 'value="' + esc(sel) + '" selected') + '</select></label>' +
      '<div class="grow"><input id="mHp" type="number" placeholder="体力/耐久"><button type="button" class="btn small" data-act="m-hp">設定</button></div>' +
      '<div class="grow"><input id="mSp" type="number" placeholder="精神力(-45〜45)"><button type="button" class="btn small" data-act="m-sp">設定</button></div>' +
      '<div class="grow"><select id="mSt">' + stOpts + '</select><input id="mP" type="number" placeholder="威力/値"><input id="mC" type="number" placeholder="回数"><button type="button" class="btn small" data-act="m-st-add">付与</button></div>' +
      '<div class="grow"><button type="button" class="btn small" data-act="m-st-del">選択中の状態を解除</button><button type="button" class="btn small" data-act="m-vib">振動爆発</button></div>' +
      '<div class="grow"><button type="button" class="btn small" data-act="m-stag-clear">混乱を回復</button><button type="button" class="btn small" data-act="m-revive">復帰</button><button type="button" class="btn small" data-act="m-ego">E.G.O使用</button></div>' +
      '<label class="grow"><input id="mFlag" type="text" placeholder="手動フラグ名"><button type="button" class="btn small" data-act="m-flag">切替</button></label>' +
      '<p class="note">加算の手動補助です。状態の付与は既存の値に加算されます。</p></details>';
  }

  root.LCUI = {
    esc: esc, stage: stage, head: head, playerPanel: playerPanel, gmPanel: gmPanel, kpPanel: kpPanel, planList: planList, logHtml: logHtml,
    partPopup: partPopup, unitPopup: unitPopup, piecePopup: piecePopup, PHASE_LABEL: PHASE_LABEL
  };
}(typeof self !== 'undefined' ? self : this));
