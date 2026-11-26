(function (root) {
  'use strict';

  var TIMEOUT_MS = 10000;
  var IMAGE_WAIT_MS = 5000;
  var FADE_MS = 350;
  var el = document.createElement('div');
  var finished = false;
  var limitTimer = null;
  var removeTimer = null;
  el.className = 'lc-loading';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', '読み込み中');
  el.innerHTML = '<div class="lc-loading-ring"></div><span class="lc-loading-text">LOADING</span>';
  document.documentElement.appendChild(el);

  function done() {
    if (finished) { return; }
    finished = true;
    clearTimeout(limitTimer);
    el.classList.add('is-done');
    removeTimer = setTimeout(function () { if (el.parentNode) { el.parentNode.removeChild(el); } }, FADE_MS);
  }

  function show() {
    if (!finished) { return; }
    finished = false;
    clearTimeout(removeTimer);
    el.classList.remove('is-done');
    if (!el.parentNode) { document.documentElement.appendChild(el); }
    clearTimeout(limitTimer);
    limitTimer = setTimeout(done, TIMEOUT_MS);
  }

  function doneAfterImages(container) {
    if (finished) { return; }
    var pending = [];
    [].slice.call(container.querySelectorAll('img')).forEach(function (im) { if (!im.complete) { pending.push(im); } });
    [].slice.call(container.querySelectorAll('[style*="background-image"]')).forEach(function (node) {
      var m = /url\(["']?([^"')]+)["']?\)/.exec(node.getAttribute('style') || '');
      if (m) { var im = new Image(); im.src = m[1]; if (!im.complete) { pending.push(im); } }
    });
    var left = pending.length;
    if (!left) { done(); return; }
    pending.forEach(function (im) {
      var one = function () { left -= 1; if (left <= 0) { done(); } };
      im.addEventListener('load', one);
      im.addEventListener('error', one);
    });
    setTimeout(done, IMAGE_WAIT_MS);
  }

  limitTimer = setTimeout(done, TIMEOUT_MS);
  root.LC_LOADING = { done: done, show: show, doneAfterImages: doneAfterImages };
}(typeof self !== 'undefined' ? self : this));
