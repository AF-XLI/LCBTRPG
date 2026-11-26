(function (root) {
  'use strict';

  var SETTINGS_KEY = 'lcbtrpg.bgm';
  var POSITION_KEY = 'lcbtrpg.bgm.position';
  var GESTURES = ['pointerup', 'mousedown', 'touchend', 'keydown'];
  var RESUME_MS = 10000;
  var script = document.currentScript;
  var track = script ? script.getAttribute('data-track') : '';
  if (!script || !track) { return; }

  var src = new URL(track, new URL('../', script.src)).href;
  var audio = null;
  var waiting = false;
  var lastSave = 0;
  var settings = loadSettings();
  var ui = {};

  function readJson(key, fallback) {
    try {
      var v = root.localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try { root.localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  function loadSettings() {
    var s = readJson(SETTINGS_KEY, {}) || {};
    var v = typeof s.volume === 'number' && s.volume >= 0 && s.volume <= 1 ? s.volume : 0.5;
    return { on: s.on === true, volume: v };
  }

  function saveSettings() {
    writeJson(SETTINGS_KEY, settings);
  }

  function savePosition() {
    if (!audio || audio.paused || !isFinite(audio.currentTime)) { return; }
    var pos = readJson(POSITION_KEY, {}) || {};
    pos[track] = { t: audio.currentTime, at: Date.now() };
    writeJson(POSITION_KEY, pos);
  }

  function savedPosition() {
    var pos = (readJson(POSITION_KEY, {}) || {})[track];
    if (!pos || typeof pos.t !== 'number' || typeof pos.at !== 'number') { return 0; }
    var gap = Date.now() - pos.at;
    return gap >= 0 && gap < RESUME_MS ? pos.t + gap / 1000 : 0;
  }

  function onTime() {
    var now = Date.now();
    if (now - lastSave >= 1000) {
      lastSave = now;
      savePosition();
    }
  }

  function onError() {
    if (!ui.note) { return; }
    ui.note.hidden = false;
    ui.note.textContent = 'BGMの音声ファイルを読み込めませんでした(' + track + ')。';
  }

  function onPlaying() {
    if (ui.note) { ui.note.hidden = true; }
  }

  function ensureAudio() {
    if (audio) { return audio; }
    audio = new Audio();
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = settings.volume;
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('error', onError);
    audio.addEventListener('playing', onPlaying);
    audio.src = src;
    var t = savedPosition();
    if (t > 0) {
      try { audio.currentTime = t; } catch (e) {}
    }
    return audio;
  }

  function setWaiting(on) {
    if (on === waiting) { return; }
    waiting = on;
    GESTURES.forEach(function (name) {
      if (on) {
        document.addEventListener(name, start, true);
      } else {
        document.removeEventListener(name, start, true);
      }
    });
  }

  function start() {
    if (!settings.on) { return; }
    var p;
    try { p = ensureAudio().play(); } catch (e) { return; }
    if (p && typeof p.then === 'function') {
      p.then(function () {
        setWaiting(false);
      }, function (err) {
        if (err && err.name === 'NotAllowedError') { setWaiting(true); }
      });
    }
  }

  function stop() {
    setWaiting(false);
    if (audio) {
      savePosition();
      audio.pause();
    }
  }

  function syncUi() {
    if (ui.toggle) {
      ui.toggle.textContent = 'BGM: ' + (settings.on ? 'ON' : 'OFF');
      ui.toggle.setAttribute('aria-pressed', String(settings.on));
      ui.toggle.classList.toggle('primary', settings.on);
    }
    if (ui.volume) { ui.volume.value = String(Math.round(settings.volume * 100)); }
  }

  function apply() {
    if (audio) { audio.volume = settings.volume; }
    if (settings.on) { start(); } else { stop(); }
    syncUi();
  }

  function bindUi() {
    ui.toggle = document.getElementById('bgmToggle');
    ui.volume = document.getElementById('bgmVolume');
    ui.note = document.getElementById('bgmNote');
    if (ui.toggle) {
      ui.toggle.addEventListener('click', function () {
        settings.on = !settings.on;
        saveSettings();
        apply();
      });
    }
    if (ui.volume) {
      ui.volume.addEventListener('input', function () {
        settings.volume = Math.min(1, Math.max(0, Number(ui.volume.value) / 100));
        saveSettings();
        apply();
      });
    }
    syncUi();
  }

  function init() {
    bindUi();
    if (settings.on) { start(); }
  }

  root.addEventListener('pagehide', savePosition);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { savePosition(); }
  });
  root.addEventListener('storage', function (e) {
    if (e.key !== SETTINGS_KEY) { return; }
    settings = loadSettings();
    apply();
  });

  root.LC_BGM = {
    isPlaying: function () { return !!audio && !audio.paused; },
    isWaiting: function () { return waiting; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}(typeof self !== 'undefined' ? self : this));
