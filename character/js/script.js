(function (root) {
  'use strict';

  var FIREBASE_VERSION = '10.12.2';
  var RANKS = ['ZAYIN', 'TETH', 'HE', 'WAW', 'ALEPH'];
  var RESIST_TYPES = ['slash', 'pierce', 'blunt'];
  var TAG_COLOR = { 1: 'blue', 2: 'red', 3: 'yellow' };
  var ROMAN = { 1: 'I', 2: 'II', 3: 'III' };
  var STATUS = {
    'sinking': '沈潜',
    'power-down': '威力減少'
  };
  var PHYS_NAMES = { slash: '斬撃', pierce: '貫通', blunt: '打撃', evade: '回避', guard: '防御' };
  var TAB_NAMES = { overview: '概要', skill: 'スキル', ego: 'E.G.O' };
  var PANEL_NAMES = { desc: '説明', memo: 'メモ' };
  var ICON_BACK = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" aria-hidden="true"><path d="M20 12H5M11 5l-7 7 7 7"/></svg>';
  var ICON_DESC = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5v13c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"/><path d="M12 6v13"/></svg>';
  var ICON_MEMO = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M5 20l1-4 10.5-10.5a2 2 0 012.8 0l.2.2a2 2 0 010 2.8L9 19z"/><path d="M14.5 7.5l3 3"/></svg>';
  var ICON_CLOSE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>';

  var body = document.body;
  var charId = body.getAttribute('data-prisoner');
  var base = body.getAttribute('data-base') || '../../';
  var appEl = document.getElementById('app');
  var cfg = root.LC_FIREBASE_CONFIG;
  var firebaseUsable = !!(cfg && cfg.apiKey && cfg.databaseURL);

  var state = {
    prisoner: null,
    identities: {},
    egos: {},
    remote: {},
    roles: { admin: false, gm: false, player: false },
    tab: 'overview',
    sub: 0,
    passive: false,
    panel: '',
    editing: false,
    saving: false,
    status: ''
  };

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function img(path, cls, alt) {
    return '<img class="' + cls + '" alt="' + esc(alt || '') + '" src="' + esc(base + path) + '">';
  }

  function loadJson(path) {
    return fetch(base + path).then(function (res) {
      if (!res.ok) { throw new Error(path + ' を読み込めませんでした(' + res.status + ')'); }
      return res.json();
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('読み込めませんでした: ' + src)); };
      document.head.appendChild(s);
    });
  }

  function canEditText() {
    return state.roles.admin || state.roles.player;
  }

  function equipment() {
    var p = state.prisoner;
    var def = p.default || {};
    var remote = state.remote || {};
    var identityId = remote.identity;
    if (!identityId || p.identities.indexOf(identityId) < 0 || !state.identities[identityId]) { identityId = def.identity; }
    var egos = {};
    RANKS.forEach(function (rank) {
      var rid = remote.egos && remote.egos[rank];
      var ok = rid && p.egos.indexOf(rid) >= 0 && state.egos[rid] && state.egos[rid].rank === rank;
      if (!ok) { rid = def.egos && def.egos[rank]; }
      egos[rank] = rid && state.egos[rid] ? state.egos[rid] : null;
    });
    return { identity: state.identities[identityId], egos: egos };
  }

  function piece(o) {
    var dir = 'image/skill/' + o.sin + '/';
    var h = '<div class="piece" aria-hidden="true">' +
      img(dir + 's' + o.tier + '-bg.png', 'piece-bg') +
      img('image/skill/skill-base.png', 'piece-base' + (o.tier === 1 ? ' is-first' : '')) +
      img('image/icon/' + o.type + '.png', 'piece-icon i-' + o.type) +
      img(dir + 's' + o.tier + '.png', 'piece-orn');
    if (o.tag != null) {
      var text = '+' + o.tag;
      h += '<span class="piece-tag is-' + o.color + (text.length > 2 ? ' is-wide' : '') + '">' + esc(text) + '</span>';
    }
    return h + '</div>';
  }

  function coinsHtml(n) {
    var h = '';
    for (var i = 0; i < n; i++) { h += img('image/skill/coin.png', 'coin'); }
    return '<div class="coins" aria-hidden="true">' + h + '</div>';
  }

  function skillUnit(o) {
    return '<div class="skill-unit" role="group" aria-label="' + esc(o.aria) + '">' +
      '<div class="skill-main">' +
      '<span class="skill-base" aria-hidden="true">' + esc(o.base) + '</span>' +
      piece(o.piece) +
      '<span class="skill-mult" aria-hidden="true">' + esc(o.mult) + '</span>' +
      '</div>' +
      coinsHtml(o.coins) +
      '<div class="skill-label">' + esc(o.label) + '</div>' +
      '</div>';
  }

  function skillsHtml(identity) {
    var h = '';
    identity.skills.forEach(function (s) {
      var deck = 4 - s.tier;
      h += skillUnit({
        aria: 'スキル' + s.tier + ' 基礎威力' + s.base + ' コイン威力+' + s.coin + ' コイン' + s.coins + '枚 山札' + deck + '枚',
        base: s.base,
        mult: '×' + deck,
        coins: s.coins,
        label: ROMAN[s.tier] || String(s.tier),
        piece: { sin: s.sin, tier: s.tier, type: s.type, tag: s.coin, color: TAG_COLOR[s.tier] || 'yellow' }
      });
    });
    var d = identity.defense;
    if (d) {
      h += skillUnit({
        aria: '守備 基礎威力' + d.base + ' コイン威力+' + d.coin + ' コイン' + d.coins + '枚',
        base: d.base,
        mult: '',
        coins: d.coins,
        label: 'DEFENSE',
        piece: { sin: d.sin, tier: 1, type: d.type, tag: d.coin, color: 'yellow' }
      });
    }
    return h;
  }

  function scrollWrap(inner) {
    return '<div class="scroll-wrap"><div class="scroll">' + inner + '</div></div>';
  }

  function skillItems(identity) {
    var items = [];
    identity.skills.forEach(function (s) {
      items.push({
        tab: 'スキル' + s.tier,
        name: s.name,
        sin: s.sin,
        type: s.type,
        base: s.base,
        coin: s.coin,
        coins: s.coins,
        deck: 4 - s.tier,
        piece: { sin: s.sin, tier: s.tier, type: s.type, tag: s.coin, color: TAG_COLOR[s.tier] || 'yellow' },
        effects: s.effects || [],
        defense: false
      });
    });
    var d = identity.defense;
    if (d) {
      items.push({
        tab: '守備',
        name: d.name,
        sin: d.sin,
        type: d.type,
        base: d.base,
        coin: d.coin,
        coins: d.coins,
        deck: 0,
        piece: { sin: d.sin, tier: 1, type: d.type, tag: d.coin, color: 'yellow' },
        effects: d.effects || [],
        defense: true
      });
    }
    return items;
  }

  function effectHtml(e) {
    var label = STATUS[e.status] || e.status || '';
    var kw = e.status
      ? '<span class="kw is-' + esc(e.status) + '">' + img('image/icon/status/' + e.status + '.png', 'kw-icon') + esc(label) + '</span>'
      : '';
    return '<div class="effect">' +
      img('image/icon/coin/' + e.coin + '.png', 'effect-coin', 'コイン' + e.coin) +
      '<span class="effect-text">' +
      (e.timing ? '<span>[' + esc(e.timing) + ']</span>' : '') +
      kw +
      (e.text ? '<span>' + esc(e.text) + '</span>' : '') +
      '</span></div>';
  }

  function passiveHtml(label, p) {
    return '<section class="passive" aria-label="' + label + '">' +
      '<div class="passive-kind">' + label + '</div>' +
      '<div class="passive-name"><span class="ribbon is-' + esc(p.sin) + '">' + esc(p.name) + '</span></div>' +
      '<div class="passive-have">' + img('image/icon/sin/' + p.sin + '.png', 'passive-sin') + '<span>×' + esc(p.count) + ' 保有</span></div>' +
      '<p class="passive-text">' + esc(p.text) + '</p>' +
      '</section>';
  }

  function passiveTabHtml(identity, subs) {
    var h = '';
    if (identity.passive) { h += passiveHtml('パッシブ', identity.passive); }
    if (identity.support) { h += passiveHtml('サポートパッシブ', identity.support); }
    return '<div class="skill-tab">' +
      '<div class="subtabs" role="group" aria-label="スキルの切り替え">' + subs + '</div>' +
      scrollWrap('<div class="passives">' + h + '</div>') +
      '</div>';
  }

  function skillTabHtml(identity) {
    var items = skillItems(identity);
    if (state.sub >= items.length) { state.sub = 0; }
    var cur = items[state.sub];
    var subs = '';
    items.forEach(function (it, i) {
      subs += '<button class="subtab" type="button" aria-pressed="' + (!state.passive && i === state.sub) + '" data-act="sub" data-sub="' + i + '">' + esc(it.tab) + '</button>';
    });
    if (state.passive) { return passiveTabHtml(identity, subs); }
    var detail = '<div class="detail">' +
      '<span class="detail-base" aria-label="基礎威力">' + esc(cur.base) + '</span>' +
      '<div class="detail-piece">' + piece(cur.piece) + '</div>' +
      '<div class="detail-info">' +
      coinsHtml(cur.coins) +
      '<div class="detail-line"><span class="ribbon is-' + esc(cur.sin) + '">' + esc(cur.name) + '</span>' +
      (cur.defense ? '' : '<span class="detail-deck" aria-label="山札の枚数">×' + cur.deck + '</span>') + '</div>' +
      '<div class="detail-line">' + img('image/icon/' + cur.type + '.png', 'detail-phys', PHYS_NAMES[cur.type] || '') +
      (cur.defense ? '' : '<span class="detail-weight">攻撃加重値<i aria-label="1"></i></span>') + '</div>' +
      '</div></div>';
    var effects = '';
    if (cur.effects.length) {
      cur.effects.forEach(function (e) { effects += effectHtml(e); });
      effects = '<div class="effects">' + effects + '</div>';
    } else {
      effects = '<div class="effects-none">コイン効果はありません。</div>';
    }
    return '<div class="skill-tab">' +
      '<div class="subtabs" role="group" aria-label="スキルの切り替え">' + subs + '</div>' +
      scrollWrap(detail + effects) +
      '</div>';
  }

  function egoUnit(rank, ego) {
    var cls = 'ego-unit' + (ego ? ' is-on' : '');
    var h = '<div class="' + cls + '" role="group" aria-label="' + esc(rank + ' ' + (ego ? ego.name : '未装備')) + '">';
    if (ego) {
      h += piece({ sin: ego.sin, tier: 3, type: ego.type });
    } else {
      h += '<div class="piece is-empty">' + img('image/skill/empty-action.png', 'piece-empty') + '</div>';
    }
    h += '<div class="rank is-' + rank.toLowerCase() + '">' + esc(rank) + '</div>';
    h += '<div class="ego-name' + (ego ? '' : ' is-none') + '">' + esc(ego ? ego.name : '-') + '</div>';
    return h + '</div>';
  }

  function resistHtml(identity) {
    var h = '';
    RESIST_TYPES.forEach(function (t) {
      var m = identity.resist && identity.resist[t] != null ? identity.resist[t] : 1;
      var kind = m > 1 ? 'weak' : (m < 1 ? 'strong' : 'normal');
      var label = m > 1 ? '脆弱' : (m < 1 ? '耐性' : '普通');
      h += '<div class="resist is-' + kind + '" role="group" aria-label="' + t + ' ' + label + ' ×' + m + '">' +
        img('image/icon/' + t + '.png', 'resist-icon') +
        '<div class="resist-text"><div class="resist-label">' + label + '</div><div class="resist-mult">[x' + m + ']</div></div>' +
        '</div>';
    });
    return h;
  }

  function speedText(identity) {
    var s = identity.speed || [];
    return s[0] === s[1] || s[1] == null ? String(s[0]) : s[0] + ' - ' + s[1];
  }

  function panelHtml() {
    if (!state.panel) { return ''; }
    var title = PANEL_NAMES[state.panel];
    var text = state.remote[state.panel] || '';
    var h = '<div class="panel" role="dialog" aria-label="' + title + '">' +
      '<div class="panel-head"><h2>' + title + '</h2>' +
      '<button class="panel-close" type="button" aria-label="閉じる" data-act="close">' + ICON_CLOSE + '</button></div>';
    if (state.editing) {
      h += '<label class="panel-label" for="panel-text">' + title + 'を入力</label>' +
        '<textarea id="panel-text" class="panel-text">' + esc(text) + '</textarea>' +
        '<div class="panel-actions">' +
        '<button class="panel-btn" type="button" data-act="cancel"' + (state.saving ? ' disabled' : '') + '>キャンセル</button>' +
        '<button class="panel-btn is-primary" type="button" data-act="save"' + (state.saving ? ' disabled' : '') + '>保存</button>' +
        '</div>';
    } else {
      h += '<div class="panel-body">' + (text ? esc(text) : '<span class="panel-empty">まだ書かれていません。</span>') + '</div>';
      if (canEditText()) {
        h += '<div class="panel-actions"><button class="panel-btn" type="button" data-act="edit">編集</button></div>';
      }
    }
    if (state.status) { h += '<p class="panel-status">' + esc(state.status) + '</p>'; }
    return h + '</div>';
  }

  function render() {
    var p = state.prisoner;
    var eq = equipment();
    var identity = eq.identity;
    var egoRow = '';
    RANKS.forEach(function (rank) { egoRow += egoUnit(rank, eq.egos[rank]); });

    var tabContent;
    if (state.tab === 'overview') {
      tabContent = scrollWrap('<div class="ego-row">' + egoRow + '</div>' +
        '<div class="divider" aria-hidden="true"></div>' +
        '<div class="skill-row">' + skillsHtml(identity) + '</div>');
    } else if (state.tab === 'skill') {
      tabContent = skillTabHtml(identity);
    } else {
      tabContent = '<div class="tab-note">E.G.Oタブ(ランクごとの詳細)は、これから作ります。</div>';
    }

    var tabs = '';
    ['overview', 'skill', 'ego'].forEach(function (t) {
      tabs += '<button class="tab is-' + t + '" type="button" aria-pressed="' + (state.tab === t) + '" data-act="tab" data-tab="' + t + '">' + TAB_NAMES[t] + '</button>';
    });

    appEl.innerHTML =
      '<div class="sheet">' +
      '<section class="stage" aria-label="囚人表示" style="background-image: url(\'' + esc(base + p.background) + '\')">' +
      img(p.portrait, 'stage-portrait', p.name + 'の立ち絵') +
      '<div class="stage-shade" aria-hidden="true"></div>' +
      '<div class="stage-edge" aria-hidden="true"></div>' +
      '<nav class="side-nav" aria-label="補助機能">' +
      '<a class="side-btn is-back" href="' + esc(base + 'character/') + '" aria-label="ハブへ戻る">' + ICON_BACK + '</a>' +
      '<button class="side-btn" type="button" aria-label="説明" aria-pressed="' + (state.panel === 'desc') + '" data-act="panel" data-panel="desc">' + ICON_DESC + '</button>' +
      '<button class="side-btn" type="button" aria-label="メモ" aria-pressed="' + (state.panel === 'memo') + '" data-act="panel" data-panel="memo">' + ICON_MEMO + '</button>' +
      '</nav>' +
      panelHtml() +
      '<div class="stage-info">' +
      '<div><div class="info-chip">ステータス</div><div class="status-row">' +
      '<div class="status" role="group" aria-label="体力 ' + esc(identity.hp) + '">' + img('image/icon/hp.png', 'status-icon') + '<span class="status-num">' + esc(identity.hp) + '</span></div>' +
      '<div class="status" role="group" aria-label="速度 ' + esc(speedText(identity)) + '">' + img('image/icon/speed.png', 'status-icon') + '<span class="status-num">' + esc(speedText(identity)) + '</span></div>' +
      '</div></div>' +
      '<div><div class="info-chip">耐性情報</div><div class="resist-row">' + resistHtml(identity) + '</div></div>' +
      '</div>' +
      '</section>' +
      '<main class="main">' +
      '<header class="head">' +
      '<div class="head-ghost" aria-hidden="true">' + esc(p.name) + '</div>' +
      '<div class="head-body">' +
      '<div class="head-top">' +
      '<div class="head-affiliation">' + esc(identity.affiliation || '') + '</div>' +
      (identity.rarity != null ? img('image/icon/rarity/' + identity.rarity + '.png', 'head-rarity', 'レアリティ') : '') +
      '</div>' +
      '<div class="head-identity">' +
      '<div class="head-icon">' + img(p.icon, 'head-icon-img', p.name + 'のアイコン') + '</div>' +
      '<div class="head-banner">' + esc(identity.name) + '</div>' +
      '</div>' +
      '</div>' +
      '</header>' +
      '<div class="tabs" role="group" aria-label="表示切り替え">' + tabs + '</div>' +
      (state.tab === 'skill' && (identity.passive || identity.support)
        ? '<button class="passive-btn" type="button" aria-pressed="' + state.passive + '" data-act="passive">パッシブ</button>'
        : '') +
      '<section class="content">' + tabContent + '</section>' +
      '</main>' +
      '</div>';
  }

  function showError(message) {
    appEl.innerHTML = '<div class="load-error">' + esc(message) + '</div>';
  }

  function textareaValue() {
    var el = document.getElementById('panel-text');
    return el ? el.value : '';
  }

  function save() {
    if (!state.db || state.saving) { return; }
    var key = state.panel;
    state.saving = true;
    state.status = '保存しています…';
    render();
    state.db.ref('characters/' + charId + '/' + key).set(textareaValue()).then(function () {
      state.saving = false;
      state.editing = false;
      state.status = '';
      render();
    }, function (e) {
      state.saving = false;
      state.status = '保存できませんでした。' + (e && e.message ? e.message : '');
      render();
    });
  }

  function onClick(e) {
    var el = e.target.closest('[data-act]');
    if (!el || !appEl.contains(el)) { return; }
    var act = el.getAttribute('data-act');
    if (act === 'tab') {
      state.tab = el.getAttribute('data-tab');
    } else if (act === 'sub') {
      state.sub = Number(el.getAttribute('data-sub')) || 0;
      state.passive = false;
    } else if (act === 'passive') {
      state.passive = !state.passive;
    } else if (act === 'panel') {
      var name = el.getAttribute('data-panel');
      state.panel = state.panel === name ? '' : name;
      state.editing = false;
      state.status = '';
    } else if (act === 'close') {
      state.panel = '';
      state.editing = false;
      state.status = '';
    } else if (act === 'edit') {
      state.editing = true;
      state.status = '';
    } else if (act === 'cancel') {
      state.editing = false;
      state.status = '';
    } else if (act === 'save') {
      save();
      return;
    }
    render();
  }

  function readRole(db, path, test) {
    return db.ref(path).once('value').then(function (snap) { return test(snap.val()); }, function () { return false; });
  }

  function onUser(db, user) {
    if (!user || user.isAnonymous) {
      state.roles = { admin: false, gm: false, player: false };
      if (!state.editing) { render(); }
      return;
    }
    Promise.all([
      readRole(db, 'admin/' + user.uid, function (v) { return v === true; }),
      readRole(db, 'gm/' + user.uid, function (v) { return v === true; }),
      readRole(db, 'player/' + user.uid, function (v) { return v === charId; })
    ]).then(function (r) {
      state.roles = { admin: r[0], gm: r[1], player: r[2] };
      if (!state.editing) { render(); }
    });
  }

  function initFirebase() {
    if (!firebaseUsable) { return; }
    var url = 'https://www.gstatic.com/firebasejs/' + FIREBASE_VERSION + '/';
    loadScript(url + 'firebase-app-compat.js')
      .then(function () { return loadScript(url + 'firebase-database-compat.js'); })
      .then(function () { return loadScript(url + 'firebase-auth-compat.js'); })
      .then(function () {
        var fb = root.firebase;
        var app = fb.apps && fb.apps.length ? fb.apps[0] : fb.initializeApp(cfg);
        var db = fb.database(app);
        state.db = db;
        db.ref('characters/' + charId).on('value', function (snap) {
          state.remote = snap.val() || {};
          if (!state.editing) { render(); }
        }, function (e) {
          state.status = '保存済みのデータを読み込めませんでした。' + (e && e.message ? e.message : '');
        });
        fb.auth(app).onAuthStateChanged(function (user) { onUser(db, user); });
      })
      .catch(function (e) { state.status = e.message; });
  }

  function init() {
    if (!charId) { showError('囚人が指定されていません。'); return; }
    Promise.all([loadJson('data/prisoners.json'), loadJson('data/' + charId + '/identities.json'), loadJson('data/' + charId + '/egos.json')])
      .then(function (r) {
        state.prisoner = r[0][charId];
        state.identities = r[1];
        state.egos = r[2];
        if (!state.prisoner) { throw new Error('囚人「' + charId + '」のデータがありません。'); }
        document.title = state.prisoner.name + ' | キャラクターシート | LCBTRPG';
        appEl.addEventListener('click', onClick);
        render();
        initFirebase();
      })
      .catch(function (e) { showError(e.message); });
  }

  init();
}(typeof self !== 'undefined' ? self : this));
