(function (root) {
  'use strict';

  var TIMEOUT_MS = 10000;
  var FADE_MS = 350;
  var el = document.createElement('div');
  var finished = false;
  el.className = 'lc-loading';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', '読み込み中');
  el.innerHTML = '<div class="lc-loading-ring"></div><span class="lc-loading-text">LOADING</span>';
  document.documentElement.appendChild(el);

  // 各ページが表示の準備を終えたときに呼ぶ。呼ばれなくても TIMEOUT_MS で消える
  function done() {
    if (finished) { return; }
    finished = true;
    el.classList.add('is-done');
    setTimeout(function () { if (el.parentNode) { el.parentNode.removeChild(el); } }, FADE_MS);
  }

  setTimeout(done, TIMEOUT_MS);
  root.LC_LOADING = { done: done };
}(typeof self !== 'undefined' ? self : this));
