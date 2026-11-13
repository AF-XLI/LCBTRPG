'use strict';

var fs = require('fs');
var path = require('path');
var FX = require('../shared/effects.js');

var root = path.join(__dirname, '..');
var dataDir = path.join(root, 'data');
var errors = [];

function check(effects, where, allowCoin, coins) {
  var broken = false;
  (effects || []).forEach(function (e, i) {
    var found = FX.validate(e, { where: where + ' effects[' + i + ']', allowCoin: allowCoin, coins: coins });
    if (found.length) { broken = true; }
    found.forEach(function (m) { errors.push(m); });
  });
  if (broken) { return; }
  try {
    FX.toGrants(effects || []);
  } catch (err) {
    errors.push(where + ': ' + err.message);
  }
}

function checkPassive(p, where) {
  if (!p) { return; }
  if (!p.effects || !p.effects.length) { errors.push(where + ': effects がありません'); return; }
  check(p.effects, where, false);
}

function checkSkill(s, where) {
  if (!FX.SIN_BY_ID[s.sin]) { errors.push(where + ': 未登録の罪悪 "' + s.sin + '"'); }
  check(s.effects, where, true, s.coins);
}

fs.readdirSync(dataDir).forEach(function (dir) {
  var full = path.join(dataDir, dir);
  if (!fs.statSync(full).isDirectory()) { return; }
  var idf = path.join(full, 'identities.json');
  var egf = path.join(full, 'egos.json');
  if (fs.existsSync(idf)) {
    var ids = JSON.parse(fs.readFileSync(idf, 'utf8'));
    Object.keys(ids).forEach(function (k) {
      var it = ids[k];
      var w = dir + '/identities/' + k;
      (it.skills || []).forEach(function (s, i) { checkSkill(s, w + ' skills[' + i + ']'); });
      if (it.defense) { checkSkill(it.defense, w + ' defense'); }
      checkPassive(it.passive, w + ' passive');
      checkPassive(it.support, w + ' support');
    });
  }
  if (fs.existsSync(egf)) {
    var egs = JSON.parse(fs.readFileSync(egf, 'utf8'));
    Object.keys(egs).forEach(function (k) {
      var eg = egs[k];
      var w = dir + '/egos/' + k;
      checkSkill(eg, w);
      if (eg.corrosion) { checkSkill(eg.corrosion, w + ' corrosion'); }
      checkPassive(eg.passive, w + ' passive');
    });
  }
});

if (errors.length) {
  console.error(errors.join('\n'));
  console.error('\n' + errors.length + ' 件の問題があります');
  process.exit(1);
}
console.log('問題ありません');
