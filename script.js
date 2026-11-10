(function (root) {
  'use strict';

  var FIREBASE_VERSION = '10.12.2';
  var $ = function (id) { return document.getElementById(id); };
  var cfg = root.LC_FIREBASE_CONFIG;
  var usable = !!(cfg && cfg.apiKey && cfg.databaseURL && cfg.useAuth !== false);
  var fb = null;
  var app = null;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function () { reject(new Error('読み込めませんでした: ' + src)); };
      document.head.appendChild(s);
    });
  }

  function show(id, on) { $(id).hidden = !on; }

  function render(user) {
    var logged = !!(user && !user.isAnonymous);
    show('hubLogin', !logged);
    show('hubLogout', logged);
    show('hubInfo', logged);
    if (!logged) {
      $('hubState').textContent = 'ログインしていません。GMとプレイヤーとして戦闘システムに入るには、Googleでログインしてください(観戦はログイン不要です)。';
      return;
    }
    $('hubState').textContent = 'ログイン中です。';
    $('hubName').textContent = user.displayName || '(名前なし)';
    $('hubUid').textContent = user.uid;
    $('hubGm').textContent = '確認しています…';
    $('hubChar').textContent = '確認しています…';
    var db = fb.database(app);
    db.ref('admins/' + user.uid).once('value').then(function (s) {
      $('hubGm').textContent = s.val() === true ? '登録済み' : '未登録';
    }, function () { $('hubGm').textContent = '確認できません(データベースのルールを確認してください)'; });
    db.ref('players/' + user.uid).once('value').then(function (s) {
      var v = s.val();
      $('hubChar').textContent = typeof v === 'string' && v ? v : '未登録';
    }, function () { $('hubChar').textContent = '確認できません(データベースのルールを確認してください)'; });
  }

  function init() {
    if (!usable) {
      $('hubState').textContent = 'Firebase が未設定(または認証なし)のため、ローカルモードです。ログインは不要で、戦闘システムへそのまま進めます。';
      return;
    }
    var base = 'https://www.gstatic.com/firebasejs/' + FIREBASE_VERSION + '/';
    loadScript(base + 'firebase-app-compat.js')
      .then(function () { return loadScript(base + 'firebase-database-compat.js'); })
      .then(function () { return loadScript(base + 'firebase-auth-compat.js'); })
      .then(function () {
        fb = root.firebase;
        app = fb.apps && fb.apps.length ? fb.apps[0] : fb.initializeApp(cfg);
        fb.auth(app).onAuthStateChanged(render);
        $('hubLogin').addEventListener('click', function () {
          fb.auth(app).signInWithPopup(new fb.auth.GoogleAuthProvider()).catch(function (e) {
            alert('Googleログインできませんでした。\n' + (e && e.message ? e.message : ''));
          });
        });
        $('hubLogout').addEventListener('click', function () { fb.auth(app).signOut(); });
        $('hubCopy').addEventListener('click', function () {
          var t = $('hubUid').textContent;
          if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t); }
        });
      })
      .catch(function (e) { $('hubState').textContent = '読み込めませんでした。' + e.message; });
  }

  init();
}(typeof self !== 'undefined' ? self : this));
