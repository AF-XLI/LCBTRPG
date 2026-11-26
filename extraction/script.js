(function (root) {
  'use strict';

  var FIREBASE_VERSION = '10.12.2';
  var PICKUP_RATE = 3;
  var FX_MS = 1700;
  var PLACEHOLDER = '../image/placeholder/portrait.webp';
  var cfg = root.LC_FIREBASE_CONFIG;
  var usable = !!(cfg && cfg.apiKey && cfg.databaseURL && cfg.useAuth !== false);
  var app = document.getElementById('app');
  var layer = document.getElementById('layer');
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
    status: ''
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

  function seasonLabel(o) {
    var s = seasonOf(o);
    return o.season ? (s && s.name ? s.name : o.season) : '';
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
      return { id: k, name: o.name, rarity: o.rarity, season: o.season, initial: !!o.initial, stageImage: o.stageImage, portrait: o.portrait, portraitTop: o.portraitTop, portraitWidth: o.portraitWidth, cardPos: o.cardPos, cardZoom: o.cardZoom, cardFit: o.cardFit, cardX: o.cardX, cardShift: o.cardShift };
    });
  }

  function identityById(pid, id) {
    var hit = identitiesOf(pid).filter(function (o) { return o.id === id; });
    return hit.length ? hit[0] : null;
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

  function totalWeight(pid) {
    var total = 0;
    pool(pid).forEach(function (o) { total += weight(pid, o); });
    return total;
  }

  function draw(pid) {
    var list = pool(pid);
    var r = Math.random() * totalWeight(pid);
    for (var i = 0; i < list.length; i++) {
      r -= weight(pid, list[i]);
      if (r < 0) { return list[i]; }
    }
    return list[list.length - 1];
  }

  function canChange(pid) {
    return pid === state.own || isGm();
  }

  function artSrc(pid, o) {
    var p = data.prisoners[pid] || {};
    if (o && o.stageImage) { return { src: '../' + o.stageImage, kind: 'stage' }; }
    if (o && o.portrait) { return { src: '../' + o.portrait, kind: 'portrait', lay: o }; }
    if (!o) { return { src: '../' + (p.portrait || ''), kind: 'portrait', lay: p }; }
    return { src: PLACEHOLDER, kind: 'placeholder' };
  }

  function rarityTag(o) {
    var r = String(o.rarity || 1);
    return '<span class="ex-rarity"><img alt="" src="../image/icon/rarity/' + esc(r) + '.png" onerror="this.remove()"><span>レア' + esc(r) + '</span></span>';
  }

  function cardArtHtml(pid, o) {
    var p = data.prisoners[pid] || {};
    var cls = 'ex-card-img';
    var src = PLACEHOLDER;
    var bg = '';
    var vars = '';
    var fit = false;
    if (o.stageImage) {
      src = '../' + o.stageImage;
    } else if (o.portrait) {
      src = '../' + o.portrait;
      bg = p.background ? ' has-bg" style="background-image: url(\'../' + esc(p.background) + '\')' : '';
      fit = true;
    } else {
      cls += ' is-ph';
    }
    if (fit) { cls += ' is-fit'; }
    if (o.cardPos) { vars += '--pos: ' + o.cardPos + ';'; }
    if (o.cardZoom) { vars += '--zoom: ' + o.cardZoom + ';'; }
    if (fit && o.cardFit) { vars += '--fit: ' + o.cardFit + ';'; }
    if (fit && o.cardX) { vars += '--x: ' + o.cardX + '%;'; }
    if (fit && o.cardShift) { vars += '--shift: ' + o.cardShift + '%;'; }
    return '<span class="ex-card-art' + bg + '">' +
      '<img class="' + cls + '" alt="" ' + (vars ? 'style="' + esc(vars) + '" ' : '') + 'src="' + esc(src) + '"' + (cls.indexOf('is-ph') >= 0 ? ' onerror="this.remove()"' : '') + '></span>';
  }

  function cardHtml(pid, o, extra) {
    var pu = pickupId(pid) === o.id;
    return '<span class="ex-card' + (pu ? ' is-pu' : '') + '">' +
      '<span class="ex-card-bg"></span>' +
      cardArtHtml(pid, o) +
      '<img class="ex-card-frame" alt="" src="../image/frame/' + esc(o.rarity || 1) + '.png">' +
      (pu ? '<span class="ex-card-pu">PICK UP</span>' : '') +
      '<span class="ex-card-name">' + esc(o.name) + '</span>' +
      (extra ? '<span class="ex-card-extra">' + extra + '</span>' : '') + '</span>';
  }

  function finishLoading() {
    if (!root.LC_LOADING) { return; }
    var urls = [];
    [].slice.call(app.querySelectorAll('img')).forEach(function (im) { if (!im.complete) { urls.push(im); } });
    [].slice.call(app.querySelectorAll('[style*="background-image"]')).forEach(function (el) {
      var m = /url\(["']?([^"')]+)["']?\)/.exec(el.getAttribute('style') || '');
      if (m) { var im = new Image(); im.src = m[1]; if (!im.complete) { urls.push(im); } }
    });
    var left = urls.length;
    var ended = false;
    function end() { if (!ended) { ended = true; root.LC_LOADING.done(); } }
    if (!left) { end(); return; }
    urls.forEach(function (im) {
      var one = function () { left -= 1; if (left <= 0) { end(); } };
      im.addEventListener('load', one);
      im.addEventListener('error', one);
    });
    setTimeout(end, 5000);
  }

  function message(text) {
    if (root.LC_LOADING) { root.LC_LOADING.done(); }
    app.innerHTML = '<h1 class="ex-title">抽出</h1><p class="ex-note">' + esc(text) + '</p>' +
      '<a class="ex-link" href="../">メインページへ戻る</a>';
  }

  function railHtml(pid) {
    var ids = isGm() ? sortedPrisoners() : [pid];
    var h = '<nav class="ex-rail" aria-label="囚人">';
    ids.forEach(function (id) {
      var p = data.prisoners[id];
      var on = id === pid;
      var inner = '<span class="ex-banner-kind">特定抽出</span><span class="ex-banner-name">' + esc(p.name) + '</span>';
      var style = ' style="--theme: ' + esc(p.themeColor || 'rgb(232, 178, 56)') + '; background-image: url(\'../' + esc(p.background || '') + '\');"';
      if (isGm()) {
        h += '<button class="ex-banner' + (on ? ' is-on' : '') + '" type="button" data-act="who" data-id="' + esc(id) + '"' + style + '>' + inner + '</button>';
      } else {
        h += '<div class="ex-banner is-on is-fixed"' + style + '>' + inner + '</div>';
      }
    });
    return h + '</nav>';
  }

  function mainHtml(pid) {
    var p = data.prisoners[pid];
    var list = pool(pid);
    var mine = pid === state.own;
    var n = tickets();
    var puId = pickupId(pid);
    var pu = puId ? identityById(pid, puId) : null;
    var art = artSrc(pid, pu);
    var h = '<section class="ex-main" style="--theme: ' + esc(p.themeColor || 'rgb(232, 178, 56)') + ';">';
    h += '<div class="ex-bg" style="background-image: url(\'../' + esc(p.background || '') + '\');"></div>';
    h += '<div class="ex-heading">' + (p.icon ? '<img class="ex-heading-logo" alt="" src="../' + esc(p.icon) + '">' : '') + '<span class="ex-heading-kind">特定抽出</span><span class="ex-heading-name" style="font-size: ' + Math.round(Math.min(3.5, 14 / Array.from(p.name).length) * 1000) / 1000 + 'rem;">' + esc(p.name) + '</span></div>';
    var lay = art.lay || {};
    var artStyle = art.kind === 'portrait' ? ' style="--pt: ' + (lay.portraitTop != null ? lay.portraitTop : 5.375) + '; --pw: ' + (lay.portraitWidth != null ? lay.portraitWidth : 41.25) + ';"' : '';
    h += '<div class="ex-art is-' + art.kind + '"' + artStyle + '><img alt="' + esc(pu ? pu.name : p.name) + '" src="' + esc(art.src) + '"' + (art.kind === 'placeholder' ? ' onerror="this.remove()"' : '') + '></div>';
    h += '<div class="ex-tag">';
    if (pu) {
      h += '<span class="ex-tag-identity">' + esc(pu.name) + '</span>' +
        '<span class="ex-tag-name">' + esc(p.name) + '</span>' +
        '<span class="ex-tag-sub">' + rarityTag(pu) + '</span>' +
        '<a class="ex-mag" href="../character/#/' + esc(pid) + '/identities/' + esc(pu.id) + '" target="_blank" rel="noopener" aria-label="人格の詳細を見る">' +
        '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><circle cx="10" cy="10" r="6" fill="none" stroke="currentColor" stroke-width="2.4"></circle><path d="M15 15l6 6" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"></path></svg></a>';
    } else {
      h += '<span class="ex-tag-identity">PU未選択</span><span class="ex-tag-name">' + esc(p.name) + '</span><span class="ex-tag-sub is-empty"></span>';
    }
    h += '</div>';
    h += '<div class="ex-tools">' +
      '<button class="ex-tool" type="button" data-act="open" data-kind="odds">確率の詳細</button>' +
      '<button class="ex-tool" type="button" data-act="open" data-kind="history">抽出履歴</button>' +
      '</div>';
    if (canChange(pid)) {
      h += '<button class="ex-swap" type="button" data-act="open" data-kind="pickup"><span class="ex-swap-label">ピックアップ変更</span><span class="ex-swap-arrow" aria-hidden="true"></span></button>';
    }
    h += '<div class="ex-actions">';
    if (mine) {
      h += '<button class="ex-pull" type="button" data-act="pull"' + (n > 0 && list.length && !state.busy ? '' : ' disabled') + '>' +
        '<span class="ex-pull-label">1回抽出</span><span class="ex-pull-cost"><img alt="" src="../image/icon/extraction-ticket.png"><b>1</b></span></button>';
    }
    h += '</div>';
    return h + '</section>';
  }

  function gmHtml(pid) {
    var owned = ownedMap();
    var h = '<section class="ex-gm"><h2 class="ex-gm-title">GM操作(' + esc(data.prisoners[pid].name) + ')</h2>';
    h += '<div class="ex-gm-row"><span>チケット</span>' +
      '<button class="ex-btn" type="button" data-act="tk" data-n="-1">-1</button>' +
      '<button class="ex-btn" type="button" data-act="tk" data-n="1">+1</button>' +
      '<button class="ex-btn" type="button" data-act="tk" data-n="5">+5</button>' +
      '<button class="ex-btn" type="button" data-act="tk" data-n="10">+10</button></div>';
    var list = identitiesOf(pid).filter(function (o) { return !o.initial; });
    h += '<div class="ex-gm-sub">人格の付与・剥奪</div>';
    if (!list.length) {
      h += '<p class="ex-note">付与できる人格がありません。</p>';
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
    var h = '';
    if (state.status) { h += '<p class="ex-status">' + esc(state.status) + '</p>'; }
    h += '<div class="ex-body">' + railHtml(pid) + mainHtml(pid) + '</div>';
    if (isGm()) { h += gmHtml(pid); }
    app.innerHTML = h;
    centerArt();
  }

  var centers = {};

  function measureCenter(src, done) {
    var img = new Image();
    img.onload = function () {
      var w = 120;
      var hh = Math.max(1, Math.round(img.naturalHeight / img.naturalWidth * w));
      var cv = document.createElement('canvas');
      cv.width = w;
      cv.height = hh;
      var cx = cv.getContext('2d');
      var c = 0.5;
      try {
        cx.drawImage(img, 0, 0, w, hh);
        var px = cx.getImageData(0, 0, w, hh).data;
        var sum = 0;
        var cnt = 0;
        for (var y = Math.floor(hh * 0.2); y < Math.floor(hh * 0.5); y++) {
          for (var x = 0; x < w; x++) {
            if (px[(y * w + x) * 4 + 3] > 40) { sum += x + 0.5; cnt++; }
          }
        }
        if (cnt) { c = sum / cnt / w; }
      } catch (e) { c = 0.5; }
      done(c);
    };
    img.onerror = function () { done(0.5); };
    img.src = src;
  }

  function centerArt() {
    var nodes = app.querySelectorAll('.ex-art.is-portrait');
    Array.prototype.forEach.call(nodes, function (el) {
      var im = el.querySelector('img');
      if (!im) { return; }
      var src = im.getAttribute('src');
      if (centers[src] !== undefined) { el.style.setProperty('--cx', centers[src]); return; }
      measureCenter(src, function (c) {
        centers[src] = c;
        el.style.setProperty('--cx', c);
      });
    });
  }

  function percent(pid, o) {
    var t = totalWeight(pid);
    return t ? Math.round(weight(pid, o) / t * 1000) / 10 : 0;
  }

  function dateText(ms) {
    if (typeof ms !== 'number') { return ''; }
    var d = new Date(ms);
    function z(v) { return v < 10 ? '0' + v : '' + v; }
    return d.getFullYear() + '/' + z(d.getMonth() + 1) + '/' + z(d.getDate()) + ' ' + z(d.getHours()) + ':' + z(d.getMinutes());
  }

  function modalHtml(kind) {
    var pid = state.prisoner;
    var list = pool(pid);
    var title = kind === 'odds' ? '確率の詳細' : kind === 'history' ? '抽出履歴' : 'ピックアップ変更';
    var h = '<div class="ex-ov" data-act="close"><div class="ex-modal" role="dialog" aria-label="' + title + '">' +
      '<h2 class="ex-modal-title">' + title + '</h2><div class="ex-modal-body">';
    if (kind === 'odds') {
      if (!list.length) {
        h += '<p class="ex-note">抽出できる人格がありません。</p>';
      } else {
        h += '<p class="ex-note">未所持の人格から1つが選ばれます(' + list.length + '件)。ピックアップに指定した人格は ×' + PICKUP_RATE + ' で数えます。</p><ul class="ex-list">';
        list.forEach(function (o) {
          h += '<li>' + cardHtml(pid, o, percent(pid, o) + '%') + '</li>';
        });
        h += '</ul>';
      }
    } else if (kind === 'history') {
      var hist = (state.remote && state.remote.history) || {};
      var rows = Object.keys(hist).map(function (k) { return hist[k]; }).filter(function (r) { return r && r.id; })
        .sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
      if (!rows.length) {
        h += '<p class="ex-note">まだ抽出していません。</p>';
      } else {
        h += '<ul class="ex-hist">';
        rows.forEach(function (r) {
          var o = identityById(pid, r.id);
          h += '<li><span class="ex-hist-date">' + esc(dateText(r.at)) + '</span><span class="ex-hist-name">' + esc(o ? o.name : r.id) + '</span></li>';
        });
        h += '</ul>';
      }
    } else {
      var cur = pickupId(pid);
      h += '<button class="ex-btn' + (cur ? '' : ' is-on') + '" type="button" data-act="pick" data-id="">指定なし</button>';
      if (!list.length) {
        h += '<p class="ex-note">ピックアップにできる人格がありません。</p>';
      } else {
        h += '<ul class="ex-list">';
        list.forEach(function (o) {
          h += '<li><button class="ex-pick' + (cur === o.id ? ' is-on' : '') + '" type="button" data-act="pick" data-id="' + esc(o.id) + '">' + cardHtml(pid, o) + '</button></li>';
        });
        h += '</ul>';
      }
    }
    return h + '</div><div class="ex-modal-foot"><button class="ex-btn" type="button" data-act="close">閉じる</button></div></div></div>';
  }

  function resultHtml(o) {
    var pid = state.prisoner;
    var art = artSrc(pid, o);
    var sl = seasonLabel(o);
    return '<div class="ex-ov is-result"><div class="ex-res">' +
      '<span class="ex-res-new">NEW</span>' +
      '<div class="ex-res-art is-' + art.kind + '"><img alt="" src="' + esc(art.src) + '"' + (art.kind === 'placeholder' ? ' onerror="this.remove()"' : '') + '></div>' +
      '<div class="ex-res-info">' + (sl ? '<span class="ex-tag-season">' + esc(sl) + '</span>' : '') +
      '<span class="ex-res-name">' + esc(o.name) + '</span>' + rarityTag(o) + '</div>' +
      '<div class="ex-res-btns"><a class="ex-btn" href="../character/#/' + esc(pid) + '/identities/' + esc(o.id) + '" target="_blank" rel="noopener">詳細を見る</a>' +
      '<button class="ex-btn" type="button" data-act="close">閉じる</button></div></div></div>';
  }

  function fxHtml() {
    return '<div class="ex-fx"><span class="ex-fx-ring"></span><span class="ex-fx-ring is-2"></span><span class="ex-fx-flash"></span></div>';
  }

  function fail(e) {
    state.busy = false;
    layer.innerHTML = '';
    var m = e && e.message ? e.message : '';
    state.status = /permission/i.test(m)
      ? '保存できませんでした。チケット枚数などが変わっている可能性があります。もう一度お試しください。'
      : '保存できませんでした。' + m;
    render();
  }

  function stamp() {
    var fb = root.firebase;
    return fb && fb.database && fb.database.ServerValue ? fb.database.ServerValue.TIMESTAMP : Date.now();
  }

  function pull() {
    var pid = state.prisoner;
    if (state.busy || pid !== state.own || tickets() < 1 || !pool(pid).length) { return; }
    var got = draw(pid);
    var updates = {};
    updates['owned/' + got.id] = true;
    updates.tickets = tickets() - 1;
    if (pickupId(pid) === got.id) { updates.pickup = null; }
    var t0 = Date.now();
    state.busy = true;
    state.status = '';
    layer.innerHTML = fxHtml();
    render();
    state.ref.update(updates).then(function () {
      try {
        state.ref.child('history').push({ id: got.id, at: stamp() }).catch(function () {});
      } catch (e) {}
      setTimeout(function () {
        state.busy = false;
        layer.innerHTML = resultHtml(got);
        render();
      }, Math.max(0, FX_MS - (Date.now() - t0)));
    }, fail);
  }

  function onClick(ev) {
    var el = ev.target.closest ? ev.target.closest('[data-act]') : null;
    if (!el || !state.ref) { return; }
    var act = el.getAttribute('data-act');
    if (act === 'close') {
      if (el.classList.contains('ex-ov') && ev.target !== el) { return; }
      layer.innerHTML = '';
    } else if (act === 'pull') {
      pull();
    } else if (act === 'open') {
      layer.innerHTML = modalHtml(el.getAttribute('data-kind'));
    } else if (act === 'pick' && canChange(state.prisoner)) {
      var id = el.getAttribute('data-id');
      layer.innerHTML = '';
      state.ref.child('pickup').set(id || null).catch(fail);
    } else if (act === 'who' && isGm()) {
      select(el.getAttribute('data-id'));
    } else if (act === 'tk' && isGm()) {
      var d = parseInt(el.getAttribute('data-n'), 10) || 0;
      state.ref.child('tickets').transaction(function (v) {
        return Math.max(0, (typeof v === 'number' ? v : 0) + d);
      }).catch(fail);
    } else if (act === 'own' && isGm()) {
      state.ref.child('owned/' + el.getAttribute('data-id')).set(el.getAttribute('data-on') === '1' ? true : null).catch(fail);
    }
  }

  function select(pid) {
    if (state.ref) { state.ref.off(); }
    state.prisoner = pid;
    state.remote = {};
    state.status = '';
    layer.innerHTML = '';
    state.ref = state.db.ref('characters/' + pid);
    state.ref.on('value', function (snap) {
      state.remote = snap.val() || {};
      render();
      finishLoading();
    }, function (e) {
      state.status = '読み込めませんでした。' + (e && e.message ? e.message : '');
      render();
      finishLoading();
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
      document.addEventListener('click', onClick);
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
