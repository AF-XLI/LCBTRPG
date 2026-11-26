(function (root) {
  'use strict';

  // 人格のキーワードは文字列、または打消し線つきの { "text": "W社", "strike": true }。打消し線は見た目だけで、判定には影響しない
  function list(identity) {
    var src = identity && Array.isArray(identity.keywords) ? identity.keywords : [];
    var out = [];
    src.forEach(function (k) {
      if (typeof k === 'string' && k) {
        out.push({ text: k, strike: false });
      } else if (k && typeof k.text === 'string' && k.text) {
        out.push({ text: k.text, strike: k.strike === true });
      }
    });
    return out;
  }

  function names(identity) {
    return list(identity).map(function (k) { return k.text; });
  }

  function has(identity, word) {
    return names(identity).indexOf(word) !== -1;
  }

  root.LC_KEYWORDS = { list: list, names: names, has: has };
}(typeof self !== 'undefined' ? self : this));
