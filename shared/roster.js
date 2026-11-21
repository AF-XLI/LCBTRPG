(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.LCRoster = factory(); }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var RANKS = ['ZAYIN', 'TETH', 'HE', 'WAW', 'ALEPH'];

  function isReleased(identity, seasons) {
    if (!identity || !identity.season) { return true; }
    var season = seasons && seasons[identity.season];
    return !!(season && season.released);
  }

  function isOwned(id, identity, owned) {
    if (!identity) { return false; }
    if (identity.initial) { return true; }
    return !!(owned && owned[id] === true);
  }

  function pickIdentity(info, identities, seasons, remote, notes) {
    var def = info.default || {};
    var listed = info.identities || [];
    var id = remote && remote.identity;
    if (id) {
      var it = identities[id];
      if (listed.indexOf(id) < 0 || !it) {
        id = '';
      } else if (!isReleased(it, seasons)) {
        notes.push('装備中の人格「' + it.name + '」は未公開のため、既定の人格にしました');
        id = '';
      } else if (!isOwned(id, it, remote && remote.owned)) {
        notes.push('装備中の人格「' + it.name + '」は未所持のため、既定の人格にしました');
        id = '';
      }
    }
    return id || def.identity;
  }

  function pickEgos(info, egosMaster, remote) {
    var def = info.default || {};
    var listed = info.egos || [];
    var out = [];
    RANKS.forEach(function (rank) {
      var rid = remote && remote.egos && remote.egos[rank];
      var ok = rid && listed.indexOf(rid) >= 0 && egosMaster[rid] && egosMaster[rid].rank === rank;
      if (!ok) { rid = def.egos && def.egos[rank]; }
      if (rid && egosMaster[rid]) { out.push(Object.assign({ rank: rank }, egosMaster[rid])); }
    });
    return out;
  }

  // 囚人1人分の味方データ(戦闘用)を作ります。装備は Firebase の characters/<囚人ID>(remote)から、なければ既定の装備
  function buildAlly(pid, info, identities, egosMaster, seasons, remote, imgBase) {
    var notes = [];
    var identityId = pickIdentity(info, identities, seasons, remote, notes);
    var identity = identities[identityId];
    if (!identity) { throw new Error(info.name + ': 人格「' + identityId + '」が見つかりません'); }
    var unit = Object.assign({}, identity, {
      id: pid,
      name: info.name,
      identityName: identity.name,
      egos: pickEgos(info, egosMaster, remote)
    });
    if (info.icon) { unit.img = (imgBase || '') + info.icon; }
    return { unit: unit, notes: notes };
  }

  return { RANKS: RANKS, isReleased: isReleased, isOwned: isOwned, pickIdentity: pickIdentity, pickEgos: pickEgos, buildAlly: buildAlly };
}));
