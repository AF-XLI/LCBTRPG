(function (root) {
  'use strict';

  var FIREBASE_VERSION = '10.12.2';
  var PICKUP_RATE = 2;
  var cfg = root.LC_FIREBASE_CONFIG;
  var usable = !!(cfg && cfg.apiKey && cfg.databaseURL && cfg.useAuth !== false);
  var app = document.getElementById('app');
  var data = { prisoners: {}, seasons: {}, identities: {} };
  var state = {
    db: null,
    user: null,
    roles: { admin: false, gm: false },
    own: '',
    prisoner: '',
    remote: {},
    ref: null,
    busy: false,
    status: '',
    result: null
  };

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getJson(url, optional) {
    return fetch(url).then(function (res) {
      if (!res.ok) {
        if (optional) { return {}; }
        throw new Error(url + ' を読み込めませんでした(' + res.status + ')');
      }
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

  function isGm() {
    return state.roles.admin || state.roles.gm;
  }

  function sortedPrisoners() {
    return Object.keys(data.prisoners).sort(function (a, b) {
      var na = typeof data.prisoners[a].no === 'number' ? data.prisoners[a].no : Infinity;
      var nb = typeof data.prisoners[b].no === 'number' ? data.prisoners[b].no : Infinity;
      return na - nb;
    });
  }

  function seasonOf(o) {
    return o.season ? data.seasons[o.season] : null;
  }

  function isOpen(o) {
    if (!o.season) { return true; }
    var s = seasonOf(o);
    return !!(s && s.released);
  }

  function ownedMap() {
    return (state.remote && state.remote.owned) || {};
  }

  function tickets() {
    var n = state.remote && state.remote.tickets;
    return typeof n === 'number' && n > 0 ? Math.floor(n) : 0;
  }

  function identitiesOf(pid) {
    var base = data.identities[pid] || {};
    var listed = (data.prisoners[pid] && data.prisoners[pid].identities) || Object.keys(base);
    return listed.filter(function (k) { return base[k]; }).map(function (k) {
      var o = base[k];
      return { id: k, name: o.name, rarity: o.rarity, season: o.season, initial: !!o.initial };
    });
  }

  function pool(pid) {
    var owned = ownedMap();
    return identitiesOf(pid).filter(function (o) {
      return !o.initial && isOpen(o) && owned[o.id] !== true;
    });
  }

  function pickupId(pid) {
    var id = state.remote && state.remote.pickup;
    var hit = pool(pid).filter(function (o) { return o.id === id; });
    return hit.length ? id : '';
  }

  function weight(pid, o) {
    return pickupId(pid) === o.id ? PICKUP_RATE : 1;
  }

  function draw(pid) {
    var list = pool(pid);
    var total = 0;
    list.forEach(function (o) { total += weight(pid, o); });
    var r = Math.random() * total;
    for (var i = 0; i < list.length; i++) {
      r -= weight(pid, list[i]);
      if (r < 0) { return list[i]; }
    }
    return list[list.length - 1];
  }

  function cardHtml(pid, o) {
    var pu = pickupId(pid) === o.id;
    return '<div class="ex-card' + (pu ? ' is-pu' : '') + '">' +
      '<img class="ex-card-icon" alt="" src="../image/icon/org/lcb.png">' +
      '<img class="ex-card-frame" alt="" src="../image/frame/' + esc(o.rarity || 1) + '.png">' +
      (pu ? '<span class="ex-card-pu">PICK UP</span>' : '') +
      '<span class="ex-card-name">' + esc(o.name) + '</span></div>';
  }

  function message(text) {
    app.innerHTML = '<h1 class="ex-title">抽出</h1><p class="ex-note">' + esc(text) + '</p>' +
      '<a class="ex-back" href="../">メインページへ戻る</a>';
  }

  function gmHtml(pid) {
    var owned = ownedMap();
    var h = '<section class="ex-sec ex-gm"><h2 class="ex-sec-title">GM操作</h2>';
    h += '<div class="ex-gm-row"><span>チケット</span>' +
      '<button class="ex-btn" type="button" data-act="tk" data-n="-1">-1</button>' +
      '<button class="ex-btn" type="button" data-act="tk" data-n="1">+1</button>' +
      '<button class="ex-btn" type="button" data-act="tk" data-n="5">+5</button>' +
      '<button class="ex-btn" type="button" data-act="tk" data-n="10">+10</button></div>';
    var list = identitiesOf(pid).filter(function (o) { return !o.initial; });
    h += '<div class="ex-gm-sub">人格の付与・剥奪</div>';
    if (!list.length) {
      h += '<p class="ex-empty">付与できる人格がありません。</p>';
    } else {
      h += '<ul class="ex-gm-list">';
      list.forEach(function (o) {
        var has = owned[o.id] === true;
        var s = seasonOf(o);
        h += '<li><span class="ex-gm-name">' + esc(o.name) + '</span>' +
          '<span class="ex-gm-tag">' + esc(o.season ? (s ? s.name : o.season) + (s && s.released ? '' : '(未公開)') : '恒常') + '</span>' +
          '<span class="ex-gm-state">' + (has ? '所持' : '未所持') + '</span>' +
          '<button class="ex-btn" type="button" data-act="own" data-id="' + esc(o.id) + '" data-on="' + (has ? '0' : '1') + '">' + (has ? '剥奪' : '付与') + '</button></li>';
      });
      h += '</ul>';
    }
    return h + '</section>';
  }

  function render() {
    var pid = state.prisoner;
    var p = data.prisoners[pid];
    var list = pool(pid);
    var mine = pid === state.own;
    var n = tickets();
    var pu = pickupId(pid);
    var h = '<h1 class="ex-title">抽出</h1>';
    h += '<div class="ex-bar">';
    if (isGm()) {
      h += '<select id="who" aria-label="囚人">';
      sortedPrisoners().forEach(function (id) {
        h += '<option value="' + esc(id) + '"' + (id === pid ? ' selected' : '') + '>' + esc(data.prisoners[id].name) + '</option>';
      });
      h += '</select>';
    } else {
      h += '<span class="ex-bar-name">' + esc(p.name) + '</span>';
    }
    h += '<span class="ex-ticket">抽出チケット <b>' + n + '</b> 枚</span>';
    if (mine) {
      h += '<button class="ex-btn ex-pull" type="button" id="pull"' + (n > 0 && list.length && !state.busy ? '' : ' disabled') + '>抽出する</button>';
    }
    h += '</div>';
    if (state.status) { h += '<p class="ex-status">' + esc(state.status) + '</p>'; }
    if (!mine && !isGm()) { h += '<p class="ex-note">この囚人の抽出はできません。</p>'; }
    h += '<section class="ex-sec"><h2 class="ex-sec-title">ピックアップ</h2><div class="ex-pu">';
    if (mine || isGm()) {
      h += '<select id="pu"><option value="">指定なし</option>';
      list.forEach(function (o) {
        h += '<option value="' + esc(o.id) + '"' + (pu === o.id ? ' selected' : '') + '>' + esc(o.name) + '</option>';
      });
      h += '</select>';
    } else {
      h += '<span>' + esc(pu ? (list.filter(function (o) { return o.id === pu; })[0] || {}).name : '指定なし') + '</span>';
    }
    h += '<span class="ex-pu-rate">指定した人格の排出確率が' + PICKUP_RATE + '倍になります</span></div></section>';
    h += '<section class="ex-sec"><h2 class="ex-sec-title">未所持の人格(' + list.length + ')</h2>';
    if (list.length) {
      h += '<ul class="ex-list">';
      list.forEach(function (o) { h += '<li>' + cardHtml(pid, o) + '</li>'; });
      h += '</ul>';
    } else {
      h += '<p class="ex-empty">抽出できる人格がありません。</p>';
    }
    h += '</section>';
    if (isGm()) { h += gmHtml(pid); }
    h += '<a class="ex-back" href="../">メインページへ戻る</a>';
    h += '<div class="ex-result" id="result"' + (state.result ? '' : ' hidden') + '>' +
      (state.result ? '<span class="ex-result-label">NEW</span>' + cardHtml(pid, state.result) +
        '<button class="ex-btn" type="button" data-act="close">閉じる</button>' : '') + '</div>';
    app.innerHTML = h;
  }

  function fail(e) {
    state.busy = false;
    var m = e && e.message ? e.message : '';
    state.status = /permission/i.test(m)
      ? '保存できませんでした。チケット枚数などが変わっている可能性があります。もう一度お試しください。'
      : '保存できませんでした。' + m;
    render();
  }

  function pull() {
    var pid = state.prisoner;
    if (state.busy || pid !== state.own || tickets() < 1 || !pool(pid).length) { return; }
    var got = draw(pid);
    var updates = {};
    updates['owned/' + got.id] = true;
    updates.tickets = tickets() - 1;
    if (pickupId(pid) === got.id) { updates.pickup = null; }
    state.busy = true;
    state.status = '';
    render();
    state.ref.update(updates).then(function () {
      state.busy = false;
      state.result = got;
      render();
    }, fail);
  }

  function onClick(ev) {
    var el = ev.target.closest ? ev.target.closest('[data-act], #pull') : null;
    if (!el || !state.ref) { return; }
    var act = el.getAttribute('data-act') || el.id;
    if (act === 'pull') {
      pull();
    } else if (act === 'close') {
      state.result = null;
      render();
    } else if (act === 'tk' && isGm()) {
      var d = parseInt(el.getAttribute('data-n'), 10) || 0;
      state.ref.child('tickets').transaction(function (v) {
        return Math.max(0, (typeof v === 'number' ? v : 0) + d);
      }).catch(fail);
    } else if (act === 'own' && isGm()) {
      var id = el.getAttribute('data-id');
      state.ref.child('owned/' + id).set(el.getAttribute('data-on') === '1' ? true : null).catch(fail);
    }
  }

  function onChange(ev) {
    var t = ev.target;
    if (t.id === 'who') {
      select(t.value);
    } else if (t.id === 'pu' && state.ref) {
      state.ref.child('pickup').set(t.value || null).catch(fail);
    }
  }

  function select(pid) {
    if (state.ref) { state.ref.off(); }
    state.prisoner = pid;
    state.remote = {};
    state.status = '';
    state.result = null;
    state.ref = state.db.ref('characters/' + pid);
    state.ref.on('value', function (snap) {
      state.remote = snap.val() || {};
      render();
    }, function (e) {
      state.status = '読み込めませんでした。' + (e && e.message ? e.message : '');
      render();
    });
    render();
  }

  function readValue(path) {
    return state.db.ref(path).once('value').then(function (snap) { return snap.val(); }, function () { return null; });
  }

  function onUser(user) {
    if (!user || user.isAnonymous) {
      message('抽出を使うには、メインページでGoogleログインしてください。');
      return;
    }
    state.user = user;
    Promise.all([
      readValue('admin/' + user.uid),
      readValue('gm/' + user.uid),
      readValue('player/' + user.uid)
    ]).then(function (r) {
      state.roles = { admin: r[0] === true, gm: r[1] === true };
      state.own = typeof r[2] === 'string' && data.prisoners[r[2]] ? r[2] : '';
      var first = state.own || (isGm() ? sortedPrisoners()[0] : '');
      if (!first) {
        message('このアカウントには囚人が登録されていません。GMに登録を依頼してください。');
        return;
      }
      app.addEventListener('click', onClick);
      app.addEventListener('change', onChange);
      select(first);
    });
  }

  function init() {
    if (!usable) { message('Firebase が設定されていません。'); return; }
    getJson('../data/prisoners.json').then(function (pr) {
      data.prisoners = pr;
      return Promise.all([
        getJson('../data/seasons.json', true),
        Promise.all(Object.keys(pr).map(function (id) {
          return getJson('../data/' + id + '/identities.json', true).then(function (d) { data.identities[id] = d; });
        }))
      ]);
    }).then(function (res) {
      data.seasons = res[0];
      var url = 'https://www.gstatic.com/firebasejs/' + FIREBASE_VERSION + '/';
      return loadScript(url + 'firebase-app-compat.js')
        .then(function () { return loadScript(url + 'firebase-database-compat.js'); })
        .then(function () { return loadScript(url + 'firebase-auth-compat.js'); });
    }).then(function () {
      var fb = root.firebase;
      var fbApp = fb.apps && fb.apps.length ? fb.apps[0] : fb.initializeApp(cfg);
      state.db = fb.database(fbApp);
      fb.auth(fbApp).onAuthStateChanged(onUser);
    }).catch(function (e) { message(e.message); });
  }

  init();
}(typeof self !== 'undefined' ? self : this));
