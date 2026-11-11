(function () {
  'use strict';

  var list = document.getElementById('hubList');

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  fetch('../data/prisoners.json')
    .then(function (res) {
      if (!res.ok) { throw new Error('data/prisoners.json を読み込めませんでした(' + res.status + ')'); }
      return res.json();
    })
    .then(function (all) {
      var h = '';
      Object.keys(all).forEach(function (id) {
        var p = all[id];
        h += '<li><a class="hub-card" href="' + esc(id) + '/">' +
          '<span class="hub-card-icon"><img alt="" src="../' + esc(p.icon) + '"></span>' +
          '<span class="hub-card-name">' + esc(p.name) + '</span></a></li>';
      });
      list.innerHTML = h || '<li class="hub-note">囚人が登録されていません。</li>';
    })
    .catch(function (e) { list.innerHTML = '<li class="hub-note">' + esc(e.message) + '</li>'; });
}());
