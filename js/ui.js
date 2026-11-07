(function (root) {
  'use strict';

  var L = root.LC;
  var A = L.A;
  var O = L.O;

  var PHASE_LABEL = { setup: '準備', enemy: '敵の行動決定', player: '味方の行動選択', process: '戦闘処理', roundEnd: 'ラウンド終了', over: '決着' };
  var ROLE_LABEL = { gm: 'GM', player: 'プレイヤー', observer: '観戦' };
  var SUB_LABEL = { guard: '防御', evade: '回避' };

  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c];
    });
  }

  function kindLabel(sk) {
    if (!sk) { return ''; }
    if (sk.kind === 'defense') { return SUB_LABEL[sk.sub] || '防御'; }
    return L.KIND_LABEL[sk.kind] || '';
  }


  var STATUS_ICON = {
    vibration: 'tremor.png',
    breath: 'poise.png',
    trance: 'trance.png',
    paralysis: 'paralyze.png',
    dmgUp: 'damage-up.png',
    dmgDown: 'damage-down.png',
    protect: 'protection.png',
    powerUp: 'power-up.png',
    powerDown: 'power-down.png',
    atkPowerUp: 'attack-power-up.png',
    atkPowerDown: 'attack-power-down.png',
    defPowerUp: 'defense-power-up.png',
    defPowerDown: 'defense-power-down.png',
    matchPowerUp: 'clash-power-up.png',
    matchPowerDown: 'clash-power-down.png',
    coinStrong: 'plus-coin-boost.png',
    coinWeak: 'plus-coin-drop.png',
    quick: 'haste.png'
  };

  function statusIcon(base, suf) {
    if (suf && base === 'dmgUp') { return suf + '-dmg-up.png'; }
    if (suf && base === 'protect') { return suf + '-protection.png'; }
    return STATUS_ICON[base] || base + '.png';
  }

  function statusHtml(icon, glyph, color, pw, cnt, inert, title) {
    return '<span class="st' + (inert ? ' inert' : '') + '" style="--c: ' + color + ';" title="' + esc(title) + '">' +
      '<span class="st-ic"><b>' + esc(glyph) + '</b><img src="image/icon/status/' + esc(icon) + '" alt="" onload="this.previousElementSibling.remove()" onerror="this.remove()"></span>' +
      '<span class="st-v">' + esc(pw) + '</span>' +
      '<span class="st-c">' + esc(cnt) + '</span></span>';
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
      var pw;
      var cnt = '';
      var extra = '';
      if (def.type === 'pc') {
        pw = String(L.num(s.p, 0));
        cnt = String(L.num(s.c, 0));
        if (sp.base === 'vibration' && s.k && s.k !== 'vibration') { extra = ' ' + s.k; }
      } else {
        pw = String(L.num(s.v, 0));
      }
      var suf = sp.suf ? (L.SINS[sp.suf] ? L.SINS[sp.suf].label : (L.PHYS[sp.suf] || sp.suf)) : '';
      var inert = def.type === 'pc' && L.num(s.p, 0) <= 0 && !def.keepPotency;
      out += statusHtml(statusIcon(sp.base, sp.suf), def.glyph, def.color, pw, cnt, inert, def.label + (suf ? '(' + suf + ')' : '') + extra + ': ' + def.text);
    });
    if (L.num(b && b.barrier, 0) > 0) {
      out += statusHtml('barrier.png', '盾', 'rgb(110, 200, 235)', String(b.barrier), '', false, 'バリア: 追加の体力(ラウンド終了で消える)');
    }
    return out;
  }

  function hpBar(info, lines, cls, curOnly) {
    var ratio = info.max > 0 ? Math.max(0, Math.min(1, info.cur / info.max)) : 0;
    var marks = A(lines).map(function (l) {
      return '<i class="mark" style="left: ' + (Math.min(100, l / info.max * 100)).toFixed(1) + '%;"></i>';
    }).join('');
    return '<div class="bar ' + (cls || '') + '"><div class="fill" style="width: ' + (ratio * 100).toFixed(1) + '%;"></div>' + marks + '<span class="num">' + (curOnly ? info.cur : info.cur + '/' + info.max) + '</span></div>';
  }

  function spChip(b) {
    var sp = L.num(b.sp, 0);
    var cls = sp <= -45 ? 'low' : (sp >= 45 ? 'high' : '');
    return '<span class="sp ' + cls + '" title="精神力 / 表の確率 ' + Math.round(L.headsProb(sp) * 100) + '%">' + (sp > 0 ? '+' : '') + sp + '</span>';
  }

  function staggerChip(b) {
    if (!b.stagger && !b.panic) { return ''; }
    if (!b.stagger) { return '<span class="stag">パニック</span>'; }
    return '<span class="stag">混乱' + (b.stagger.level > 1 ? ' Lv' + b.stagger.level : '') + '</span>';
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
    var html = '<h3>' + esc(L.nameOf(S, g.ref)) + '</h3><div class="line">' + (g.part && g.unit.kind === 'abnormality' ? '耐久' : '体力') + '</div>' + hpBar(info, g.b.lines, '', g.unit.side === 'enemy') +
      '<div class="line">' + (g.b.noSp ? '' : '精神力 ' + spChip(g.b)) + staggerChip(g.b) + '</div><div class="badges">' + badges(g.b) + '</div>' +
      resistTable(g.b);
    if (g.unit.kind === 'abnormality') { html += '<p class="note">全体の体力 ' + g.unit.hp + '</p>'; }
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
    var html = '<h3>' + esc(u.name) + '</h3><div class="line">体力</div>' + hpBar(L.hpInfo(u), u.lines, '', u.side === 'enemy') +
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


  function allyPiecePopup(S, id, ctx) {
    var u = S.units[id];
    if (!u) { return ''; }
    var sk = L.chosenSkill(S, u);
    var html = '<h3>' + esc(u.name) + '</h3>' + skillDetail(sk);
    var own = ctx.me.role === 'player' && ctx.me.unitId === id && S.phase === 'player' && !u.dead && !L.incap(u);
    if (own) { html += '<div class="btns"><button type="button" class="btn" data-act="skill-list">スキルを選び直す</button></div>'; }
    return html;
  }

  function gmPanel(S, ctx) {
    var me = ctx.me;
    if (me.role !== 'gm') { return ''; }
    if (S.phase !== 'enemy') { return ''; }
    var allies = Object.keys(S.units).filter(function (id) { return S.units[id].side === 'ally' && !S.units[id].dead; });
    var html = '<h3>敵の行動決定</h3>';
    var any = false;
    A(S.pieces).forEach(function (P) {
      var sk = L.pieceSkill(S, P);
      if (!sk) { return; }
      any = true;
      var ref = L.nameOf(S, L.pieceRef(P)) + ' 「' + sk.name + '」';
      if (sk.kind === 'counter') {
        html += '<div class="grow"><span>' + esc(ref) + '</span><span class="note">反撃(対象なし)</span></div>';
        return;
      }
      html += '<label class="grow"><span>' + esc(ref) + (sk.kind === 'defense' ? '(' + esc(kindLabel(sk)) + ')' : '') + '</span><select data-change="ptarget" data-pid="' + esc(P.pid) + '"><option value="">' + (sk.kind === 'defense' ? '合わせる味方を選択' : '対象を選択') + '</option>' +
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
    var key = 'R' + S.round + ' ';
    var lines = A(S.log).filter(function (t) { return String(t).indexOf(key) === 0; });
    return '<div class="log-body">' + lines.map(function (t) { return '<div>' + esc(String(t).slice(key.length)) + '</div>'; }).join('') + '</div>';
  }

  function slotList(S) {
    var list = L.enemyOrder(S);
    if (list.length < 2) { return ''; }
    return '<div class="slots"><h4>敵の配置(左から)</h4>' + list.map(function (u, i) {
      return '<div class="slot"><span class="slot-n">' + (i + 1) + '</span><span class="slot-name">' + esc(u.name) + '</span>' +
        '<button type="button" class="btn small ghost" data-act="slot-move" data-id="' + esc(u.id) + '" data-dir="-1"' + (i === 0 ? ' disabled' : '') + '>◀</button>' +
        '<button type="button" class="btn small ghost" data-act="slot-move" data-id="' + esc(u.id) + '" data-dir="1"' + (i === list.length - 1 ? ' disabled' : '') + '>▶</button></div>';
    }).join('') + '</div>';
  }

  function toolsPanel(S, ctx) {
    if (ctx.me.role !== 'gm') { return ''; }
    var html = '<h3>GM操作</h3>';
    if (S.phase === 'setup') {
      html += '<p class="note">味方と敵のJSONを読み込み、戦闘を開始します。形式はREADMEをご覧ください。</p>' +
        '<div class="btns"><button type="button" class="btn" data-act="load-sample">サンプルを読み込む</button></div>' +
        '<label class="field">味方JSON<textarea id="jsonAllies" rows="4" placeholder="{&quot;allies&quot;:[...]} を貼り付け"></textarea></label>' +
        '<div class="btns"><button type="button" class="btn" data-act="load-allies">味方を追加</button><label class="btn file">ファイル<input type="file" accept=".json,application/json" data-change="file" data-to="jsonAllies"></label></div>' +
        '<label class="field">敵JSON<textarea id="jsonEnemies" rows="4" placeholder="{&quot;enemies&quot;:[...]} を貼り付け"></textarea></label>' +
        '<div class="btns"><button type="button" class="btn" data-act="load-enemies">敵を追加</button><label class="btn file">ファイル<input type="file" accept=".json,application/json" data-change="file" data-to="jsonEnemies"></label></div>' +
        slotList(S) +
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
    var resOpts = L.RES_ORDER.map(function (k) { return '<option value="' + k + '">' + L.SINS[k].label + '(現在 ' + L.resOf(S, k) + ')</option>'; }).join('');
    var sel = ctx.manualTarget || '';
    return '<details class="more"><summary>手動補助(体力・精神力・状態など)</summary>' +
      '<label class="field">対象<select id="mTarget" data-change="mtarget">' + opts.replace('value="' + esc(sel) + '"', 'value="' + esc(sel) + '" selected') + '</select></label>' +
      '<div class="grow"><input id="mHp" type="number" placeholder="体力/耐久"><button type="button" class="btn small" data-act="m-hp">設定</button></div>' +
      '<div class="grow"><input id="mSp" type="number" placeholder="精神力(-45〜45)"><button type="button" class="btn small" data-act="m-sp">設定</button></div>' +
      '<div class="grow"><select id="mSt">' + stOpts + '</select><input id="mP" type="number" placeholder="威力/値"><input id="mC" type="number" placeholder="回数"><button type="button" class="btn small" data-act="m-st-add">付与</button></div>' +
      '<div class="grow"><button type="button" class="btn small" data-act="m-st-del">選択中の状態を解除</button><button type="button" class="btn small" data-act="m-vib">振動爆発</button></div>' +
      '<div class="grow"><button type="button" class="btn small" data-act="m-stag-clear">混乱を回復</button><button type="button" class="btn small" data-act="m-revive">復帰</button><button type="button" class="btn small" data-act="m-ego">E.G.O使用</button></div>' +
      '<div class="grow"><select id="mRes">' + resOpts + '</select><input id="mResV" type="number" min="0" placeholder="資源の数"><button type="button" class="btn small" data-act="m-res">資源を設定</button></div>' +
      '<label class="grow"><input id="mFlag" type="text" placeholder="手動フラグ名"><button type="button" class="btn small" data-act="m-flag">切替</button></label>' +
      '<p class="note">加算の手動補助です。状態の付与は既存の値に加算されます。</p></details>';
  }

  var SIN_COLORS = {
    envy: 'rgb(150, 70, 220)',
    wrath: 'rgb(220, 60, 50)',
    pride: 'rgb(70, 120, 230)',
    gluttony: 'rgb(110, 190, 70)',
    lust: 'rgb(240, 140, 50)',
    gloom: 'rgb(60, 190, 200)',
    sloth: 'rgb(230, 200, 60)'
  };
  var C = {
    gold: 'rgb(230, 180, 50)',
    red: 'rgb(232, 104, 96)',
    blue: 'rgb(96, 168, 224)',
    yellow: 'rgb(230, 200, 60)',
    alert: 'rgb(232, 70, 60)',
    label: 'rgb(220, 205, 200)'
  };

  function sinColor(sin) { return SIN_COLORS[sin] || 'rgb(150, 140, 140)'; }

  function pctOf(a, b) { return b > 0 ? Math.max(0, Math.min(100, Math.round(a / b * 100))) : 0; }
  function spPct(sp) { return (L.num(sp, 0) + 45) / 90 * 100; }
  function spBarColor(sp) {
    var p = spPct(sp);
    return p <= 0 ? C.alert : (p <= 25 ? C.yellow : C.blue);
  }
  function spCircle(sp) {
    var v = L.num(sp, 0);
    if (v <= -45) { return { bg: 'rgb(232, 70, 60)', fg: 'rgb(255, 255, 255)' }; }
    if (v >= 45) { return { bg: 'rgb(96, 168, 224)', fg: 'rgb(24, 14, 14)' }; }
    return { bg: 'rgb(84, 64, 60)', fg: 'rgb(240, 230, 225)' };
  }

  function frameSvg(sin, tier, kind) {
    var cx = 30;
    var cy = 30;
    function pts(r) {
      var a = [];
      for (var i = 0; i < 7; i += 1) {
        var t = (-90 + 360 / 7 * i) * Math.PI / 180;
        a.push((cx + r * Math.cos(t)).toFixed(1) + ',' + (cy + r * Math.sin(t)).toFixed(1));
      }
      return a.join(' ');
    }
    if (kind === 'destroyed') {
      return '<svg class="frame" viewBox="0 0 60 60" aria-hidden="true"><polygon points="' + pts(25) + '" fill="rgb(30, 22, 22)" stroke="rgb(100, 90, 88)" stroke-width="2" stroke-dasharray="5 4"/>' +
        '<path d="M20 20 L40 40 M40 20 L20 40" stroke="rgb(150, 135, 130)" stroke-width="3" stroke-linecap="round"/></svg>';
    }
    if (kind === 'blank') {
      return '<img class="frame" src="image/skill/empty-action.png" alt="">';
    }
    var c = sinColor(sin);
    var lv = Math.max(1, Math.min(4, L.num(tier, 1)));
    var s = '<svg class="frame" viewBox="0 0 60 60" aria-hidden="true">';
    s += '<polygon points="' + pts(27.5) + '" fill="none" stroke="rgb(10, 6, 6)" stroke-width="7"/>';
    s += '<polygon points="' + pts(25) + '" fill="rgb(40, 26, 28)" stroke="' + c + '" stroke-width="4"/>';
    if (lv >= 2) { s += '<polygon points="' + pts(29) + '" fill="none" stroke="' + c + '" stroke-width="1.5" opacity="0.8"/>'; }
    if (lv >= 3) {
      for (var i = 0; i < 3; i += 1) {
        var t = (-90 + 360 / 7 * (i + 5)) * Math.PI / 180;
        s += '<path d="M' + (cx + 26 * Math.cos(t)).toFixed(1) + ' ' + (cy + 26 * Math.sin(t)).toFixed(1) + ' L' + (cx + 31 * Math.cos(t)).toFixed(1) + ' ' + (cy + 31 * Math.sin(t)).toFixed(1) + '" stroke="' + c + '" stroke-width="4" stroke-linecap="round"/>';
      }
    }
    if (lv >= 4) { s += '<polygon points="' + pts(30) + '" fill="none" stroke="rgb(240, 200, 90)" stroke-width="1.5"/>'; }
    return s + '</svg>';
  }

  function barRow(label, text, pct, color, labelColor, marks) {
    var ticks = A(marks).map(function (m) { return '<i class="tick" style="left: ' + m.toFixed(1) + '%;"></i>'; }).join('');
    return '<div class="bar-row"><div class="bar-label" style="color: ' + labelColor + ';"><span>' + label + '</span><span>' + text + '</span></div>' +
      '<div class="bar-track"><div class="bar-fill" style="width: ' + pct + '%; background: ' + color + ';"></div>' + ticks + '</div></div>';
  }
  function hpRow(label, info, lines, labelColor) {
    var marks = A(lines).map(function (l) { return info.max > 0 ? Math.min(100, l / info.max * 100) : 0; });
    return barRow(label, String(info.cur), pctOf(info.cur, info.max), C.red, labelColor || C.label, marks);
  }
  function spRow(label, sp, labelColor) {
    var v = L.num(sp, 0);
    var w = v <= -45 ? 3 : Math.max(3, Math.round(spPct(v)));
    return barRow(label, (v > 0 ? '+' : '') + v, w, spBarColor(v), labelColor || C.label, []);
  }

  function spDot(sp) {
    var v = L.num(sp, 0);
    var c = spCircle(v);
    return '<span class="e-sp" style="background: ' + c.bg + '; color: ' + c.fg + ';" title="精神力 / 表の確率 ' + Math.round(L.headsProb(v) * 100) + '%">' + v + '</span>';
  }

  function mergedBadges(parts) {
    var total = {};
    A(parts).forEach(function (p) {
      var st = O(p.st);
      Object.keys(st).forEach(function (k) {
        var t = total[k] || (total[k] = {});
        Object.keys(st[k]).forEach(function (f) {
          t[f] = typeof st[k][f] === 'number' ? (t[f] || 0) + st[k][f] : st[k][f];
        });
      });
    });
    return badges({ st: total });
  }

  function physIcon(sk) {
    if (sk.kind === 'counter') { return 'counter'; }
    if (sk.kind === 'defense') { return sk.sub === 'evade' ? 'evade' : 'guard'; }
    return sk.phys || '';
  }

  function frameImg(sk, kind, stag) {
    if (stag) { return '<img class="frame" src="image/skill/stagger-action.png" alt="">'; }
    if (!sk || kind === 'blank' || kind === 'destroyed') { return frameSvg(null, 0, kind === 'destroyed' ? 'destroyed' : 'blank'); }
    if (!SIN_COLORS[sk.sin]) { return frameSvg(sk.sin, sk.tier); }
    var tier = Math.max(1, Math.min(3, L.num(sk.tier, 1)));
    var html = '<img class="frame" src="image/skill/' + sk.sin + '/s' + tier + '.png" alt="">';
    var icon = physIcon(sk);
    if (icon) { html += '<img class="p-icon" src="image/icon/' + esc(icon) + '.png" alt="" onerror="this.remove()">'; }
    return html;
  }

  function partIconName(part) {
    if (part.icon) { return part.icon; }
    var n = part.name || '';
    if (/頭|首|顔/.test(n)) { return 'head'; }
    if (/脚|足/.test(n)) { return 'leg'; }
    if (/腕|手|爪/.test(n)) { return 'arm'; }
    if (/尾|しっぽ/.test(n)) { return 'tail'; }
    if (/胴|体|胸|腹/.test(n)) { return 'body'; }
    return '';
  }

  function partMark(part) {
    var icon = partIconName(part);
    if (!icon) { return esc(part.name); }
    return '<img class="p-part" src="image/icon/abnormality/' + esc(icon) + '.png" alt="' + esc(part.name) + '" title="' + esc(part.name) + '" onerror="this.outerHTML=\'' + esc(part.name) + '\'">';
  }

  function pieceHtml(S, P, ctx, u, pi) {
    var part = u.parts[pi];
    var multi = u.kind === 'abnormality';
    var sk = L.pieceSkill(S, P);
    var g = L.getB(S, L.pieceRef(P));
    var out = L.isOut(g);
    var cls = 'piece';
    if (P.acted) { cls += ' acted'; }
    if (g && L.incap(g.b)) { cls += ' staggered'; }
    if (ctx.pressed[u.id] === P.pid) { cls += ' pressed'; }
    if (ctx.selectedPid === P.pid) { cls += ' picked'; }
    var can = ctx.canSetTarget && sk && !out && (!ctx.targetAttackOnly || sk.kind === 'attack');
    var sub = multi ? partMark(part) : '';
    var gmAct = ctx.me.role === 'gm' && S.phase === 'enemy' && sk && !out && (sk.kind === 'attack' || sk.kind === 'defense');
    if (ctx.gmPick === P.pid) { cls += ' picked'; }
    return '<button type="button" class="' + cls + '" data-act="' + (can ? 'target' : (gmAct ? 'gm-pick' : 'press')) + '" data-pid="' + esc(P.pid) + '" data-piece="' + esc(P.pid) + '" data-part="' + esc(u.id + '|' + pi) + '">' +
      '<span class="p-spd" title="速度">' + (g && g.b && !out ? L.num(g.b.spd, 0) : '&nbsp;') + '</span>' +
      '<span class="p-frame">' + frameImg(sk, 'skill', g && g.b && L.incap(g.b)) + '</span>' +
      '<span class="p-sub">' + sub + '</span></button>';
  }

  function blankHtml(S, u, pi, ctx) {
    var part = u.parts[pi];
    var multi = u.kind === 'abnormality';
    var pid = L.pieceId(u.id, pi, 'b');
    var can = ctx.canSetTarget && !ctx.targetAttackOnly;
    var cls = 'piece blank' + (ctx.pressed[u.id] === pid ? ' pressed' : '') + (ctx.selectedPid === pid ? ' picked' : '');
    var bg = L.getB(S, { u: u.id, p: pi });
    var blankSpd = bg && bg.b ? L.num(bg.b.spd, 0) : null;
    return '<button type="button" class="' + cls + '" data-act="' + (can ? 'target' : 'press') + '" data-pid="' + esc(pid) + '" data-piece="' + esc(pid) + '" data-part="' + esc(u.id + '|' + pi) + '">' +
      '<span class="p-spd" title="速度">' + (blankSpd === null ? '&nbsp;' : blankSpd) + '</span>' +
      '<span class="p-frame">' + frameImg(null, 'blank', bg && bg.b && L.incap(bg.b)) + '</span>' +
      '<span class="p-sub">' + (multi ? partMark(part) : '') + '</span></button>';
  }

  function destroyedHtml(u, pi) {
    var part = u.parts[pi];
    return '<div class="piece destroyed" data-part="' + esc(u.id + '|' + pi) + '"><span class="p-label muted">破壊済</span>' +
      '<span class="p-frame">' + frameSvg(null, 0, 'destroyed') + '</span><span class="p-sub">' + (u.kind === 'abnormality' ? partMark(part) : esc(part.name)) + '</span></div>';
  }

  function enemyColumn(S, u, ctx) {
    var multi = u.kind === 'abnormality';
    var pid = ctx.pressed[u.id];
    var pp = pid ? L.parsePid(pid) : null;
    var pi = multi && pp && u.parts[pp.p] ? pp.p : null;
    var bars;
    var bad;
    var act = '';
    var stag = '';
    if (multi && pi !== null) {
      var part = u.parts[pi];
      bars = hpRow(esc(part.name) + ' 耐久', L.hpInfo(u, part), part.lines, C.gold) + (part.noSp ? '' : spRow('精神力', part.sp, C.gold));
      bad = badges(part);
      act = ' data-act="info-part" data-ref="' + esc(u.id + '|' + pi) + '"';
      stag = staggerChip(part);
    } else if (multi) {
      bars = hpRow('体力', L.hpInfo(u), []);
      bad = mergedBadges(u.parts);
    } else {
      var p0 = u.parts[0];
      bars = '<div class="e-hp">' + hpRow('体力', L.hpInfo(u), p0.lines) + (p0.noSp ? '' : spDot(p0.sp)) + '</div>';
      bad = badges(p0);
      act = ' data-act="info-part" data-ref="' + esc(u.id + '|0') + '"';
      stag = staggerChip(p0);
    }
    var pieces = '';
    u.parts.forEach(function (part, i) {
      if (part.destroyed) { pieces += destroyedHtml(u, i); return; }
      var list = A(S.pieces).filter(function (P) { return P.unitId === u.id && P.partIdx === i; });
      if (list.length) { pieces += list.map(function (P) { return pieceHtml(S, P, ctx, u, i); }).join(''); }
      else if (S.phase !== 'setup' && S.phase !== 'over') { pieces += blankHtml(S, u, i, ctx); }
    });
    var sil = u.img ? '<img class="sil-img" src="' + esc(u.img) + '" alt="">' : '<span class="sil-text">立ち絵</span>';
    return '<div class="e-col ' + u.kind + (u.dead ? ' dead' : '') + '" data-tok="' + esc(u.id) + '">' +
      '<div class="e-top"><div class="e-name"><span>' + esc(u.name) + '</span>' + stag + '</div>' + bars + '</div>' +
      '<div class="e-badges">' + bad + '</div>' +
      '<div class="e-sil"' + act + '>' + sil + '</div>' +
      '<div class="pieces">' + pieces + '</div></div>';
  }

  function allyColumn(S, u, ctx) {
    var info = L.hpInfo(u);
    var pct = pctOf(info.cur, info.max);
    var deg = (2.8 * pct).toFixed(1);
    var ring = 'conic-gradient(from 190deg, rgb(232, 104, 96) 0deg ' + deg + 'deg, rgb(70, 46, 44) ' + deg + 'deg 280deg, transparent 280deg 360deg)';
    var circle = spCircle(u.sp);
    var ch = u.choice;
    var showPiece = S.phase !== 'setup' && S.phase !== 'over';
    var sk = null;
    var pieceCls = 'piece a-piece';
    var label = '未選択';
    var sub = '';
    var kind = 'blank';
    if (u.dead) { label = ''; kind = 'destroyed'; }
    else if (L.incap(u)) { label = u.stagger ? '混乱' : 'パニック'; kind = 'stagger'; }
    else if (ch && ch.sel && S.phase !== 'enemy') {
      sk = L.chosenSkill(S, u);
      if (sk) { label = sk.name || ''; kind = 'skill'; }
    }
    if (ctx.gmPick && !u.dead) { pieceCls += ' picked'; }
    if (ch && ch.acted) { pieceCls += ' acted'; }
    var piece = '';
    if (showPiece) {
      piece = '<button type="button" class="' + pieceCls + '" data-act="ally-piece" data-id="' + esc(u.id) + '">' +
        '<span class="p-label' + (kind === 'skill' ? '' : ' muted') + '">' + esc(label) + '</span>' +
        '<span class="p-frame">' + frameImg(sk, kind, kind === 'stagger') + '</span>' +
        '<span class="p-sub">' + esc(sub) + '</span></button>';
    }
    var state = '';
    if (u.dead) { state = '<span class="a-state down">戦闘不能</span>'; }
    else if (L.incap(u)) { state = '<span class="a-state stag">' + (u.stagger ? '混乱' + (u.stagger.level > 1 ? ' Lv' + u.stagger.level : '') : 'パニック') + '</span>'; }
    else if (S.phase === 'player') { state = ch && ch.confirmed ? '<span class="a-state ok">確定済</span>' : '<span class="a-state wait">選択中</span>'; }
    else if (S.phase === 'enemy') { state = '<span class="a-state muted">待機中</span>'; }
    else if (S.phase === 'process' || S.phase === 'roundEnd') { state = ch && ch.acted ? '<span class="a-state ok">行動済</span>' : ''; }
    var spd = S.phase === 'setup' || u.dead ? '&nbsp;' : String(L.num(u.spd, 0));
    var face = u.img ? '<img class="a-img" src="' + esc(u.img) + '" alt="">' : esc(String(u.name || '?').charAt(0));
    return '<div class="ally' + (ctx.me && ctx.me.unitId === u.id ? ' mine' : '') + (u.dead ? ' dead' : '') + '" data-tok="' + esc(u.id) + '">' +
      piece +
      '<span class="a-spd" title="速度">' + spd + '</span>' +
      '<div class="a-ring" data-act="info-unit" data-id="' + esc(u.id) + '" style="background: ' + ring + ';"><span class="a-face">' + face + '</span>' +
      '<span class="a-sp" style="background: ' + circle.bg + '; color: ' + circle.fg + ';" title="精神力 / 表の確率 ' + Math.round(L.headsProb(L.num(u.sp, 0)) * 100) + '%">' + L.num(u.sp, 0) + '</span>' +
      '<span class="a-hp" title="体力">' + info.cur + '</span></div>' +
      '<span class="a-name" data-act="info-unit" data-id="' + esc(u.id) + '">' + esc(u.name) + '</span>' + state +
      '<div class="a-badges">' + badges(u) + '</div></div>';
  }

  function stage(S, ctx) {
    var enemies = [];
    var allies = [];
    Object.keys(S.units).forEach(function (id) {
      var u = S.units[id];
      if (u.side === 'enemy') { enemies.push(u); } else { allies.push(u); }
    });
    if (!enemies.length && !allies.length) {
      return '<p class="empty">まだキャラクターがいません。GMが準備パネルからJSONを読み込んでください。</p>';
    }
    enemies.sort(function (a, b) { return L.num(a.slot, a.ord) - L.num(b.slot, b.ord) || a.ord - b.ord; });
    if (S.phase !== 'setup') { enemies = enemies.filter(function (u) { return !u.dead; }); }
    allies.sort(function (a, b) {
      var d = (a.dead ? 1 : 0) - (b.dead ? 1 : 0);
      if (d) { return d; }
      if (S.phase !== 'setup') { var s = L.num(b.spd, 0) - L.num(a.spd, 0); if (s) { return s; } }
      return a.ord - b.ord;
    });
    var legend = '<div class="legend"><span class="lg gold">マッチ(敵と味方がぶつかる)</span><span class="lg red">敵の一方攻撃</span><span class="lg blue">味方の一方攻撃</span><span class="lg dash">確定前</span></div>' +
      '<p class="legend-note">黄色の数字=速度 / 枠の色=罪悪、装飾=スキルの強さ / 敵のスキル駒を押すと、全体の体力が部位の耐久と精神力に切り替わります</p>';
    return '<div class="row enemies">' + (enemies.map(function (u) { return enemyColumn(S, u, ctx); }).join('') || '<p class="empty">敵がいません</p>') + '</div>' +
      '<div class="row allies">' + (allies.map(function (u) { return allyColumn(S, u, ctx); }).join('') || '<p class="empty">味方がいません</p>') + '</div>' + legend;
  }

  function head(S, ctx) {
    var me = ctx.me;
    var total = 0;
    var done = 0;
    Object.keys(S.units).forEach(function (id) {
      var u = S.units[id];
      if (u.side !== 'ally' || u.dead) { return; }
      total += 1;
      if (u.choice && u.choice.confirmed) { done += 1; }
    });
    var count = S.phase === 'player' ? '<span class="count">確定 ' + done + ' / ' + total + '</span>' : '';
    var btn = '';
    if (me.role === 'gm') {
      var map = { enemy: ['gm-confirm', '敵の行動を確定'], player: ['start-process', '戦闘開始'], process: ['step', '1手進める'], roundEnd: ['next-round', '次のラウンドへ'] };
      if (map[S.phase]) { btn = '<button type="button" class="btn head-btn" data-act="' + map[S.phase][0] + '">' + map[S.phase][1] + '</button>'; }
    }
    var tools = '';
    if (me.role === 'player') {
      var opts = '';
      Object.keys(S.units).forEach(function (id) {
        if (S.units[id].side === 'ally') { opts += '<option value="' + esc(id) + '"' + (me.unitId === id ? ' selected' : '') + '>' + esc(S.units[id].name) + '</option>'; }
      });
      tools += '<label class="inline">操作キャラ<select data-change="unit"><option value="">選択</option>' + opts + '</select></label>';
    }
    var modes = me.role === 'player' ? [['all', '矢印:全員'], ['mine', '自分のみ'], ['off', 'なし']] : [['all', '矢印:表示'], ['off', 'なし']];
    tools += '<span class="seg">' + modes.map(function (m) {
      return '<button type="button" class="seg-b' + (ctx.arrowMode === m[0] ? ' on' : '') + '" data-act="arrows" data-mode="' + m[0] + '">' + m[1] + '</button>';
    }).join('') + '</span><button type="button" class="btn small ghost" data-act="log-toggle">ログ</button>';
    return '<div class="head-main"><b class="title">戦闘卓</b><span class="room">部屋 ' + esc(me.room) + '</span></div>' +
      '<div class="head-center">ラウンド ' + S.round + ' ・ ' + PHASE_LABEL[S.phase] + '</div>' +
      '<div class="head-right">' + tools + count + btn + '<span class="chip">' + ROLE_LABEL[me.role] + '</span>' +
      '<span class="chip conn ' + ctx.conn + '">' + (ctx.mode === 'firebase' ? (ctx.conn === 'online' ? '接続中' : '切断') : 'ローカル') + '</span>' +
      '<button type="button" class="btn small ghost" data-act="leave">退室</button></div>';
  }

  function viewPanel() { return ''; }

  function skillRow(S, u, key, card, ch, editable) {
    var sk = card && card.skill;
    var active = ch.sel === key;
    var sin = sk && L.SINS[sk.sin] ? L.SINS[sk.sin].label : '';
    var phys = sk ? L.PHYS[sk.phys] || '' : '';
    var kind = sk && sk.kind !== 'attack' ? kindLabel(sk) : '';
    var sub = [kind, phys, sin].filter(function (x) { return x; }).join('・');
    var nums = sk ? '基礎' + L.num(sk.base, 0) + ' ＋ コイン ' + A(sk.coins).map(function (c) { return '+' + c; }).join(' ') : '';
    var no = key === 'def' ? 'スキル0' : 'スキル' + (card && card.num ? card.num : '');
    return '<button type="button" class="srow' + (active ? ' picked' : '') + '" data-act="sel" data-sel="' + key + '"' + (editable && sk ? '' : ' disabled') + ' style="--c: ' + sinColor(sk && sk.sin) + ';">' +
      '<span class="s-top"><b>' + esc(sk ? sk.name : '-') + '</b><span class="s-no">' + esc(no) + '</span>' + (active ? '<span class="s-pick">選択中</span>' : '') + '</span>' +
      '<span class="s-sub">' + esc(sub) + (sub && nums ? ' ／ ' : '') + esc(nums) + '</span>' +
      (active && sk && sk.text ? '<span class="s-text">' + esc(sk.text).replace(/\n/g, '<br>') + '</span>' : '') + '</button>';
  }

  function skillPopup(S, ctx) {
    var me = ctx.me;
    var u = S.units[me.unitId];
    if (!u || u.dead || L.incap(u) || S.phase !== 'player') { return ''; }
    var hand = L.handOf(S, u);
    var ch = u.choice || {};
    var html = '<h3><span>' + esc(u.name) + ' のスキル</span><span class="h-spd">速度 ' + L.num(u.spd, 0) + '</span></h3>';
    html += skillRow(S, u, 'c0', hand.sel[0], ch, true) + skillRow(S, u, 'c1', hand.sel[1], ch, true) + skillRow(S, u, 'def', hand.def, ch, true);
    if (hand.preview && hand.preview.skill) {
      html += '<p class="note">次のカード: ' + esc(hand.preview.skill.name) + ' (スキル' + hand.preview.num + ')</p>';
    }
    return html;
  }

  function playerPanel() { return ''; }

  var RES_DIR = 'image/icon/sin/';

  function passiveItems(S, key) {
    var allies = [];
    var out = [];
    Object.keys(S.units).forEach(function (id) {
      if (S.units[id].side === 'ally') { allies.push(S.units[id]); }
    });
    allies.sort(function (a, b) { return a.ord - b.ord; });
    allies.forEach(function (u) {
      A(u[key]).forEach(function (p, i) { if (p) { out.push({ u: u, p: p, i: i }); } });
    });
    return out;
  }

  function passiveHtml(S, it, key) {
    var ok = L.passiveOk(S, it.p);
    var initial = Array.from(String(it.u.name || '?'))[0];
    var inner = it.p.icon ? '<img src="' + esc(it.p.icon) + '" alt="">' : '<span>' + esc(initial) + '</span>';
    return '<button type="button" class="pv-item' + (ok ? '' : ' off') + '" data-act="info-passive" data-ref="' + esc(it.u.id + '|' + key + '|' + it.i) + '" title="' + esc(it.p.name || '') + '">' + inner + '</button>';
  }

  function leftBar(S) {
    var html = '';
    ['passives', 'supportPassives'].forEach(function (key) {
      var items = passiveItems(S, key);
      if (!items.length) { return; }
      html += '<div class="bracket pv-list">' + items.map(function (it) { return passiveHtml(S, it, key); }).join('') + '</div>';
    });
    return html;
  }

  function rightBar(S) {
    if (!Object.keys(S.units).length) { return ''; }
    return '<div class="bracket res-list">' + L.RES_ORDER.map(function (k) {
      var label = L.SINS[k].label;
      return '<div class="res-item" title="' + esc(label) + '"><img src="' + RES_DIR + k + '.png" alt="' + esc(label) + '"><span class="res-n">' + L.resOf(S, k) + '</span></div>';
    }).join('') + '</div>';
  }

  function passivePopup(S, ref) {
    var s = String(ref || '').split('|');
    var u = S.units[s[0]];
    var p = u && A(u[s[1]])[Number(s[2])];
    if (!p) { return ''; }
    var kind = s[1] === 'supportPassives' ? 'サポートパッシブ' : 'パッシブ';
    var need = O(p.need);
    var conds = L.RES_ORDER.filter(function (k) { return L.num(need[k], 0) > 0; }).map(function (k) {
      return esc(L.SINS[k].label) + '×' + L.num(need[k], 0) + '(現在 ' + L.resOf(S, k) + ')';
    });
    var html = '<h3>' + esc(p.name || kind) + '</h3><div class="line">' + esc(u.name) + ' / ' + kind + '</div>';
    if (conds.length) { html += '<div class="line">発動条件: ' + conds.join(' ') + ' 保有 ' + (L.passiveOk(S, p) ? '(達成)' : '(未達成)') + '</div>'; }
    if (p.text) { html += '<p class="note">' + esc(p.text).replace(/\n/g, '<br>') + '</p>'; }
    return html;
  }

  function dock(S, ctx) {
    var me = ctx.me;
    if (me.role !== 'player' || S.phase !== 'player') { return ''; }
    var u = S.units[me.unitId];
    if (!u || u.dead || L.incap(u)) { return ''; }
    var ch = u.choice || {};
    var hint = ch.confirmed ? '確定済みです' : '自分の駒を押してスキルを選び、敵の駒を押して対象を決めます';
    var btn = ch.confirmed
      ? '<button type="button" class="btn confirm" data-act="unconfirm">確定を取り消す</button>'
      : '<button type="button" class="btn confirm primary" data-act="confirm"' + (L.canConfirm(S, u) ? '' : ' disabled') + '>確定する</button>';
    return '<span class="dock-hint">' + esc(u.name) + ' ／ ' + hint + '</span>' + btn;
  }

  root.LCUI = {
    esc: esc, stage: stage, head: head, viewPanel: viewPanel, playerPanel: playerPanel, skillPopup: skillPopup, dock: dock, gmPanel: gmPanel, toolsPanel: toolsPanel, planList: planList, logHtml: logHtml,
    leftBar: leftBar, rightBar: rightBar, passivePopup: passivePopup,
    partPopup: partPopup, unitPopup: unitPopup, piecePopup: piecePopup, allyPiecePopup: allyPiecePopup, PHASE_LABEL: PHASE_LABEL
  };
}(typeof self !== 'undefined' ? self : this));
