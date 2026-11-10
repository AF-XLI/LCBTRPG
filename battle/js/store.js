(function (root) {
  'use strict';

  var FIREBASE_VERSION = '10.12.2';

  function isPlain(v) { return v && typeof v === 'object' && !Array.isArray(v); }

  function diffPatch(oldV, newV, maxDepth) {
    var patch = {};
    function walk(a, b, path, depth) {
      if (depth < maxDepth && isPlain(a) && isPlain(b)) {
        var keys = {};
        Object.keys(a).forEach(function (k) { keys[k] = 1; });
        Object.keys(b).forEach(function (k) { keys[k] = 1; });
        Object.keys(keys).forEach(function (k) { walk(a[k], b[k], path ? path + '/' + k : k, depth + 1); });
        return;
      }
      var sa = JSON.stringify(a === undefined ? null : a);
      var sb = JSON.stringify(b === undefined ? null : b);
      if (sa !== sb) { patch[path] = b === undefined ? null : b; }
    }
    walk(oldV || {}, newV || {}, '', 0);
    delete patch[''];
    return patch;
  }

  function applyPatch(state, patch) {
    Object.keys(patch).forEach(function (path) {
      var parts = path.split('/');
      var cur = state;
      for (var i = 0; i < parts.length - 1; i += 1) {
        if (!isPlain(cur[parts[i]]) && !Array.isArray(cur[parts[i]])) { cur[parts[i]] = {}; }
        cur = cur[parts[i]];
      }
      var last = parts[parts.length - 1];
      var v = patch[path];
      if (v === null || v === undefined) {
        if (Array.isArray(cur)) { cur[Number(last)] = null; } else { delete cur[last]; }
      } else {
        cur[last] = JSON.parse(JSON.stringify(v));
      }
    });
    return state;
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

  function createLocal(roomId, onState) {
    var key = 'lc-battle:' + roomId;
    var state = {};
    try { state = JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { state = {}; }
    var chan = null;
    try { chan = new BroadcastChannel(key); } catch (e) { chan = null; }
    function save() { try { localStorage.setItem(key, JSON.stringify(state)); } catch (e) { /* 保存できなくても動作は続ける */ } }
    function emit() { onState(JSON.parse(JSON.stringify(state))); }
    if (chan) {
      chan.onmessage = function (ev) {
        if (ev.data && ev.data.patch) { applyPatch(state, ev.data.patch); save(); emit(); }
      };
    }
    root.addEventListener('storage', function (ev) {
      if (ev.key === key && ev.newValue) {
        try { state = JSON.parse(ev.newValue); emit(); } catch (e) { /* 無視 */ }
      }
    });
    setTimeout(emit, 0);
    return Promise.resolve({
      mode: 'local',
      write: function (patch) {
        var clean = JSON.parse(JSON.stringify(patch));
        applyPatch(state, clean);
        save();
        if (chan) { chan.postMessage({ patch: clean }); }
        emit();
        return Promise.resolve();
      },
      reset: function () {
        state = {};
        save();
        if (chan) { chan.postMessage({ patch: { '': null } }); }
        emit();
      },
      close: function () { if (chan) { chan.close(); } }
    });
  }

  function authReady(auth) {
    return new Promise(function (resolve) {
      var off = auth.onAuthStateChanged(function (user) { off(); resolve(user); });
    });
  }

  // GMとプレイヤーはハブ(トップページ)でGoogleログインしておく(観戦は匿名)。GMは admins/(UID) が true、プレイヤーは players/(UID) にキャラのIDが登録されている必要がある
  function signIn(fb, auth, wantGoogle) {
    return authReady(auth).then(function (user) {
      if (wantGoogle) {
        if (user && !user.isAnonymous) { return user; }
        throw new Error('ログインしていません。トップページ(ハブ)でGoogleログインしてから、もう一度入室してください。');
      }
      if (user) { return user; }
      return auth.signInAnonymously().then(function (r) { return r.user; });
    });
  }

  function createFirebase(roomId, config, onState, onStatus, role) {
    var base = 'https://www.gstatic.com/firebasejs/' + FIREBASE_VERSION + '/';
    var useAuth = config.useAuth !== false;
    return loadScript(base + 'firebase-app-compat.js')
      .then(function () { return loadScript(base + 'firebase-database-compat.js'); })
      .then(function () { return useAuth ? loadScript(base + 'firebase-auth-compat.js') : null; })
      .then(function () {
        var fb = root.firebase;
        var app = fb.apps && fb.apps.length ? fb.apps[0] : fb.initializeApp(config);
        var ready = useAuth ? signIn(fb, fb.auth(app), role === 'gm' || role === 'player') : Promise.resolve(null);
        return ready.then(function (user) { return { fb: fb, app: app, user: user }; });
      })
      .then(function (ctx) {
        var db = ctx.fb.database(ctx.app);
        var gate = role === 'gm' && ctx.user ? db.ref('admins/' + ctx.user.uid).once('value').then(function (snap) {
          if (snap.val() !== true) {
            ctx.fb.auth(ctx.app).signOut();
            throw new Error('このアカウントにはGM権限がありません。\nGMとして登録するには、次のUIDを管理者(データベースの admins)に登録してください。\nUID: ' + ctx.user.uid);
          }
        }, function () {
          ctx.fb.auth(ctx.app).signOut();
          throw new Error('GM権限を確認できませんでした(データベースのルールに admins が設定されていない可能性があります)。\nUID: ' + ctx.user.uid);
        }) : Promise.resolve();
        var unitId = '';
        var mine = role === 'player' && ctx.user ? db.ref('players/' + ctx.user.uid).once('value').then(function (snap) {
          var v = snap.val();
          if (typeof v !== 'string' || !v) {
            ctx.fb.auth(ctx.app).signOut();
            throw new Error('このアカウントにはキャラクターが登録されていません。\nGMに、次のUIDとキャラクターのIDを伝えて登録してもらってください。\nUID: ' + ctx.user.uid);
          }
          unitId = v;
        }, function () {
          ctx.fb.auth(ctx.app).signOut();
          throw new Error('キャラクターの登録を確認できませんでした(データベースのルールに players が設定されていない可能性があります)。\nUID: ' + ctx.user.uid);
        }) : Promise.resolve();
        return gate.then(function () { return mine; }).then(function () { ctx.unitId = unitId; return ctx; });
      })
      .then(function (ctx) {
        var db = ctx.fb.database(ctx.app);
        var ref = db.ref('rooms/' + roomId + '/state');
        ref.on('value', function (snap) { onState(snap.val() || {}); }, function (err) { if (onStatus) { onStatus('error', err.message); } });
        db.ref('.info/connected').on('value', function (snap) { if (onStatus) { onStatus(snap.val() ? 'online' : 'offline'); } });
        return {
          mode: 'firebase',
          uid: ctx.user ? ctx.user.uid : '',
          unitId: ctx.unitId || '',
          write: function (patch) {
            var clean = JSON.parse(JSON.stringify(patch));
            return ref.update(clean).catch(function (e) { if (onStatus) { onStatus('error', '書き込めませんでした: ' + e.message); } });
          },
          reset: function () { return ref.set(null); },
          close: function () { ref.off(); }
        };
      });
  }

  function create(opts) {
    var cfg = root.LC_FIREBASE_CONFIG;
    var usable = cfg && cfg.apiKey && cfg.databaseURL;
    if (usable && !opts.forceLocal) { return createFirebase(opts.roomId, cfg, opts.onState, opts.onStatus, opts.role); }
    return createLocal(opts.roomId, opts.onState);
  }

  root.LCStore = { create: create, diffPatch: diffPatch, applyPatch: applyPatch, hasFirebase: function () { var c = root.LC_FIREBASE_CONFIG; return !!(c && c.apiKey && c.databaseURL); } };
}(typeof self !== 'undefined' ? self : this));
