(function () {
  'use strict';

  var PICKUP_RATE = 2;
  var STORE = 'lcbtrpg-extraction-test';
  var app = document.getElementById('app');
  var data = { prisoners: {}, seasons: {}, sample: {}, identities: {} };
  var state = { prisoner: null, saved: {} };

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

  function load() {
    try { state.saved = JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { state.saved = {}; }
  }

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state.saved)); } catch (e) {}
  }

  function rec(id) {
    var r = state.saved[id] || (state.saved[id] = {});
    if (!r.owned) { r.owned = []; }
    if (typeof r.tickets !== 'number') { r.tickets = 0; }
    return r;
  }

  function identitiesOf(pid) {
    var base = data.identities[pid] || {};
    var list = Object.keys(base).map(function (k) {
      var o = base[k];
      return { id: k, name: o.name, rarity: o.rarity, season: o.season, initial: !!o.initial };
    });
    (data.sample[pid] || []).forEach(function (o) { list.push(o); });
    return list;
  }

  function isOpen(o) {
    if (!o.season) { return true; }
    var s = data.seasons[o.season];
    return !!(s && s.released);
  }

  function pool(pid) {
    var owned = rec(pid).owned;
    return identitiesOf(pid).filter(function (o) {
      return !o.initial && isOpen(o) && owned.indexOf(o.id) < 0;
    });
  }

  function weight(pid, o) {
    return rec(pid).pickup === o.id ? PICKUP_RATE : 1;
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
    var pu = rec(pid).pickup === o.id;
    return '<div class="ex-card' + (pu ? ' is-pu' : '') + '">' +
      '<img class="ex-card-icon" alt="" src="../image/icon/org/lcb.png">' +
      '<img class="ex-card-frame" alt="" src="../image/frame/' + esc(o.rarity || 1) + '.png">' +
      (pu ? '<span class="ex-card-pu">PICK UP</span>' : '') +
      '<span class="ex-card-name">' + esc(o.name) + '</span></div>';
  }

  function render() {
    var pid = state.prisoner;
    var p = data.prisoners[pid];
    var r = rec(pid);
    var list = pool(pid);
    var h = '<h1 class="ex-title">抽出</h1>';
    h += '<div class="ex-bar"><span class="ex-bar-name">' + esc(p.name) + '</span>' +
      '<span class="ex-ticket">抽出チケット <b>' + r.tickets + '</b> 枚</span>' +
      '<button class="ex-btn ex-pull" id="pull"' + (r.tickets > 0 && list.length ? '' : ' disabled') + '>抽出する</button></div>';
    h += '<section class="ex-sec"><h2 class="ex-sec-title">ピックアップ</h2><div class="ex-pu">' +
      '<select id="pu"><option value="">指定なし</option>';
    list.forEach(function (o) {
      h += '<option value="' + esc(o.id) + '"' + (r.pickup === o.id ? ' selected' : '') + '>' + esc(o.name) + '</option>';
    });
    h += '</select><span class="ex-pu-rate">指定した人格の排出確率が' + PICKUP_RATE + '倍になります</span></div></section>';
    h += '<section class="ex-sec"><h2 class="ex-sec-title">未所持の人格(' + list.length + ')</h2>';
    if (list.length) {
      h += '<ul class="ex-list">';
      list.forEach(function (o) { h += '<li>' + cardHtml(pid, o) + '</li>'; });
      h += '</ul>';
    } else {
      h += '<p class="ex-empty">抽出できる人格がありません。</p>';
    }
    h += '</section>';
    h += '<div class="ex-test"><p>【試作用】囚人とチケットは、後でユーザーIDとの紐付け・GM操作に置き換わります。</p>' +
      '<div class="ex-test-row"><select id="who">';
    Object.keys(data.prisoners).sort(function (a, b) {
      return (data.prisoners[a].no || 99) - (data.prisoners[b].no || 99);
    }).forEach(function (id) {
      h += '<option value="' + esc(id) + '"' + (id === pid ? ' selected' : '') + '>' + esc(data.prisoners[id].name) + '</option>';
    });
    h += '</select><button class="ex-btn" id="add">チケット+1</button>' +
      '<button class="ex-btn" id="reset">この囚人をリセット</button></div></div>';
    h += '<a class="ex-back" href="../">メインページへ戻る</a>';
    h += '<div class="ex-result" id="result" hidden></div>';
    app.innerHTML = h;

    document.getElementById('who').onchange = function () { state.prisoner = this.value; render(); };
    document.getElementById('add').onclick = function () { r.tickets += 1; save(); render(); };
    document.getElementById('reset').onclick = function () { state.saved[pid] = {}; save(); render(); };
    document.getElementById('pu').onchange = function () { r.pickup = this.value || null; save(); render(); };
    document.getElementById('pull').onclick = function () {
      if (r.tickets < 1 || !pool(pid).length) { return; }
      var got = draw(pid);
      r.tickets -= 1;
      r.owned.push(got.id);
      if (r.pickup === got.id) { r.pickup = null; }
      save();
      render();
      var box = document.getElementById('result');
      box.innerHTML = '<span class="ex-result-label">NEW</span>' + cardHtml(pid, got) +
        '<button class="ex-btn" id="close">閉じる</button>';
      box.hidden = false;
      document.getElementById('close').onclick = function () { box.hidden = true; };
    };
  }

  load();
  getJson('../data/prisoners.json').then(function (pr) {
    data.prisoners = pr;
    return Promise.all([
      getJson('../data/seasons.json', true),
      getJson('sample.json', true),
      Promise.all(Object.keys(pr).map(function (id) {
        return getJson('../data/' + id + '/identities.json', true).then(function (d) { data.identities[id] = d; });
      }))
    ]);
  }).then(function (res) {
    data.seasons = res[0];
    data.sample = res[1];
    state.prisoner = Object.keys(data.prisoners).sort(function (a, b) {
      return (data.prisoners[a].no || 99) - (data.prisoners[b].no || 99);
    })[0];
    Object.keys(data.prisoners).forEach(function (id) {
      if (data.prisoners[id].no === 5) { state.prisoner = id; }
    });
    render();
  }).catch(function (e) {
    app.innerHTML = '<p class="ex-note">' + esc(e.message) + '</p>';
  });
})();
