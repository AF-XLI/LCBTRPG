(function () {
  'use strict';

  var L = window.LC;
  var UI = window.LCUI;
  var A = L.A;
  var O = L.O;

  var $ = function (id) { return document.getElementById(id); };
  var S = L.newState();
  var BASE = {};
  var store = null;
  var mode = 'local';
  var conn = 'online';
  var me = null;
  var auto = false;
  var autoTimer = null;
  var arrowMode = 'all';
  var manualTarget = '';
  var lastFxSeq = null;
  var firstState = true;
  var popupState = null;
  var pressed = {};
  var retarget = false;
  var gmPick = null;
  var scrollKey = '';
  var logOpen = false;
  var prevPhase = null;
  var sideOpen = null;

  function loadMe() {
    var q = new URLSearchParams(location.search);
    var saved = null;
    try { saved = JSON.parse(sessionStorage.getItem('lc-me') || 'null'); } catch (e) { saved = null; }
    if (saved && saved.role === 'kp') { saved.role = 'gm'; }
    if (saved && saved.room && !q.get('room')) { return saved; }
    if (q.get('room')) { return { room: q.get('room'), role: (saved && saved.role) || 'player', unitId: (saved && saved.unitId) || '' }; }
    return null;
  }
  function saveMe() {
    try { sessionStorage.setItem('lc-me', JSON.stringify(me)); } catch (e) { /* 保存できなくても動作は続ける */ }
  }

  function rng() { return Math.random(); }

  function onState(raw) {
    var n = L.normalize(raw || {});
    BASE = L.clone(n);
    S = Object.assign(L.newState(), n);
    S.units = S.units || {};
    S.pieces = A(S.pieces);
    S.plan = A(S.plan);
    S.log = A(S.log);
    S.fx = S.fx || { seq: 0, items: [] };
    S.fx.items = A(S.fx.items);
    render();
  }

  function commit(fn) {
    if (!store) { return; }
    var next = L.clone(S);
    fn(next, rng);
    var patch = window.LCStore.diffPatch(BASE, next, 3);
    if (!Object.keys(patch).length) { return; }
    BASE = L.clone(next);
    S = next;
    render();
    store.write(patch);
  }

  function ctxOf() {
    var u = me.unitId ? S.units[me.unitId] : null;
    var isGm = me.role === 'gm';
    var ctx = {
      me: me, mode: mode, conn: conn, auto: auto, arrowMode: arrowMode, manualTarget: manualTarget, pressed: pressed, canSetTarget: false, gmPick: gmPick,
      canSeeEnemySpeed: isGm,
      pairs: null, targeting: false, selectedPid: null
    };
    ctx.pairs = S.phase === 'process' && S.proc && S.proc.pairs ? S.proc.pairs : L.computePairs(S);
    if (me.role === 'player' && u && !u.dead && !L.incap(u) && S.phase === 'player' && u.choice && u.choice.sel && u.choice.sel !== 'stag') {
      var sk = L.chosenSkill(S, u);
      var isDefSel = !!(sk && sk.kind === 'defense');
      ctx.targeting = !!(sk && (sk.kind === 'attack' || isDefSel || sk.kind === 'counter'));
      ctx.targetAttackOnly = isDefSel || !!(sk && sk.kind === 'counter');
      ctx.selectedPid = u.choice.target || null;
      ctx.canSetTarget = ctx.targeting && (retarget || !ctx.selectedPid);
    }
    return ctx;
  }

  function setHtml(el, html) {
    if (el.innerHTML === html) { return; }
    var ae = document.activeElement;
    if (ae && el.contains(ae) && /^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName) && ae.type !== 'button') { return; }
    el.innerHTML = html;
  }

  function render() {
    if (!me) { return; }
    var ctx = ctxOf();
    setHtml($('head'), UI.head(S, ctx));
    var keep = {};
    ['enemies', 'allies'].forEach(function (k) {
      var r = $('stage').querySelector('.row.' + k);
      if (r) { keep[k] = r.scrollLeft; }
    });
    setHtml($('stage'), UI.stage(S, ctx));
    setHtml($('sideL'), UI.leftBar(S, ctx));
    setHtml($('sideR'), UI.rightBar(S, ctx));
    $('sideL').hidden = !$('sideL').innerHTML;
    $('sideR').hidden = !$('sideR').innerHTML;
    $('sideL').classList.toggle('open', sideOpen === 'L');
    $('sideR').classList.toggle('open', sideOpen === 'R');
    var key = S.round + '|' + (me.unitId || '') + '|' + Object.keys(S.units).length;
    var fresh = key !== scrollKey && !!$('stage').querySelector('.row');
    if (fresh) { scrollKey = key; }
    ['enemies', 'allies'].forEach(function (k) {
      var r = $('stage').querySelector('.row.' + k);
      if (!r) { return; }
      if (fresh) {
        var mine = k === 'allies' && me.unitId ? r.querySelector('.ally[data-tok="' + me.unitId + '"]') : null;
        r.scrollLeft = mine ? mine.offsetLeft - (r.clientWidth - mine.offsetWidth) / 2 : (r.scrollWidth - r.clientWidth) / 2;
      } else if (keep[k] !== undefined) {
        r.scrollLeft = keep[k];
      }
    });
    setHtml($('panel'), me.role === 'player' ? UI.playerPanel(S, ctx) : UI.gmPanel(S, ctx));
    setHtml($('plan'), UI.planList(S, ctx));
    setHtml($('gmtools'), UI.toolsPanel(S, ctx));
    $('panel').hidden = !$('panel').innerHTML;
    $('plan').hidden = !$('plan').innerHTML;
    $('gmtools').hidden = !$('gmtools').innerHTML;
    setHtml($('dock'), UI.dock(S, ctx));
    $('dock').hidden = !$('dock').innerHTML;
    if (prevPhase !== null && prevPhase !== 'process' && S.phase === 'process') { logOpen = true; }
    prevPhase = S.phase;
    var logEl = $('logwin');
    logEl.hidden = !logOpen;
    if (logOpen) {
      var before = logEl.querySelector('.log-body');
      var atBottom = !before || before.scrollTop + before.clientHeight >= before.scrollHeight - 8;
      setHtml(logEl, '<div class="lw-head"><b>ログ(ラウンド ' + S.round + ')</b><button type="button" class="btn small ghost" data-act="log-toggle">閉じる</button></div>' + UI.logHtml(S));
      var body = logEl.querySelector('.log-body');
      if (body && atBottom) { body.scrollTop = body.scrollHeight; }
    }
    document.body.dataset.phase = S.phase;
    drawArrows(ctx);
    playFx();
    updateAuto();
    refreshPopup();
  }

  function playFx() {
    var seq = S.fx ? S.fx.seq : 0;
    if (firstState) { firstState = false; lastFxSeq = seq; return; }
    if (seq === lastFxSeq) { return; }
    lastFxSeq = seq;
    A(S.fx.items).forEach(function (it, i) {
      var sel = it.p === null || it.p === undefined ? '[data-tok="' + it.u + '"]' : '[data-part="' + it.u + '|' + it.p + '"]';
      var host = document.querySelector('#stage ' + sel);
      if (!host) { return; }
      var span = document.createElement('span');
      span.className = 'fx ' + (it.kind || 'dmg');
      span.textContent = it.text;
      span.style.animationDelay = (i * 0.18) + 's';
      host.appendChild(span);
      setTimeout(function () { if (span.parentNode) { span.parentNode.removeChild(span); } }, 2200 + i * 180);
    });
  }

  function center(el, base) {
    var r = el.getBoundingClientRect();
    return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2, w: r.width, h: r.height };
  }

  function drawArrows(ctx) {
    var svg = $('arrows');
    var wrap = svg.parentNode;
    var base = wrap.getBoundingClientRect();
    svg.setAttribute('width', wrap.scrollWidth);
    svg.setAttribute('height', wrap.scrollHeight);
    svg.setAttribute('viewBox', '0 0 ' + wrap.scrollWidth + ' ' + wrap.scrollHeight);
    if (arrowMode === 'off' || S.phase === 'setup' || S.phase === 'over') { svg.innerHTML = ''; return; }
    var isGm = me.role === 'gm';
    var defs = '';
    var colors = { gold: 'rgb(230, 180, 50)', red: 'rgb(232, 104, 96)', blue: 'rgb(110, 200, 235)' };
    Object.keys(colors).forEach(function (k) {
      defs += '<marker id="ah-' + k + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="' + colors[k] + '"/></marker>';
    });
    var out = '<defs>' + defs + '</defs>';
    function seg(x1, y1, x2, y2, color, dashed, dim) {
      return '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="' + colors[color] + '" stroke-width="2.5"' +
        (dashed ? ' stroke-dasharray="6 5"' : '') + (dim ? ' opacity="0.35"' : '') + ' marker-end="url(#ah-' + color + ')"/>';
    }
    function unit(a, b) {
      var dx = b.x - a.x;
      var dy = b.y - a.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      return { x: dx / len, y: dy / len };
    }
    function line(a, b, color, dashed, dim) {
      var u = unit(a, b);
      return seg(a.x + u.x * 4, a.y + u.y * 4, b.x - u.x * 4, b.y - u.y * 4, color, dashed, dim);
    }
    function meet(ac, pc, cA, cP, dashedA, spark, dim) {
      var mx = (ac.x + pc.x) / 2;
      var my = (ac.y + pc.y) / 2;
      var ua = unit(ac, pc);
      var gap = 3;
      var s = seg(ac.x + ua.x * 4, ac.y + ua.y * 4, mx - ua.x * gap, my - ua.y * gap, cA, dashedA, dim) +
        seg(pc.x - ua.x * 4, pc.y - ua.y * 4, mx + ua.x * gap, my + ua.y * gap, cP, false, dim);
      if (spark) {
        var rays = '';
        for (var i = 0; i < 10; i += 1) {
          var t = Math.PI * 2 * i / 10 + 0.3;
          var r1 = i % 2 ? 6 : 5;
          var r2 = i % 2 ? 12 : 17;
          rays += '<line x1="' + (Math.cos(t) * r1).toFixed(1) + '" y1="' + (Math.sin(t) * r1).toFixed(1) + '" x2="' + (Math.cos(t) * r2).toFixed(1) + '" y2="' + (Math.sin(t) * r2).toFixed(1) + '"/>';
        }
        s += '<g transform="translate(' + mx.toFixed(1) + ' ' + my.toFixed(1) + ')"' + (dim ? ' opacity="0.35"' : '') + '><g class="spark">' + rays + '<circle r="3.5"/></g></g>';
      }
      return s;
    }
    var used = {};
    function tokEl(id) {
      var el = document.querySelector('#stage .ally[data-tok="' + id + '"] .a-piece .p-frame');
      if (!el) { return null; }
      var c = center(el, base);
      var n = used[id] || 0;
      used[id] = n + 1;
      return { x: c.x + (n % 2 ? 1 : -1) * Math.ceil(n / 2) * 12, y: c.y - c.h / 2 - 2 };
    }
    function pieceEl(pid) {
      var el = document.querySelector('#stage [data-piece="' + pid + '"] .p-frame');
      if (!el) { return null; }
      var c = center(el, base);
      return { x: c.x, y: c.y + c.h / 2 + 14 };
    }
    var pairs = ctx.pairs || { matchOf: {} };
    var drawnMatch = {};
    Object.keys(S.units).forEach(function (id) {
      var u = S.units[id];
      if (u.side !== 'ally' || u.dead || L.incap(u) || !u.choice || !u.choice.target) { return; }
      if (S.phase === 'enemy') { return; }
      var sk = L.chosenSkill(S, u);
      if (!sk || (sk.kind !== 'attack' && sk.kind !== 'defense' && sk.kind !== 'counter')) { return; }
      if (arrowMode === 'mine' && me.unitId !== id) { return; }
      var te = tokEl(id);
      var pe = pieceEl(u.choice.target);
      if (!te || !pe) { return; }
      var matched = pairs.matchOf[u.choice.target] === id;
      if (matched) { drawnMatch[u.choice.target] = true; }
      if (matched && sk.kind === 'defense') {
        out += meet(te, pe, 'blue', 'red', false, false, u.choice.defActive);
      } else if (matched) {
        out += meet(te, pe, 'gold', 'gold', false, true, u.choice.acted);
      } else {
        out += line(te, pe, 'blue', false, u.choice.acted);
      }
      if (sk.kind === 'attack') {
        A(u.choice.subs).forEach(function (spid) {
          var se = pieceEl(spid);
          if (se) { out += line(te, se, 'blue', true, u.choice.acted); }
        });
      }
    });
    A(S.pieces).forEach(function (P) {
      if (!P.target || drawnMatch[P.pid]) { return; }
      if (S.phase === 'enemy' && !isGm) { return; }
      var sk = L.pieceSkill(S, P);
      if (!sk || (sk.kind !== 'attack' && sk.kind !== 'defense')) { return; }
      if (arrowMode === 'mine' && me.unitId !== P.target) { return; }
      var te = tokEl(P.target);
      var pe = pieceEl(P.pid);
      if (!te || !pe) { return; }
      out += line(pe, te, 'red', false, P.acted);
      if (sk.kind === 'attack') {
        A(P.subs).forEach(function (aid) {
          var se = tokEl(aid);
          if (se && (arrowMode !== 'mine' || me.unitId === aid)) { out += line(pe, se, 'red', true, P.acted); }
        });
      }
    });
    svg.innerHTML = out;
  }

  function updateAuto() {
    var should = auto && me && me.role === 'gm' && S.phase === 'process';
    if (should && !autoTimer) {
      autoTimer = setInterval(function () {
        if (!auto || S.phase !== 'process') { return; }
        commit(function (s) { L.stepProcess(s, rng); });
      }, 1500);
    }
    if (!should && autoTimer) { clearInterval(autoTimer); autoTimer = null; if (S.phase !== 'process') { auto = false; } }
  }

  function showPopup(kind, id) {
    popupState = { kind: kind, id: id };
    refreshPopup();
  }
  function refreshPopup() {
    var el = $('popup');
    if (!popupState) { el.hidden = true; el.innerHTML = ''; return; }
    var html = '';
    if (popupState.kind === 'part') { html = UI.partPopup(S, popupState.id, ctxOf()); }
    if (popupState.kind === 'unit') { html = UI.unitPopup(S, popupState.id); }
    if (popupState.kind === 'allypiece') { html = UI.allyPiecePopup(S, popupState.id, ctxOf()); }
    if (popupState.kind === 'skill') { html = UI.skillPopup(S, ctxOf()); }
    if (popupState.kind === 'piece') { html = UI.piecePopup(S, popupState.id); }
    if (popupState.kind === 'passive') { html = UI.passivePopup(S, popupState.id); }
    if (!html) { popupState = null; el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    var next = '<div class="popup-card">' + html + '<button type="button" class="btn" data-act="close">閉じる</button></div>';
    if (el.innerHTML !== next) { el.innerHTML = next; }
  }

  function targetRef() {
    var sel = $('mTarget');
    var v = (sel && sel.value) || manualTarget;
    if (!v) { return null; }
    var s = v.split('|');
    return { u: s[0], p: s[1] === '' || s[1] === undefined ? null : Number(s[1]) };
  }

  function readNum(id) {
    var el = $(id);
    if (!el || el.value === '') { return null; }
    var n = Number(el.value);
    return isFinite(n) ? n : null;
  }

  function loadText(text, kindLabel) {
    var parsed = L.parseSetup(text);
    if (parsed.errors.length) { alert(kindLabel + 'の読み込みでエラーがあります。\n' + parsed.errors.join('\n')); return false; }
    commit(function (s) { L.loadUnits(s, parsed.units, rng); });
    return true;
  }

  function fetchJson(url) {
    return fetch(url).then(function (r) { if (!r.ok) { throw new Error(url + ' (' + r.status + ')'); } return r.text(); });
  }

  var actions = {
    close: function () { popupState = null; refreshPopup(); },
    leave: function () {
      if (store) { store.close(); }
      store = null;
      try { sessionStorage.removeItem('lc-me'); } catch (e) { /* 無視 */ }
      location.href = location.pathname;
    },
    noop: function () {},
    'info-part': function (el) { showPopup('part', el.dataset.ref); },
    'info-unit': function (el) { showPopup('unit', el.dataset.id); },
    'info-piece': function (el) { showPopup('piece', el.dataset.pid); },
    'info-passive': function (el) { showPopup('passive', el.dataset.ref); },
    'side-toggle': function (el) { sideOpen = sideOpen === el.dataset.side ? null : el.dataset.side; render(); },
    'm-res': function () {
      var sin = $('mRes').value;
      var v = readNum('mResV');
      if (v === null) { return; }
      commit(function (s) { L.setRes(s, sin, v); });
    },
    press: function (el) {
      var pid = el.dataset.pid;
      var uid = pid.split('|')[0];
      var u = S.units[uid];
      if (u && u.kind === 'abnormality') { pressed[uid] = pressed[uid] === pid ? null : pid; }
      var blank = /\|b$/.test(pid);
      if (!blank) { popupState = { kind: 'piece', id: pid }; }
      render();
    },
    'skill-list': function () { popupState = { kind: 'skill', id: me.unitId }; refreshPopup(); },
    'log-toggle': function () { logOpen = !logOpen; render(); },
    'gm-pick': function (el) {
      var pid = el.dataset.pid;
      var uid = pid.split('|')[0];
      var u = S.units[uid];
      if (u && u.kind === 'abnormality') { pressed[uid] = pid; }
      gmPick = gmPick === pid ? null : pid;
      render();
    },
    'ally-piece': function (el) {
      var id = el.dataset.id;
      var u = S.units[id];
      if (!u) { return; }
      if (me.role === 'gm' && S.phase === 'enemy' && gmPick && !u.dead) {
        var pid = gmPick;
        gmPick = null;
        commit(function (s) { L.setPieceTarget(s, pid, id); });
        return;
      }
      var shown = S.phase !== 'enemy' && !u.dead && !L.incap(u) && u.choice && u.choice.sel && L.chosenSkill(S, u);
      if (shown) { showPopup('allypiece', id); return; }
      if (me.role === 'player' && me.unitId === id && S.phase === 'player' && !u.dead && !L.incap(u)) {
        popupState = { kind: 'skill', id: id };
        refreshPopup();
        return;
      }
      showPopup('unit', id);
    },
    arrows: function (el) { arrowMode = el.dataset.mode; render(); },
    target: function (el) {
      var id = me.unitId;
      var pid = el.dataset.pid;
      var uid = pid.split('|')[0];
      var u = S.units[uid];
      if (u && u.kind === 'abnormality') { pressed[uid] = pid; }
      retarget = false;
      commit(function (s) { L.setTarget(s, id, el.dataset.pid, Date.now()); });
    },
    sel: function (el) {
      var id = me.unitId;
      retarget = true;
      popupState = null;
      commit(function (s) { L.selectChoice(s, id, el.dataset.sel, Date.now()); });
    },
    'gm-confirm': function () {
      var missing = A(S.pieces).filter(function (P) { var sk = L.pieceSkill(S, P); return sk && (sk.kind === 'attack' || sk.kind === 'defense') && !P.target; });
      if (missing.length && !confirm('対象が未設定の敵スキルが ' + missing.length + ' 件あります。このまま確定しますか?(未設定の攻撃・守備は行われません)')) { return; }
      commit(function (s) { L.gmConfirm(s); });
    },
    'load-sample': function () {
      Promise.all([fetchJson('sample/party.json'), fetchJson('sample/enemies.json')]).then(function (r) {
        loadText(r[0], '味方'); loadText(r[1], '敵');
      }).catch(function (e) { alert('サンプルを読み込めませんでした(ファイルを直接開いている場合は、公開したURLからお試しください)。\n' + e.message); });
    },
    'load-allies': function () { var t = $('jsonAllies').value.trim(); if (t) { loadText(t, '味方'); $('jsonAllies').value = ''; } },
    'load-enemies': function () { var t = $('jsonEnemies').value.trim(); if (t) { loadText(t, '敵'); $('jsonEnemies').value = ''; } },
    'slot-move': function (el) { var id = el.dataset.id; var dir = Number(el.dataset.dir); commit(function (s) { L.moveSlot(s, id, dir); }); },
    begin: function () { commit(function (s) { L.beginCombat(s, rng); }); },
    reset: function () {
      if (!confirm('このルームの戦闘データをすべて削除します。よろしいですか?')) { return; }
      auto = false;
      if (store) { store.reset(); }
      S = L.newState();
      BASE = {};
      render();
    },
    'start-process': function () {
      if (!L.allConfirmed(S)) { return; }
      commit(function (s) { L.buildPlan(s, rng); });
    },
    step: function () { commit(function (s) { L.stepProcess(s, rng); }); },
    auto: function () { auto = !auto; render(); },
    finish: function () {
      auto = false;
      commit(function (s) { var n = 0; while (s.phase === 'process' && L.stepProcess(s, rng) && n < 400) { n += 1; } });
    },
    'next-round': function () { commit(function (s) { L.startRound(s, rng); }); },
    'm-hp': function () {
      var ref = targetRef(); var v = readNum('mHp');
      if (!ref || v === null) { return; }
      commit(function (s) {
        var g = L.getB(s, ref); if (!g) { return; }
        var info = L.hpInfo(g.unit, g.part);
        var nv = L.clamp(Math.floor(v), 0, info.max);
        if (g.part && g.unit.kind === 'abnormality') {
          g.unit.hp = L.clamp(g.unit.hp + (nv - g.part.dur), 0, g.unit.maxHp);
          g.part.dur = nv;
          if (nv <= 0 && g.part.destroyable) { g.part.destroyed = true; }
        } else { g.unit.hp = nv; if (nv <= 0) { g.unit.dead = true; } }
        L.log(s, '【手動】' + L.nameOf(s, g.ref) + ' の体力を ' + nv + ' にした');
        L.checkStagger(s, g.ref);
        L.checkEnd(s);
      });
    },
    'm-sp': function () {
      var ref = targetRef(); var v = readNum('mSp');
      if (!ref || v === null) { return; }
      commit(function (s) { var g = L.getB(s, ref); if (g) { g.b.sp = L.clamp(Math.floor(v), L.SP_MIN, L.SP_MAX); L.syncSp(g.unit, g.b.sp); L.log(s, '【手動】' + L.nameOf(s, g.ref) + ' の精神力を ' + g.b.sp + ' にした'); } });
    },
    'm-st-add': function () {
      var ref = targetRef(); var key = $('mSt').value;
      var p = readNum('mP'); var c = readNum('mC');
      if (!ref || !L.STATUS[key]) { return; }
      commit(function (s) {
        var g = L.getB(s, ref); if (!g) { return; }
        var def = L.STATUS[key];
        L.addStatus(g.b, key, def.type === 'pc' ? { p: p || 0, c: c || 0 } : { v: p || 0 });
        L.log(s, '【手動】' + L.nameOf(s, g.ref) + ' に ' + def.label + ' を付与');
      });
    },
    'm-st-del': function () {
      var ref = targetRef(); var key = $('mSt').value;
      if (!ref) { return; }
      commit(function (s) { var g = L.getB(s, ref); if (g && g.b.st) { Object.keys(g.b.st).forEach(function (k) { if (L.statusParts(k).base === key) { delete g.b.st[k]; } }); L.log(s, '【手動】' + L.nameOf(s, g.ref) + ' の ' + L.STATUS[key].label + ' を解除'); } });
    },
    'm-vib': function () { var ref = targetRef(); if (ref) { commit(function (s) { L.vibrationBurst(s, ref, rng); }); } },
    'm-stag-clear': function () { var ref = targetRef(); if (ref) { commit(function (s) { var g = L.getB(s, ref); if (g) { g.b.stagger = null; L.log(s, '【手動】' + L.nameOf(s, g.ref) + ' の混乱を回復'); } }); } },
    'm-revive': function () { var ref = targetRef(); if (ref) { commit(function (s) { L.reviveUnit(s, ref); L.log(s, '【手動】' + L.nameOf(s, ref) + ' が復帰'); }); } },
    'm-ego': function () {
      var ref = targetRef(); if (!ref) { return; }
      var u = S.units[ref.u];
      var egos = A(u && u.egos);
      if (!egos.length) { alert('E.G.Oが登録されていません'); return; }
      var idx = 0;
      if (egos.length > 1) {
        var ans = prompt(egos.map(function (e, i) { return i + ': ' + e.name; }).join('\n') + '\n使用する番号を入力してください', '0');
        if (ans === null) { return; }
        idx = Number(ans) || 0;
      }
      commit(function (s) { L.applyEgo(s, ref.u, idx); });
    },
    'm-flag': function () {
      var ref = targetRef(); var name = $('mFlag').value.trim();
      if (!ref || !name) { return; }
      commit(function (s) { var u = s.units[ref.u]; if (u) { u.flags = u.flags || {}; u.flags[name] = !u.flags[name]; L.log(s, '【手動】' + u.name + ' のフラグ「' + name + '」を ' + (u.flags[name] ? 'ON' : 'OFF') + ' にした'); } });
    }
  };

  var changes = {
    unit: function (el) { me.unitId = el.value; saveMe(); render(); },
    arrows: function (el) { arrowMode = el.value; render(); },
    mtarget: function (el) { manualTarget = el.value; },
    ptarget: function (el) {
      var pid = el.dataset.pid;
      commit(function (s) { L.setPieceTarget(s, pid, el.value || null); });
    },
    pskill: function (el) {
      if (!el.value) { return; }
      var u = el.dataset.u; var p = Number(el.dataset.p);
      var v = el.value;
      commit(function (s) { L.rebuildPiecesFor(s, u, p, v === '-' ? [] : [v]); });
      el.value = '';
    },
    file: function (el) {
      var f = el.files && el.files[0];
      if (!f) { return; }
      var r = new FileReader();
      r.onload = function () { $(el.dataset.to).value = String(r.result); };
      r.readAsText(f);
    }
  };

  document.addEventListener('click', function (ev) {
    if (ev.target.id === 'popup') { actions.close(); return; }
    if (sideOpen && !ev.target.closest('.sidebar')) { sideOpen = null; render(); }
    var el = ev.target.closest('[data-act]');
    if (!el && ev.target.closest('#stage')) {
      var had = Object.keys(pressed).some(function (k) { return pressed[k]; });
      if (had || gmPick) { pressed = {}; gmPick = null; render(); }
      return;
    }
    if (!el || !actions[el.dataset.act]) { return; }
    if (el.disabled) { return; }
    ev.preventDefault();
    actions[el.dataset.act](el);
  });
  document.addEventListener('change', function (ev) {
    var el = ev.target.closest('[data-change]');
    if (el && changes[el.dataset.change]) { changes[el.dataset.change](el); }
  });
  window.addEventListener('resize', function () { if (me) { drawArrows(ctxOf()); } });
  var scrollTick = false;
  $('stage').addEventListener('scroll', function () {
    if (scrollTick || !me) { return; }
    scrollTick = true;
    window.requestAnimationFrame(function () { scrollTick = false; drawArrows(ctxOf()); });
  }, true);
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { actions.close(); } });
  document.addEventListener('contextmenu', function (ev) {
    if (ev.target && ev.target.closest && ev.target.closest('.stage-wrap, .sidebar, #popup')) { ev.preventDefault(); }
  });
  document.addEventListener('dragstart', function (ev) {
    if (ev.target && ev.target.tagName === 'IMG') { ev.preventDefault(); }
  });

  function enter() {
    $('lobby').hidden = true;
    $('main').hidden = false;
    saveMe();
    window.LCStore.create({
      roomId: me.room,
      onState: onState,
      onStatus: function (st, msg) { conn = st === 'online' ? 'online' : 'offline'; if (st === 'error') { alert('接続エラー: ' + msg); } render(); }
    }).then(function (st) {
      store = st;
      mode = st.mode;
      render();
    }).catch(function (e) {
      alert('接続できませんでした。設定を確認してください。\n' + e.message);
      $('lobby').hidden = false;
      $('main').hidden = true;
    });
  }

  function init() {
    me = loadMe();
    $('lobbyMode').textContent = window.LCStore.hasFirebase() ? 'Firebase に接続して共有します。' : 'Firebase が未設定のため、同じブラウザ内(タブ間)のローカル動作になります。';
    if (me && me.room) { enter(); return; }
    $('lobby').hidden = false;
    $('lobbyJoin').addEventListener('click', function () {
      var room = $('lobbyRoom').value.trim().replace(/[.#$\[\]\/]/g, '_');
      if (!room) { alert('ルームIDを入力してください'); return; }
      me = { room: room, role: $('lobbyRole').value, unitId: '' };
      enter();
    });
  }

  init();
}());
