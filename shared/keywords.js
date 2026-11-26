(function (root) {
  'use strict';

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
