document.addEventListener('contextmenu', function (ev) {
  if (ev.target && ev.target.tagName === 'IMG') { ev.preventDefault(); }
});
document.addEventListener('dragstart', function (ev) {
  if (ev.target && ev.target.tagName === 'IMG') { ev.preventDefault(); }
});

(function (root) {
  'use strict';

  var FIREBASE_VERSION = '10.12.2';
  var S = root.LCSheet;
  var RANKS = S.RANKS;
  var ROMAN = S.ROMAN;
  var RESIST_TYPES = S.RESIST_TYPES;
  var ICON_BACK = S.ICON_BACK;
  var RANK_LETTERS = S.RANK_LETTERS;
  var esc = S.esc;
  var img = S.img;
  var identityArt = S.identityArt;
  var artBgAttr = S.artBgAttr;
  var artImgHtml = S.artImgHtml;
  var speedText = S.speedText;
  var PANEL_NAMES = { desc: '説明', memo: 'メモ' };
  var ICON_DESC =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5v13c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"/>' +
    '<path d="M12 6v13"/>' +
    '</svg>';
  var ICON_MEMO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5 20l1-4 10.5-10.5a2 2 0 012.8 0l.2.2a2 2 0 010 2.8L9 19z"/>' +
    '<path d="M14.5 7.5l3 3"/>' +
    '</svg>';
  var ICON_CLOSE_ALL =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square" aria-hidden="true">' +
    '<path d="M4 5l7 7-7 7M12 5l7 7-7 7"/>' +
    '</svg>';
  var ICON_CLOSE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" aria-hidden="true">' +
    '<path d="M5 5l14 14M19 5L5 19"/>' +
    '</svg>';

  var body = document.body;
  var charId = '';
  var base = '../';
  S.setBase(base);
  var personaUi = null;
  var allPrisoners = null;
  var appEl = document.getElementById('app');
  var cfg = root.LC_FIREBASE_CONFIG;
  var firebaseUsable = !!(cfg && cfg.apiKey && cfg.databaseURL);

  var state = {
    prisoner: null,
    user: null,
    ref: null,
    identities: {},
    egos: {},
    seasons: {},
    showAll: false,
    remote: {},
    roles: { admin: false, gm: false, player: false },
    view: 'sheet',
    personaId: '',
    detail: '',
    tab: 'overview',
    sub: 0,
    passive: false,
    egoMode: 'awaken',
    panel: '',
    editing: false,
    saving: false,
    status: ''
  };

  function sideBtn(label, panel, icon) {
    return '<button class="side-btn" type="button" aria-label="' + label + '"' +
      ' aria-pressed="' + (state.panel === panel) + '" data-act="panel" data-panel="' + panel + '">' + icon + '</button>';
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

  function isReleased(identity) {
    if (!identity || !identity.season) { return true; }
    var season = state.seasons[identity.season];
    return !!(season && season.released);
  }

  function isOwned(id) {
    var identity = state.identities[id];
    if (!identity) { return false; }
    if (identity.initial) { return true; }
    var owned = state.remote && state.remote.owned;
    return !!(owned && owned[id] === true);
  }

  function isUsable(id) {
    return !!state.identities[id] && isReleased(state.identities[id]);
  }

  function equipment() {
    var p = state.prisoner;
    var def = p.default || {};
    var remote = state.remote || {};
    var identityId = remote.identity;
    if (!identityId || p.identities.indexOf(identityId) < 0 || !isUsable(identityId) || !isOwned(identityId)) { identityId = def.identity; }
    var egos = {};
    RANKS.forEach(function (rank) {
      var rid = remote.egos && remote.egos[rank];
      var ok = rid && p.egos.indexOf(rid) >= 0 && state.egos[rid] && state.egos[rid].rank === rank;
      if (!ok) { rid = def.egos && def.egos[rank]; }
      egos[rank] = rid && state.egos[rid] ? state.egos[rid] : null;
    });
    return { identityId: identityId, identity: state.identities[identityId], egos: egos };
  }

  function canEquip() {
    return state.roles.admin || state.roles.gm || state.roles.player;
  }

  function hashFor(sub) {
    return '#/' + charId + (sub ? '/' + sub : '');
  }

  function route() {
    var all = (location.hash || '').replace(/^#\/?/, '').split('/');
    var parts = all.slice(1);
    var p = state.prisoner;
    state.detail = '';
    if (!all[0]) {
      state.view = 'hub';
    } else if (parts[0] === 'identities' && parts[1] && p && p.identities.indexOf(parts[1]) >= 0 && isUsable(parts[1])) {
      state.view = 'persona';
      state.personaId = parts[1];
      state.sub = 0;
      state.passive = false;
      state.panel = '';
    } else if (parts[0] === 'identities') {
      state.view = 'list';
    } else if (parts[0] === 'egos') {
      state.view = 'egolist';
    } else {
      state.view = 'sheet';
    }
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

  function nameLines(identity) {
    return (identity.nameParts || [identity.name]).map(esc).join('<br>');
  }

  function miniPiece(sin, type, tier) {
    var dir = 'image/skill/' + sin + '/';
    return '<span class="pl-piece">' +
      img(dir + 's' + tier + '-bg.png', 'pl-piece-img') +
      img('image/skill/skill-base.png', 'pl-piece-img') +
      img('image/icon/' + type + '.png', 'pl-piece-img is-icon') +
      img(dir + 's' + tier + '.png', 'pl-piece-img') +
      '</span>';
  }

  function cardSkillsHtml(identity) {
    var h = '<span class="pl-sk">';
    identity.skills.forEach(function (s) {
      h += '<span class="pl-sk-row"><span>' + (ROMAN[s.tier] || s.tier) + '</span>' + miniPiece(s.sin, s.type, s.tier) + '</span>';
    });
    var d = identity.defense;
    if (d) { h += '<span class="pl-sk-row"><span>DEF</span>' + miniPiece(d.sin, d.type, 1) + '</span>'; }
    return h + '</span>';
  }

  function cardStatHtml(identity) {
    var h = '<span class="pl-st">' +
      '<span class="pl-st-line">' + img('image/icon/hp.png', 'pl-st-icon') + esc(identity.hp) + '</span>' +
      '<span class="pl-st-line">' + img('image/icon/speed.png', 'pl-st-icon') + esc(speedText(identity)) + '</span>' +
      '<span class="pl-rs">';
    RESIST_TYPES.forEach(function (t) {
      var m = identity.resist && identity.resist[t] != null ? identity.resist[t] : 1;
      var kind = m > 1 ? 'weak' : (m < 1 ? 'strong' : 'normal');
      var label = m > 1 ? (m < 2 ? '弱点' : '脆弱') : (m < 1 ? '耐性' : '普通');
      h += '<span class="pl-rs-item is-' + kind + '">' + img('image/icon/' + t + '.png', 'pl-rs-icon') +
        '<b>' + label + '</b><b>[x' + m + ']</b></span>';
    });
    return h + '</span></span>';
  }

  function cardHtml(id, identity, selected) {
    var det = state.detail;
    var art = identityArt(state.prisoner, id, identity);
    return '<a class="pl-card' + (selected ? ' is-sel' : '') + (det ? ' is-det' : '') + (isOwned(id) ? '' : ' is-lock') + '" href="' + hashFor('identities/' + id) + '" aria-label="' + esc(identity.name) + '">' +
      '<span class="pl-card-bg"></span>' +
      '<span ' + artBgAttr(art, 'pl-card-art', state.prisoner) + '>' + artImgHtml(art, identity, 'pl-card-img') + '</span>' +
      img('image/frame/' + (identity.rarity || 1) + '.png', 'pl-card-frame') +
      (selected ? '<span class="pl-card-tag">SELECTED</span>' : '') +
      (isOwned(id) ? '' : '<span class="pl-card-lock">未所持</span>') +
      '<span class="pl-card-name">' + nameLines(identity) + '</span>' +
      (det === 'skill' ? cardSkillsHtml(identity) : (det === 'stat' ? cardStatHtml(identity) : '')) +
      '</a>';
  }

  function ownToggleHtml() {
    return '<div class="pl-own" role="radiogroup" aria-label="表示する人格">' +
      '<button class="pl-own-op" type="button" role="radio" aria-checked="' + (!state.showAll) + '" data-act="own-mode" data-mode="owned"><span>保有</span><span class="pl-own-box" aria-hidden="true"></span></button>' +
      '<button class="pl-own-op" type="button" role="radio" aria-checked="' + state.showAll + '" data-act="own-mode" data-mode="all"><span>ALL</span><span class="pl-own-box" aria-hidden="true"></span></button>' +
      '</div>';
  }

  function detailCtlHtml() {
    if (!state.detail) {
      return '<button class="pl-bev pl-detail" type="button" data-act="detail-open"><span class="pl-flip">' + ICON_CLOSE_ALL + '</span><span>詳細</span></button>';
    }
    return '<div class="pl-dctl" role="group" aria-label="詳細表示">' +
      '<button class="pl-dctl-close" type="button" aria-label="通常表示へ戻る" data-act="detail-close">' + ICON_CLOSE_ALL + '</button>' +
      '<button class="pl-dctl-op" type="button" aria-pressed="' + (state.detail === 'skill') + '" data-act="detail-mode" data-mode="skill">スキル</button>' +
      '<button class="pl-dctl-op" type="button" aria-pressed="' + (state.detail === 'stat') + '" data-act="detail-mode" data-mode="stat">人格</button>' +
      '</div>';
  }

  function bannerHtml(identity, id) {
    if (!identity) { return '<div class="pl-side-banner"></div>'; }
    var art = identityArt(state.prisoner, id, identity);
    return '<div ' + artBgAttr(art, 'pl-side-banner', state.prisoner) + '>' + artImgHtml(art, identity, 'pl-card-img', 'banner') + '</div>';
  }

  function listSideHtml(eq) {
    var identity = eq.identity;
    var h = '<aside class="pl-side"><h2 class="pl-side-title">現在選択中の人格</h2>' +
      bannerHtml(identity, eq.identityId);
    RANKS.forEach(function (rank) {
      var ego = eq.egos[rank];
      h += '<div class="pl-ego' + (ego ? '' : ' is-none') + '"><span class="pl-ego-rank">' + RANK_LETTERS[rank] + '</span>' +
        '<span class="pl-ego-name">' + esc(ego ? ego.name : rank) + '</span></div>';
    });
    return h + '</aside>';
  }

  function listHtml() {
    var p = state.prisoner;
    var eq = equipment();
    var isEgo = state.view === 'egolist';
    var cards = '';
    if (isEgo) {
      cards = '<p class="pl-note">E.G.O一覧は準備中です。</p>';
    } else {
      p.identities.forEach(function (id) {
        if (!isUsable(id)) { return; }
        if (!state.showAll && !isOwned(id)) { return; }
        cards += cardHtml(id, state.identities[id], id === eq.identityId);
      });
    }
    return '<div class="pl">' +
      img(p.icon, 'pl-logo', '') +
      '<div class="pl-bar"></div>' +
      '<a class="pl-back" href="' + hashFor('') + '" aria-label="囚人ページへ戻る">' + ICON_BACK + '</a>' +
      '<h1 class="pl-title">' + (isEgo ? 'E.G.O' : '人格') + ': ' + esc(p.name) + '</h1>' +
      '<div class="pl-tabs">' +
      '<a class="pl-bev pl-tab" href="' + hashFor('identities') + '" aria-current="' + (!isEgo) + '">人格</a>' +
      '<a class="pl-bev pl-tab" href="' + hashFor('egos') + '" aria-current="' + isEgo + '">E.G.O</a>' +
      '</div>' +
      (isEgo ? '' : ownToggleHtml()) +
      '<div class="pl-ctl">' + (isEgo ? '' : detailCtlHtml()) + '</div>' +
      '<div class="pl-grid">' + cards + '</div>' +
      listSideHtml(eq) +
      '</div>';
  }

  function render() {
    var drawn = renderView();
    if (drawn && root.LC_LOADING) { root.LC_LOADING.doneAfterImages(appEl); }
  }

  function saveEquip(id) {
    return state.db ? state.db.ref('characters/' + charId + '/identity').set(id) : null;
  }

  function equipState(eq) {
    if (state.personaId === eq.identityId) { return 'on'; }
    if (!isOwned(state.personaId)) { return 'unowned'; }
    return canEquip() ? 'can' : 'none';
  }

  function personaOpts(eq) {
    return {
      p: state.prisoner,
      identity: state.identities[state.personaId],
      identityId: state.personaId,
      seasons: state.seasons,
      equip: equipState(eq),
      saveEquip: saveEquip,
      onEquipped: function () { location.hash = hashFor(''); },
      back: { href: hashFor('identities'), label: '人格一覧へ戻る' },
      navHtml: sideBtn('説明', 'desc', ICON_DESC) + sideBtn('メモ', 'memo', ICON_MEMO),
      panelHtml: panelHtml()
    };
  }

  function unmountPersona() {
    if (personaUi) {
      personaUi.destroy();
      personaUi = null;
    }
  }

  function renderView() {
    if (state.view === 'hub' && !charId) {
      unmountPersona();
      appEl.innerHTML = hubHtml();
      return true;
    }
    if (state.waiting || !state.prisoner) { return false; }
    if (state.view === 'list' || state.view === 'egolist') {
      unmountPersona();
      appEl.innerHTML = listHtml();
      return true;
    }
    var eq = equipment();
    if (state.view === 'persona') {
      if (personaUi) {
        personaUi.update(personaOpts(eq));
      } else {
        personaUi = S.mount(appEl, personaOpts(eq));
      }
      return true;
    }
    unmountPersona();
    var isEgoTab = state.tab === 'ego';
    appEl.innerHTML = S.sheetHtml({
      p: state.prisoner,
      identity: eq.identity,
      identityId: eq.identityId,
      tab: state.tab,
      vs: state,
      eq: eq,
      seasons: state.seasons,
      back: { href: '#/', label: 'ハブへ戻る' },
      navHtml: sideBtn('説明', 'desc', ICON_DESC) + sideBtn('メモ', 'memo', ICON_MEMO),
      panelHtml: panelHtml(),
      actionHtml: '<a class="persona-btn" href="' + (isEgoTab ? hashFor('egos') : hashFor('identities')) + '">' + (isEgoTab ? 'E.G.O一覧' : '人格一覧') + '</a>'
    });
    return true;
  }

  function showError(message) {
    if (root.LC_LOADING) { root.LC_LOADING.done(); }
    unmountPersona();
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
      if (state.view === 'persona') { return; }
      state.tab = el.getAttribute('data-tab');
      state.sub = 0;
      state.passive = false;
      state.egoMode = 'awaken';
    } else if (act === 'sub') {
      state.sub = Number(el.getAttribute('data-sub')) || 0;
      state.passive = false;
      state.egoMode = 'awaken';
    } else if (act === 'mode') {
      state.egoMode = el.getAttribute('data-mode') || 'awaken';
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
    } else if (act === 'detail-open') {
      state.detail = 'skill';
    } else if (act === 'detail-close') {
      state.detail = '';
    } else if (act === 'detail-mode') {
      state.detail = el.getAttribute('data-mode') === 'stat' ? 'stat' : 'skill';
    } else if (act === 'own-mode') {
      state.showAll = el.getAttribute('data-mode') === 'all';
    }
    render();
  }

  function readRole(db, path, test) {
    return db.ref(path).once('value').then(function (snap) { return test(snap.val()); }, function () { return false; });
  }

  function onUser(db, user) {
    state.user = user || null;
    if (!charId) { return; }
    if (!user || user.isAnonymous) {
      state.roles = { admin: false, gm: false, player: false };
      if (!state.editing) { render(); }
      return;
    }
    var forId = charId;
    Promise.all([
      readRole(db, 'admin/' + user.uid, function (v) { return v === true; }),
      readRole(db, 'gm/' + user.uid, function (v) { return v === true; }),
      readRole(db, 'player/' + user.uid, function (v) { return v === forId; })
    ]).then(function (r) {
      if (forId !== charId) { return; }
      state.roles = { admin: r[0], gm: r[1], player: r[2] };
      if (!state.editing) { render(); }
    });
  }

  function attachRef() {
    if (state.ref) { state.ref.off(); state.ref = null; }
    if (!state.db || !charId) { return; }
    var forId = charId;
    state.ref = state.db.ref('characters/' + forId);
    state.ref.on('value', function (snap) {
      if (forId !== charId) { return; }
      state.remote = snap.val() || {};
      state.waiting = false;
      if (!state.editing) { render(); }
    }, function (e) {
      if (forId !== charId) { return; }
      state.status = '保存済みのデータを読み込めませんでした。' + (e && e.message ? e.message : '');
      state.waiting = false;
      render();
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
        attachRef();
        fb.auth(app).onAuthStateChanged(function (user) { onUser(db, user); });
      })
      .catch(function (e) {
        state.status = e.message;
        state.waiting = false;
        render();
      });
  }

  function hubHtml() {
    var h = '<div class="hub"><h1 class="hub-title">キャラクターシート</h1><ul class="hub-list">';
    var ids = Object.keys(allPrisoners || {}).sort(function (a, b) {
      var na = typeof allPrisoners[a].no === 'number' ? allPrisoners[a].no : Infinity;
      var nb = typeof allPrisoners[b].no === 'number' ? allPrisoners[b].no : Infinity;
      return na - nb;
    });
    ids.forEach(function (id) {
      var p = allPrisoners[id];
      h += '<li><a class="hub-card" href="#/' + esc(id) + '">' +
        '<span class="hub-card-icon"><img alt="" src="' + esc(base + p.icon) + '"></span>' +
        '<span class="hub-card-name">' + esc(p.name) + '</span></a></li>';
    });
    if (!ids.length) { h += '<li class="hub-note">囚人が登録されていません。</li>'; }
    return h + '</ul><a class="hub-back" href="../">メインページへ戻る</a></div>';
  }

  var loadToken = 0;

  function leavePrisoner() {
    if (state.ref) { state.ref.off(); state.ref = null; }
    charId = '';
    state.prisoner = null;
    state.remote = {};
    state.roles = { admin: false, gm: false, player: false };
    state.editing = false;
    state.panel = '';
    state.status = '';
    state.waiting = false;
  }

  function loadPrisoner(id) {
    var token = ++loadToken;
    if (root.LC_LOADING) { root.LC_LOADING.show(); }
    leavePrisoner();
    charId = id;
    state.identities = {};
    state.egos = {};
    state.waiting = firebaseUsable;
    if (!allPrisoners[id]) { showError('囚人「' + id + '」のデータがありません。'); return; }
    Promise.all([loadJson('data/' + id + '/identities.json'), loadJson('data/' + id + '/egos.json')])
      .then(function (r) {
        if (token !== loadToken) { return; }
        state.prisoner = allPrisoners[id];
        state.identities = r[0];
        state.egos = r[1];
        document.title = state.prisoner.name + ' | キャラクターシート | LCBTRPG';
        route();
        render();
        attachRef();
        if (state.db && state.user) { onUser(state.db, state.user); }
        setTimeout(function () {
          if (token === loadToken && state.waiting) {
            state.waiting = false;
            render();
          }
        }, 4000);
      })
      .catch(function (e) { if (token === loadToken) { showError(e.message); } });
  }

  function applyRoute() {
    var id = (location.hash || '').replace(/^#\/?/, '').split('/')[0];
    if (!id) {
      leavePrisoner();
      loadToken += 1;
      state.view = 'hub';
      document.title = 'キャラクターシート | LCBTRPG';
      render();
      return;
    }
    if (id !== charId) {
      loadPrisoner(id);
      return;
    }
    if (!state.prisoner) { return; }
    route();
    render();
  }

  function init() {
    loadJson('data/prisoners.json')
      .then(function (all) {
        allPrisoners = all;
        return loadJson('data/seasons.json').catch(function () { return {}; });
      })
      .then(function (seasons) {
        state.seasons = seasons || {};
        appEl.addEventListener('click', onClick);
        window.addEventListener('hashchange', function () {
          applyRoute();
          window.scrollTo(0, 0);
        });
        initFirebase();
        applyRoute();
      })
      .catch(function (e) { showError(e.message); });
  }

  init();
}(typeof self !== 'undefined' ? self : this));
