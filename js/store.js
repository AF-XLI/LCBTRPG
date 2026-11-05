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

  function createFirebase(roomId, config, onState, onStatus) {
    var base = 'https://www.gstatic.com/firebasejs/' + FIREBASE_VERSION + '/';
    return loadScript(base + 'firebase-app-compat.js')
      .then(function () { return loadScript(base + 'firebase-database-compat.js'); })
      .then(function () { return config.useAuth === false ? null : loadScript(base + 'firebase-auth-compat.js'); })
      .then(function () {
        var fb = root.firebase;
        var app = fb.apps && fb.apps.length ? fb.apps[0] : fb.initializeApp(config);
        var ready = config.useAuth === false ? Promise.resolve() : fb.auth(app).signInAnonymously();
        return ready.then(function () { return { fb: fb, app: app }; });
      })
      .then(function (ctx) {
        var db = ctx.fb.database(ctx.app);
        var ref = db.ref('rooms/' + roomId + '/state');
        ref.on('value', function (snap) { onState(snap.val() || {}); }, function (err) { if (onStatus) { onStatus('error', err.message); } });
        db.ref('.info/connected').on('value', function (snap) { if (onStatus) { onStatus(snap.val() ? 'online' : 'offline'); } });
        return {
          mode: 'firebase',
          write: function (patch) {
            var clean = JSON.parse(JSON.stringify(patch));
            return ref.update(clean);
          },
          reset: function () { return ref.set(null); },
          close: function () { ref.off(); }
        };
      });
  }

  function create(opts) {
    var cfg = root.LC_FIREBASE_CONFIG;
    var usable = cfg && cfg.apiKey && cfg.databaseURL;
    if (usable && !opts.forceLocal) { return createFirebase(opts.roomId, cfg, opts.onState, opts.onStatus); }
    return createLocal(opts.roomId, opts.onState);
  }

  root.LCStore = { create: create, diffPatch: diffPatch, applyPatch: applyPatch, hasFirebase: function () { var c = root.LC_FIREBASE_CONFIG; return !!(c && c.apiKey && c.databaseURL); } };
}(typeof self !== 'undefined' ? self : this));
