document.addEventListener('contextmenu', function (ev) {
  if (ev.target && ev.target.tagName === 'IMG') { ev.preventDefault(); }
});
document.addEventListener('dragstart', function (ev) {
  if (ev.target && ev.target.tagName === 'IMG') { ev.preventDefault(); }
});

(function (root) {
  'use strict';

  var FIREBASE_VERSION = '10.12.2';
  var RANKS = ['ZAYIN', 'TETH', 'HE', 'WAW', 'ALEPH'];
  var TAG_COLOR = { 1: 'blue', 2: 'red', 3: 'yellow' };
  var ROMAN = { 1: 'I', 2: 'II', 3: 'III' };

  var FX = root.LCEffects;
  var SINS = FX.SINS;
  var SIN_BY_ID = FX.SIN_BY_ID;
  var PLACEHOLDER = 'image/placeholder/portrait.webp';
  var PHYS = FX.PHYS;
  var RESIST_TYPES = Object.keys(PHYS);

  var TAB_NAMES = { overview: '概要', skill: 'スキル', ego: 'E.G.O' };
  var RANK_LETTERS = { ZAYIN: 'ז', TETH: 'ט', HE: 'ה', WAW: 'ו', ALEPH: 'א' };
  var PANEL_NAMES = { desc: '説明', memo: 'メモ' };
  var ICON_BACK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" aria-hidden="true">' +
    '<path d="M20 12H5M11 5l-7 7 7 7"/>' +
    '</svg>';
  var ICON_DESC =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5v13c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"/>' +
    '<path d="M12 6v13"/>' +
    '</svg>';
  var ICON_MEMO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5 20l1-4 10.5-10.5a2 2 0 012.8 0l.2.2a2 2 0 010 2.8L9 19z"/>' +
    '<path d="M14.5 7.5l3 3"/>' +
    '</svg>';
  var ICON_CLOSE_ALL =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square" aria-hidden="true">' +
    '<path d="M4 5l7 7-7 7M12 5l7 7-7 7"/>' +
    '</svg>';
  var ICON_CLOSE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" aria-hidden="true">' +
    '<path d="M5 5l14 14M19 5L5 19"/>' +
    '</svg>';

  var body = document.body;
  var charId = body.getAttribute('data-prisoner');
  var base = body.getAttribute('data-base') || '../../';
  var appEl = document.getElementById('app');
  var cfg = root.LC_FIREBASE_CONFIG;
  var firebaseUsable = !!(cfg && cfg.apiKey && cfg.databaseURL);

  var state = {
    prisoner: null,
    identities: {},
    egos: {},
    remote: {},
    roles: { admin: false, gm: false, player: false },
    view: 'sheet',
    personaId: '',
    detail: '',
    confirm: '',
    tab: 'overview',
    sub: 0,
    passive: false,
    egoMode: 'awaken',
    panel: '',
    editing: false,
    saving: false,
    status: ''
  };

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function img(path, cls, alt) {
    return '<img class="' + cls + '" alt="' + esc(alt || '') + '" src="' + esc(base + path) + '">';
  }

  function sideBtn(label, panel, icon) {
    return '<button class="side-btn" type="button" aria-label="' + label + '"' +
      ' aria-pressed="' + (state.panel === panel) + '" data-act="panel" data-panel="' + panel + '">' + icon + '</button>';
  }

  function vitalHtml(label, icon, value) {
    return '<div class="status" role="group" aria-label="' + label + ' ' + esc(value) + '">' +
      img('image/icon/' + icon + '.png', 'status-icon') + '<span class="status-num">' + esc(value) + '</span></div>';
  }

  // 人格の立ち絵: stageImage=立ち絵と背景が1枚 / portrait=立ち絵のみ(背景は囚人の背景) / 囚人の既定人格は囚人の立ち絵 / それ以外はプレースホルダー
  function identityArt(p, id, identity) {
    if (identity && identity.stageImage) {
      return { kind: 'stage', src: identity.stageImage, layout: identity };
    }
    if (identity && identity.portrait) {
      return { kind: 'portrait', src: identity.portrait, layout: identity, fit: true };
    }
    if (p.default && p.default.identity === id) {
      return { kind: 'portrait', src: p.portrait, layout: p, fit: true };
    }
    return { kind: 'portrait', src: PLACEHOLDER, layout: {}, placeholder: true };
  }

  function portraitHtml(art, p) {
    if (art.kind === 'stage') { return ''; }
    var lay = art.layout;
    var style = '';
    if (lay.portraitTop != null) {
      style = 'style="top: ' + lay.portraitTop + 'rem;' + (lay.portraitWidth != null ? ' width: ' + lay.portraitWidth + 'rem;' : '') + '" ';
    }
    return img(art.src, 'stage-portrait', p.name + 'の立ち絵').replace('<img ', '<img ' + style);
  }

  function artBgAttr(art, cls) {
    if (art.kind !== 'portrait' || art.placeholder) { return 'class="' + cls + '"'; }
    return 'class="' + cls + ' has-bg" style="background-image: url(\'' + esc(base + state.prisoner.background) + '\')"';
  }

  function artImgHtml(art, identity, cls, prefix) {
    prefix = prefix || 'card';
    var vars = '';
    if (identity && identity.cardPos) { vars += '--pos: ' + identity.cardPos + ';'; }
    if (identity && identity.cardZoom) { vars += '--zoom: ' + identity.cardZoom + ';'; }
    var lay = art.layout;
    if (art.fit && lay[prefix + 'Fit']) { vars += '--fit: ' + lay[prefix + 'Fit'] + ';'; }
    if (art.fit && (lay[prefix + 'X'] || lay.cardX)) { vars += '--x: ' + (lay[prefix + 'X'] || lay.cardX) + '%;'; }
    if (art.fit && lay[prefix + 'Shift']) { vars += '--shift: ' + lay[prefix + 'Shift'] + '%;'; }
    return img(art.src, cls + (art.placeholder ? ' is-ph' : '') + (art.fit ? ' is-fit' : ''), '').replace('<img ', '<img ' + (vars ? 'style="' + vars + '" ' : ''));
  }


  function headColorVar(color) {
    return color ? '--head-color: ' + color + ';' : '';
  }

  function sinVars(id) {
    var d = SIN_BY_ID[id];
    return d ? '--sin: ' + d.color + '; --sin-text: ' + d.text + ';' : '';
  }

  function statusInfo(id) {
    return FX.statusInfo(id);
  }

  function loadJson(path) {
    return fetch(base + path).then(function (res) {
      if (!res.ok) { throw new Error(path + ' を読み込めませんでした(' + res.status + ')'); }
      return res.json();
    });
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

  function canEditText() {
    return state.roles.admin || state.roles.player;
  }

  function equipment() {
    var p = state.prisoner;
    var def = p.default || {};
    var remote = state.remote || {};
    var identityId = remote.identity;
    if (!identityId || p.identities.indexOf(identityId) < 0 || !state.identities[identityId]) { identityId = def.identity; }
    var egos = {};
    RANKS.forEach(function (rank) {
      var rid = remote.egos && remote.egos[rank];
      var ok = rid && p.egos.indexOf(rid) >= 0 && state.egos[rid] && state.egos[rid].rank === rank;
      if (!ok) { rid = def.egos && def.egos[rank]; }
      egos[rank] = rid && state.egos[rid] ? state.egos[rid] : null;
    });
    return { identityId: identityId, identity: state.identities[identityId], egos: egos };
  }

  function canEquip() {
    return state.roles.admin || state.roles.gm || state.roles.player;
  }

  function route() {
    var parts = (location.hash || '').replace(/^#\/?/, '').split('/');
    var p = state.prisoner;
    state.detail = '';
    state.confirm = '';
    if (parts[0] === 'identities' && parts[1] && p && p.identities.indexOf(parts[1]) >= 0 && state.identities[parts[1]]) {
      state.view = 'persona';
      state.personaId = parts[1];
      state.sub = 0;
      state.passive = false;
      state.panel = '';
    } else if (parts[0] === 'identities') {
      state.view = 'list';
    } else if (parts[0] === 'egos') {
      state.view = 'egolist';
    } else {
      state.view = 'sheet';
    }
  }

  function piece(o) {
    var dir = 'image/skill/' + o.sin + '/';
    var h = '<div class="piece" aria-hidden="true">' +
      img(dir + 's' + o.tier + '-bg.png', 'piece-bg') +
      img('image/skill/skill-base.png', 'piece-base' + (o.tier === 1 ? ' is-first' : '')) +
      img('image/icon/' + o.type + '.png', 'piece-icon i-' + o.type) +
      img(dir + 's' + o.tier + '.png', 'piece-orn');
    if (o.tag != null) {
      var text = '+' + o.tag;
      h += '<span class="piece-tag is-' + o.sin + '" style="' + sinVars(o.sin) + '"><span class="piece-num">' + esc(text) + '</span></span>';
    }
    return h + '</div>';
  }

  function coinsHtml(n) {
    var h = '';
    for (var i = 0; i < n; i++) { h += img('image/skill/coin.png', 'coin'); }
    return '<div class="coins" aria-hidden="true">' + h + '</div>';
  }

  function skillUnit(o) {
    return '<div class="skill-unit" role="group" aria-label="' + esc(o.aria) + '">' +
      '<div class="skill-main">' +
      '<span class="skill-base" aria-hidden="true">' + esc(o.base) + '</span>' +
      piece(o.piece) +
      '<span class="skill-mult" aria-hidden="true">' + o.mult + '</span>' +
      '</div>' +
      coinsHtml(o.coins) +
      '<div class="skill-label">' + esc(o.label) + '</div>' +
      '</div>';
  }

  function skillsHtml(identity) {
    var h = '';
    identity.skills.forEach(function (s) {
      var deck = 4 - s.tier;
      h += skillUnit({
        aria: 'スキル' + s.tier + ' 基礎威力' + s.base + ' コイン威力+' + s.coin + ' コイン' + s.coins + '枚 山札' + deck + '枚',
        base: s.base,
        mult: '<span class="mult-x">×</span>' + deck,
        coins: s.coins,
        label: ROMAN[s.tier] || String(s.tier),
        piece: { sin: s.sin, tier: s.tier, type: s.type, tag: s.coin, color: TAG_COLOR[s.tier] || 'yellow' }
      });
    });
    var d = identity.defense;
    if (d) {
      h += skillUnit({
        aria: '守備 基礎威力' + d.base + ' コイン威力+' + d.coin + ' コイン' + d.coins + '枚',
        base: d.base,
        mult: '',
        coins: d.coins,
        label: 'DEFENSE',
        piece: { sin: d.sin, tier: 1, type: d.type, tag: d.coin, color: 'yellow' }
      });
    }
    return h;
  }

  function scrollWrap(inner) {
    return '<div class="scroll-wrap"><div class="scroll">' + inner + '</div></div>';
  }

  function skillItems(identity) {
    var items = [];
    identity.skills.forEach(function (s) {
      items.push({
        tab: 'スキル' + s.tier,
        name: s.name,
        sin: s.sin,
        type: s.type,
        base: s.base,
        coin: s.coin,
        coins: s.coins,
        deck: 4 - s.tier,
        piece: { sin: s.sin, tier: s.tier, type: s.type, tag: s.coin, color: TAG_COLOR[s.tier] || 'yellow' },
        effects: s.effects || [],
        defense: false
      });
    });
    var d = identity.defense;
    if (d) {
      items.push({
        tab: '守備',
        name: d.name,
        sin: d.sin,
        type: d.type,
        base: d.base,
        coin: d.coin,
        coins: d.coins,
        deck: 0,
        piece: { sin: d.sin, tier: 1, type: d.type, tag: d.coin, color: 'yellow' },
        effects: d.effects || [],
        defense: true
      });
    }
    return items;
  }

  function statusHtml(id) {
    var info = statusInfo(id);
    return '<span class="kw" style="--kw: ' + info.color + ';">' + img(info.icon, 'kw-icon') + esc(info.label) + '</span>';
  }

  function segsHtml(segs) {
    var body = '';
    segs.list.forEach(function (g) {
      body += g.status ? statusHtml(g.status) : '<span>' + esc(g.text) + '</span>';
    });
    return body;
  }

  function effectHtml(list) {
    var shown = list.filter(function (e) { return !e.hidden; });
    if (!shown.length) { return ''; }
    var first = FX.render(shown[0]);
    var lines = '';
    shown.forEach(function (e) {
      var r = FX.render(e);
      lines += '<span class="effect-text">' +
        (r.timing ? '<span class="effect-timing" style="--timing: ' + r.timingColor + ';">[' + esc(r.timing) + ']</span>' : '') +
        segsHtml(r.segs) +
        '</span>';
    });
    return '<div class="effect' + (first.coin ? ' has-coin' : '') + '">' +
      (first.coin ? img('image/icon/coin/' + first.coin + '.png', 'effect-coin', 'コイン' + first.coin) : '') +
      '<div class="effect-body">' + lines + '</div></div>';
  }

  function passiveTextHtml(p) {
    var lines = [];
    (p.effects || []).forEach(function (e) {
      var r = FX.render(e);
      var head = r.timing ? '<span>' + esc(r.timing) + '、</span>' : '';
      lines.push(head + segsHtml(r.segs));
    });
    return '<p class="passive-text">' + lines.join('<br>') + '</p>';
  }

  function passiveHtml(label, p) {
    return '<section class="passive" aria-label="' + label + '">' +
      '<div class="passive-kind">' + label + '</div>' +
      (p.name ? '<div class="passive-name"><span class="ribbon is-' + p.sin + '" style="' + sinVars(p.sin) + '">' + esc(p.name) + '</span></div>' : '') +
      (p.name && p.count !== undefined
        ? '<div class="passive-have">' + img('image/icon/sin/' + p.sin + '.png', 'passive-sin') + '<span>×' + esc(p.count) + ' 保有</span></div>'
        : '') +
      passiveTextHtml(p) +
      '</section>';
  }

  function passiveTabHtml(identity, subs) {
    var h = '';
    if (identity.passive) { h += passiveHtml('パッシブ', identity.passive); }
    if (identity.support) { h += passiveHtml('サポートパッシブ', identity.support); }
    return '<div class="skill-tab">' +
      '<div class="subtabs" role="group" aria-label="スキルの切り替え">' + subs + '</div>' +
      scrollWrap('<div class="passives">' + h + '</div>') +
      '</div>';
  }

  function skillTabHtml(identity) {
    var items = skillItems(identity);
    if (state.sub >= items.length) { state.sub = 0; }
    var cur = items[state.sub];
    var subs = '';
    items.forEach(function (it, i) {
      subs += '<button class="subtab is-' + it.sin + '" style="' + sinVars(it.sin) + '" type="button"' +
        ' aria-pressed="' + (!state.passive && i === state.sub) + '" data-act="sub" data-sub="' + i + '">' + esc(it.tab) + '</button>';
    });
    if (state.passive) { return passiveTabHtml(identity, subs); }
    return '<div class="skill-tab">' +
      '<div class="subtabs" role="group" aria-label="スキルの切り替え">' + subs + '</div>' +
      scrollWrap(detailHtml(cur)) +
      '</div>';
  }

  function detailHtml(cur) {
    var weight = '';
    for (var i = 0; i < (cur.weight || 1); i++) { weight += '<i></i>'; }
    var detail = '<div class="detail">' +
      '<span class="detail-base" aria-label="基礎威力">' + esc(cur.base) + '</span>' +
      '<div class="detail-piece">' + piece(cur.piece) + '</div>' +
      '<div class="detail-info">' +
      coinsHtml(cur.coins) +
      '<div class="detail-line"><span class="ribbon is-' + cur.sin + '" style="' + sinVars(cur.sin) + '">' + esc(cur.name) + '</span>' +
      (cur.defense || cur.ego ? '' : '<span class="detail-deck" aria-label="山札の枚数"><span class="mult-x">×</span>' + cur.deck + '</span>') + '</div>' +
      (cur.defense ? '' : '<span class="detail-weight">攻撃加重値' + weight + '</span>') +
      '</div></div>';
    var rows = '';
    var plain = cur.effects.filter(function (e) { return e.coin === undefined; });
    FX.sortByTiming(plain).forEach(function (e) { rows += effectHtml([e]); });
    for (var c = 1; c <= (cur.coins || 0); c++) {
      rows += effectHtml(FX.sortByTiming(cur.effects.filter(function (e) { return e.coin === c; })));
    }
    var effects = rows ? '<div class="effects">' + rows + '</div>' : '';
    return detail + effects;
  }

  function egoSkill(ego, src) {
    return {
      name: src.name || ego.name,
      sin: src.sin || ego.sin,
      type: src.type || ego.type,
      base: src.base,
      coin: src.coin,
      coins: src.coins,
      weight: src.weight,
      piece: { sin: src.sin || ego.sin, tier: 3, type: src.type || ego.type, tag: src.coin, color: 'yellow' },
      effects: src.effects || [],
      ego: true
    };
  }

  function egoTabHtml(eq) {
    var rank = RANKS[state.sub] || RANKS[0];
    var ego = eq.egos[rank];
    var subs = '';
    RANKS.forEach(function (rk, i) {
      var on = !!eq.egos[rk];
      var rsin = on ? eq.egos[rk].sin : '';
      subs += '<button class="subtab is-rank is-' + rsin + '" style="' + sinVars(rsin) + '" type="button" aria-pressed="' + (on && i === state.sub) + '"' +
        (on ? ' data-act="sub" data-sub="' + i + '"' : ' disabled') + ' aria-label="' + rk + '">' + RANK_LETTERS[rk] + '</button>';
    });
    var head = '<div class="subtabs is-rank" role="group" aria-label="E.G.Oの等級">' + subs + '</div>';
    if (!ego) {
      return '<div class="skill-tab">' + head + '<div class="tab-note">この等級のE.G.Oは未装備です。</div></div>';
    }
    var body;
    if (state.egoMode === 'passive' && ego.passive) {
      body = '<div class="passives">' + passiveHtml('パッシブ', ego.passive) + '</div>';
    } else if (state.egoMode === 'corrosion' && ego.corrosion) {
      body = detailHtml(egoSkill(ego, ego.corrosion));
    } else {
      body = detailHtml(egoSkill(ego, ego));
    }
    var cost = '';
    SINS.forEach(function (sin) {
      var k = sin.id;
      var n = (ego.cost && ego.cost[k]) || 0;
      cost += '<div class="cost' + (n ? '' : ' is-zero') + '" role="group" aria-label="' + sin.label + ' ' + n + '">' +
        img('image/icon/sin/' + k + '.png', 'cost-icon') + '<span class="cost-num">' + n + '</span></div>';
    });
    return '<div class="skill-tab is-ego">' + head + scrollWrap(body) +
      '<aside class="costs" aria-label="必要資源">' + cost + '</aside></div>';
  }

  function sinResistHtml(ego) {
    var h = '';
    SINS.forEach(function (sin) {
      var k = sin.id;
      var m = ego && ego.resist && ego.resist[k] != null ? ego.resist[k] : 1;
      var kind = m > 1 ? 'weak' : (m < 0.75 ? 'strong' : (m < 1 ? 'resist' : 'normal'));
      var label = m > 1 ? '脆弱' : (m < 0.75 ? '耐性' : (m < 1 ? '抵抗' : '普通'));
      h += '<div class="resist is-' + kind + '" role="group" aria-label="' + sin.label + ' ' + label + ' ×' + m + '">' +
        img('image/icon/sin/' + k + '.png', 'resist-icon') +
        '<div class="resist-text"><div class="resist-label">' + label + '</div><div class="resist-mult">[x' + m + ']</div></div></div>';
    });
    return h;
  }

  function modeNavHtml(items) {
    var h = '<div class="mode-nav">';
    items.forEach(function (it) {
      h += '<button class="mode-btn" type="button" aria-pressed="' + it.on + '" data-act="' + it.act + '"' +
        (it.mode ? ' data-mode="' + it.mode + '"' : '') + '>' + it.label + '</button>';
    });
    return h + '</div>';
  }

  function egoUnit(rank, ego) {
    var cls = 'ego-unit' + (ego ? ' is-on' : '');
    var h = '<div class="' + cls + '" role="group" aria-label="' + esc(rank + ' ' + (ego ? ego.name : '未装備')) + '">';
    if (ego) {
      h += piece({ sin: ego.sin, tier: 3, type: ego.type });
    } else {
      h += '<div class="piece is-empty">' + img('image/skill/empty-action.png', 'piece-empty') + '</div>';
    }
    h += img('image/icon/rank/' + rank.toLowerCase() + '.png', 'rank', rank);
    h += '<div class="ego-name' + (ego ? '' : ' is-none') + '">' + esc(ego ? ego.name : '-') + '</div>';
    return h + '</div>';
  }

  function resistHtml(identity) {
    var h = '';
    RESIST_TYPES.forEach(function (t) {
      var m = identity.resist && identity.resist[t] != null ? identity.resist[t] : 1;
      var kind = m > 1 ? 'weak' : (m < 1 ? 'strong' : 'normal');
      var label = m > 1 ? '脆弱' : (m < 1 ? '耐性' : '普通');
      h += '<div class="resist is-' + kind + '" role="group" aria-label="' + t + ' ' + label + ' ×' + m + '">' +
        img('image/icon/' + t + '.png', 'resist-icon') +
        '<div class="resist-text"><div class="resist-label">' + label + '</div><div class="resist-mult">[x' + m + ']</div></div>' +
        '</div>';
    });
    return h;
  }

  function speedText(identity) {
    var s = identity.speed || [];
    return s[0] === s[1] || s[1] == null ? String(s[0]) : s[0] + ' - ' + s[1];
  }

  function panelHtml() {
    if (!state.panel) { return ''; }
    var title = PANEL_NAMES[state.panel];
    var text = state.remote[state.panel] || '';
    var h = '<div class="panel" role="dialog" aria-label="' + title + '">' +
      '<div class="panel-head"><h2>' + title + '</h2>' +
      '<button class="panel-close" type="button" aria-label="閉じる" data-act="close">' + ICON_CLOSE + '</button></div>';
    if (state.editing) {
      h += '<label class="panel-label" for="panel-text">' + title + 'を入力</label>' +
        '<textarea id="panel-text" class="panel-text">' + esc(text) + '</textarea>' +
        '<div class="panel-actions">' +
        '<button class="panel-btn" type="button" data-act="cancel"' + (state.saving ? ' disabled' : '') + '>キャンセル</button>' +
        '<button class="panel-btn is-primary" type="button" data-act="save"' + (state.saving ? ' disabled' : '') + '>保存</button>' +
        '</div>';
    } else {
      h += '<div class="panel-body">' + (text ? esc(text) : '<span class="panel-empty">まだ書かれていません。</span>') + '</div>';
      if (canEditText()) {
        h += '<div class="panel-actions"><button class="panel-btn" type="button" data-act="edit">編集</button></div>';
      }
    }
    if (state.status) { h += '<p class="panel-status">' + esc(state.status) + '</p>'; }
    return h + '</div>';
  }

  function nameLines(identity) {
    return (identity.nameParts || [identity.name]).map(esc).join('<br>');
  }

  function miniPiece(sin, type, tier) {
    var dir = 'image/skill/' + sin + '/';
    return '<span class="pl-piece">' +
      img(dir + 's' + tier + '-bg.png', 'pl-piece-img') +
      img('image/skill/skill-base.png', 'pl-piece-img') +
      img('image/icon/' + type + '.png', 'pl-piece-img is-icon') +
      img(dir + 's' + tier + '.png', 'pl-piece-img') +
      '</span>';
  }

  function cardSkillsHtml(identity) {
    var h = '<span class="pl-sk">';
    identity.skills.forEach(function (s) {
      h += '<span class="pl-sk-row"><span>' + (ROMAN[s.tier] || s.tier) + '</span>' + miniPiece(s.sin, s.type, s.tier) + '</span>';
    });
    var d = identity.defense;
    if (d) { h += '<span class="pl-sk-row"><span>DEF</span>' + miniPiece(d.sin, d.type, 1) + '</span>'; }
    return h + '</span>';
  }

  function cardStatHtml(identity) {
    var h = '<span class="pl-st">' +
      '<span class="pl-st-line">' + img('image/icon/hp.png', 'pl-st-icon') + esc(identity.hp) + '</span>' +
      '<span class="pl-st-line">' + img('image/icon/speed.png', 'pl-st-icon') + esc(speedText(identity)) + '</span>' +
      '<span class="pl-rs">';
    RESIST_TYPES.forEach(function (t) {
      var m = identity.resist && identity.resist[t] != null ? identity.resist[t] : 1;
      var kind = m > 1 ? 'weak' : (m < 1 ? 'strong' : 'normal');
      var label = m > 1 ? '脆弱' : (m < 1 ? '耐性' : '普通');
      h += '<span class="pl-rs-item is-' + kind + '">' + img('image/icon/' + t + '.png', 'pl-rs-icon') +
        '<b>' + label + '</b><b>[x' + m + ']</b></span>';
    });
    return h + '</span></span>';
  }

  function cardHtml(id, identity, selected) {
    var det = state.detail;
    var art = identityArt(state.prisoner, id, identity);
    return '<a class="pl-card' + (selected ? ' is-sel' : '') + (det ? ' is-det' : '') + '" href="#identities/' + esc(id) + '" aria-label="' + esc(identity.name) + '">' +
      '<span class="pl-card-bg"></span>' +
      '<span ' + artBgAttr(art, 'pl-card-art') + '>' + artImgHtml(art, identity, 'pl-card-img') + '</span>' +
      img('image/frame/' + (identity.rarity || 1) + '.png', 'pl-card-frame') +
      (selected ? '<span class="pl-card-tag">SELECTED</span>' : '') +
      '<span class="pl-card-name">' + nameLines(identity) + '</span>' +
      (det === 'skill' ? cardSkillsHtml(identity) : (det === 'stat' ? cardStatHtml(identity) : '')) +
      '</a>';
  }

  function detailCtlHtml() {
    if (!state.detail) {
      return '<button class="pl-bev pl-detail" type="button" data-act="detail-open"><span class="pl-flip">' + ICON_CLOSE_ALL + '</span><span>詳細</span></button>';
    }
    return '<div class="pl-dctl" role="group" aria-label="詳細表示">' +
      '<button class="pl-dctl-close" type="button" aria-label="通常表示へ戻る" data-act="detail-close">' + ICON_CLOSE_ALL + '</button>' +
      '<button class="pl-dctl-op" type="button" aria-pressed="' + (state.detail === 'skill') + '" data-act="detail-mode" data-mode="skill">スキル</button>' +
      '<button class="pl-dctl-op" type="button" aria-pressed="' + (state.detail === 'stat') + '" data-act="detail-mode" data-mode="stat">人格</button>' +
      '</div>';
  }

  function bannerHtml(identity, id) {
    if (!identity) { return '<div class="pl-side-banner"></div>'; }
    var art = identityArt(state.prisoner, id, identity);
    return '<div ' + artBgAttr(art, 'pl-side-banner') + '>' + artImgHtml(art, identity, 'pl-card-img', 'banner') + '</div>';
  }

  function listSideHtml(eq) {
    var identity = eq.identity;
    var h = '<aside class="pl-side"><h2 class="pl-side-title">現在選択中の人格</h2>' +
      bannerHtml(identity, eq.identityId);
    RANKS.forEach(function (rank) {
      var ego = eq.egos[rank];
      h += '<div class="pl-ego' + (ego ? '' : ' is-none') + '"><span class="pl-ego-rank">' + RANK_LETTERS[rank] + '</span>' +
        '<span class="pl-ego-name">' + esc(ego ? ego.name : rank) + '</span></div>';
    });
    return h + '</aside>';
  }

  function listHtml() {
    var p = state.prisoner;
    var eq = equipment();
    var isEgo = state.view === 'egolist';
    var cards = '';
    if (isEgo) {
      cards = '<p class="pl-note">E.G.O一覧は準備中です。</p>';
    } else {
      p.identities.forEach(function (id) {
        if (state.identities[id]) { cards += cardHtml(id, state.identities[id], id === eq.identityId); }
      });
    }
    return '<div class="pl">' +
      img(p.icon, 'pl-logo', '') +
      '<div class="pl-bar"></div>' +
      '<a class="pl-back" href="#" aria-label="囚人ページへ戻る">' + ICON_BACK + '</a>' +
      '<h1 class="pl-title">' + (isEgo ? 'E.G.O' : '人格') + ': ' + esc(p.name) + '</h1>' +
      '<div class="pl-tabs">' +
      '<a class="pl-bev pl-tab" href="#identities" aria-current="' + (!isEgo) + '">人格</a>' +
      '<a class="pl-bev pl-tab" href="#egos" aria-current="' + isEgo + '">E.G.O</a>' +
      '</div>' +
      '<div class="pl-ctl">' + (isEgo ? '' : detailCtlHtml()) + '</div>' +
      '<div class="pl-grid">' + cards + '</div>' +
      listSideHtml(eq) +
      '</div>';
  }

  function confirmHtml() {
    if (!state.confirm) { return ''; }
    var identity = state.identities[state.personaId];
    return '<div class="confirm" role="dialog" aria-label="装備の確認"><div class="confirm-box">' +
      '<p class="confirm-text">「' + esc(identity.name) + '」を装備しますか？</p>' +
      '<div class="confirm-actions">' +
      '<button class="panel-btn" type="button" data-act="equip-no"' + (state.saving ? ' disabled' : '') + '>キャンセル</button>' +
      '<button class="panel-btn is-primary" type="button" data-act="equip-yes"' + (state.saving ? ' disabled' : '') + '>装備する</button>' +
      '</div>' + (state.status ? '<p class="panel-status">' + esc(state.status) + '</p>' : '') + '</div></div>';
  }

  function equipBtnHtml(eq) {
    if (state.personaId === eq.identityId) { return '<span class="persona-btn is-on">装備中</span>'; }
    if (!canEquip()) { return ''; }
    return '<button class="persona-btn" type="button" data-act="equip">装備</button>';
  }

  function equip() {
    if (!state.db || state.saving) {
      state.status = '保存できません。ログイン状態と接続を確認してください。';
      render();
      return;
    }
    state.saving = true;
    state.status = '保存しています…';
    render();
    state.db.ref('characters/' + charId + '/identity').set(state.personaId).then(function () {
      state.saving = false;
      state.status = '';
      state.confirm = '';
      location.hash = '';
    }, function (e) {
      state.saving = false;
      state.status = '保存できませんでした。' + (e && e.message ? e.message : '');
      render();
    });
  }

  function render() {
    if (state.view === 'list' || state.view === 'egolist') {
      appEl.innerHTML = listHtml();
      return;
    }
    var p = state.prisoner;
    var eq = equipment();
    var isPersona = state.view === 'persona';
    var tabNow = isPersona ? 'skill' : state.tab;
    var identity = isPersona ? state.identities[state.personaId] : eq.identity;
    var art = identityArt(p, isPersona ? state.personaId : eq.identityId, identity);
    var egoRow = '';
    RANKS.forEach(function (rank) { egoRow += egoUnit(rank, eq.egos[rank]); });

    var tabContent;
    if (tabNow === 'overview') {
      tabContent = scrollWrap('<div class="ego-row">' + egoRow + '</div>' +
        '<div class="divider" aria-hidden="true"></div>' +
        '<div class="skill-row">' + skillsHtml(identity) + '</div>');
    } else if (tabNow === 'skill') {
      tabContent = skillTabHtml(identity);
    } else {
      tabContent = egoTabHtml(eq);
    }
    var isEgoTab = tabNow === 'ego';
    var curEgo = isEgoTab ? eq.egos[RANKS[state.sub] || RANKS[0]] : null;
    var modeNav = '';
    if (tabNow === 'skill' && (identity.passive || identity.support)) {
      modeNav = modeNavHtml([{ label: 'パッシブ', on: state.passive, act: 'passive' }]);
    } else if (isEgoTab && curEgo) {
      var items = [{ label: '覚醒', on: state.egoMode === 'awaken', act: 'mode', mode: 'awaken' }];
      if (curEgo.corrosion) { items.push({ label: '侵食', on: state.egoMode === 'corrosion', act: 'mode', mode: 'corrosion' }); }
      if (curEgo.passive) { items.push({ label: 'パッシブ', on: state.egoMode === 'passive', act: 'mode', mode: 'passive' }); }
      modeNav = modeNavHtml(items);
    }
    var headHtml;
    if (isEgoTab && curEgo) {
      headHtml = '<header class="head" style="' + headColorVar(SIN_BY_ID[curEgo.sin] && SIN_BY_ID[curEgo.sin].color) + '">' +
        '<div class="head-ghost" aria-hidden="true">' + esc(curEgo.source || '') + '</div>' +
        '<div class="head-body">' +
        '<div class="head-rank">' + esc(curEgo.rank) + '</div>' +
        '<div class="head-identity">' +
        '<div class="head-icon">' + img(p.icon, 'head-icon-img', p.name + 'のアイコン') + '</div>' +
        '<div class="head-banner">' + esc(curEgo.name) + '</div>' +
        '</div>' +
        '</div></header>';
    } else {
      headHtml = '<header class="head" style="' + headColorVar(p.themeColor) + '">' +
      '<div class="head-ghost" aria-hidden="true">' + esc(p.name) + '</div>' +
      '<div class="head-body">' +
      '<div class="head-top">' +
      '<div class="head-affiliation">' + esc(identity.affiliation || '') + '</div>' +
      (identity.rarity != null ? img('image/icon/rarity/' + identity.rarity + '.png', 'head-rarity', 'レアリティ') : '') +
      '</div>' +
      '<div class="head-identity">' +
      '<div class="head-icon">' + img(p.icon, 'head-icon-img', p.name + 'のアイコン') + '</div>' +
      '<div class="head-banner">' + esc(identity.name) + '</div>' +
      '</div>' +
      '</div>' +
      '</header>';
    }

    var tabs = '';
    (isPersona ? ['skill'] : ['overview', 'skill', 'ego']).forEach(function (t) {
      tabs += '<button class="tab is-' + t + '" type="button" aria-pressed="' + (tabNow === t) + '" data-act="tab" data-tab="' + t + '">' + TAB_NAMES[t] + '</button>';
    });

    appEl.innerHTML =
      '<div class="sheet">' +
      '<section class="stage' + (isEgoTab ? ' is-ego' : '') + '" aria-label="囚人表示" style="background-image: url(\'' + esc(base + (art.kind === 'stage' ? art.src : p.background)) + '\')">' +
      portraitHtml(art, p) +
      '<div class="stage-shade" aria-hidden="true"></div>' +
      '<div class="stage-edge" aria-hidden="true"></div>' +
      '<nav class="side-nav" aria-label="補助機能">' +
      '<a class="side-btn is-back" href="' + (isPersona ? '#identities' : esc(base + 'character/')) + '" aria-label="' + (isPersona ? '人格一覧へ戻る' : 'ハブへ戻る') + '">' + ICON_BACK + '</a>' +
      sideBtn('説明', 'desc', ICON_DESC) +
      sideBtn('メモ', 'memo', ICON_MEMO) +
      '</nav>' +
      panelHtml() +
      '<div class="stage-info">' +
      '<div><div class="info-chip">ステータス</div><div class="status-row">' +
      vitalHtml('体力', 'hp', identity.hp) +
      vitalHtml('速度', 'speed', speedText(identity)) +
      '</div></div>' +
      '<div><div class="info-chip">耐性情報</div><div class="resist-row">' + resistHtml(identity) + '</div></div>' +
      '</div>' +
      (isEgoTab && curEgo ? '<div class="sin-resists" role="group" aria-label="E.G.Oの罪悪耐性">' + sinResistHtml(curEgo) + '</div>' : '') +
      '</section>' +
      '<main class="main">' +
      headHtml +
      '<div class="tabs" role="group" aria-label="表示切り替え">' + tabs +
      '<div class="head-actions">' +
      (isEgoTab && curEgo && curEgo.sp != null
        ? '<div class="head-sp">' + img('image/icon/sanity.png', 'head-sp-icon', '') + '<span>精神消耗量</span><b>' + esc(curEgo.sp) + '</b></div>'
        : '') +
      (isPersona ? equipBtnHtml(eq) : '<a class="persona-btn" href="' + (isEgoTab ? '#egos' : '#identities') + '">' + (isEgoTab ? 'E.G.O一覧' : '人格一覧') + '</a>') +
      '</div></div>' +
      modeNav +

      '<section class="content">' + tabContent + '</section>' +
      '</main>' +
      '</div>' +
      confirmHtml();
  }

  function showError(message) {
    appEl.innerHTML = '<div class="load-error">' + esc(message) + '</div>';
  }

  function textareaValue() {
    var el = document.getElementById('panel-text');
    return el ? el.value : '';
  }

  function save() {
    if (!state.db || state.saving) { return; }
    var key = state.panel;
    state.saving = true;
    state.status = '保存しています…';
    render();
    state.db.ref('characters/' + charId + '/' + key).set(textareaValue()).then(function () {
      state.saving = false;
      state.editing = false;
      state.status = '';
      render();
    }, function (e) {
      state.saving = false;
      state.status = '保存できませんでした。' + (e && e.message ? e.message : '');
      render();
    });
  }

  function onClick(e) {
    var el = e.target.closest('[data-act]');
    if (!el || !appEl.contains(el)) { return; }
    var act = el.getAttribute('data-act');
    if (act === 'tab') {
      if (state.view === 'persona') { return; }
      state.tab = el.getAttribute('data-tab');
      state.sub = 0;
      state.passive = false;
      state.egoMode = 'awaken';
    } else if (act === 'sub') {
      state.sub = Number(el.getAttribute('data-sub')) || 0;
      state.passive = false;
      state.egoMode = 'awaken';
    } else if (act === 'mode') {
      state.egoMode = el.getAttribute('data-mode') || 'awaken';
    } else if (act === 'passive') {
      state.passive = !state.passive;
    } else if (act === 'panel') {
      var name = el.getAttribute('data-panel');
      state.panel = state.panel === name ? '' : name;
      state.editing = false;
      state.status = '';
    } else if (act === 'close') {
      state.panel = '';
      state.editing = false;
      state.status = '';
    } else if (act === 'edit') {
      state.editing = true;
      state.status = '';
    } else if (act === 'cancel') {
      state.editing = false;
      state.status = '';
    } else if (act === 'save') {
      save();
      return;
    } else if (act === 'detail-open') {
      state.detail = 'skill';
    } else if (act === 'detail-close') {
      state.detail = '';
    } else if (act === 'detail-mode') {
      state.detail = el.getAttribute('data-mode') === 'stat' ? 'stat' : 'skill';
    } else if (act === 'equip') {
      state.confirm = state.personaId;
      state.status = '';
    } else if (act === 'equip-no') {
      state.confirm = '';
      state.status = '';
    } else if (act === 'equip-yes') {
      equip();
      return;
    }
    render();
  }

  function readRole(db, path, test) {
    return db.ref(path).once('value').then(function (snap) { return test(snap.val()); }, function () { return false; });
  }

  function onUser(db, user) {
    if (!user || user.isAnonymous) {
      state.roles = { admin: false, gm: false, player: false };
      if (!state.editing) { render(); }
      return;
    }
    Promise.all([
      readRole(db, 'admin/' + user.uid, function (v) { return v === true; }),
      readRole(db, 'gm/' + user.uid, function (v) { return v === true; }),
      readRole(db, 'player/' + user.uid, function (v) { return v === charId; })
    ]).then(function (r) {
      state.roles = { admin: r[0], gm: r[1], player: r[2] };
      if (!state.editing) { render(); }
    });
  }

  function initFirebase() {
    if (!firebaseUsable) { return; }
    var url = 'https://www.gstatic.com/firebasejs/' + FIREBASE_VERSION + '/';
    loadScript(url + 'firebase-app-compat.js')
      .then(function () { return loadScript(url + 'firebase-database-compat.js'); })
      .then(function () { return loadScript(url + 'firebase-auth-compat.js'); })
      .then(function () {
        var fb = root.firebase;
        var app = fb.apps && fb.apps.length ? fb.apps[0] : fb.initializeApp(cfg);
        var db = fb.database(app);
        state.db = db;
        db.ref('characters/' + charId).on('value', function (snap) {
          state.remote = snap.val() || {};
          if (!state.editing) { render(); }
        }, function (e) {
          state.status = '保存済みのデータを読み込めませんでした。' + (e && e.message ? e.message : '');
        });
        fb.auth(app).onAuthStateChanged(function (user) { onUser(db, user); });
      })
      .catch(function (e) { state.status = e.message; });
  }

  function init() {
    if (!charId) { showError('囚人が指定されていません。'); return; }
    Promise.all([loadJson('data/prisoners.json'), loadJson('data/' + charId + '/identities.json'), loadJson('data/' + charId + '/egos.json')])
      .then(function (r) {
        state.prisoner = r[0][charId];
        state.identities = r[1];
        state.egos = r[2];
        if (!state.prisoner) { throw new Error('囚人「' + charId + '」のデータがありません。'); }
        document.title = state.prisoner.name + ' | キャラクターシート | LCBTRPG';
        appEl.addEventListener('click', onClick);
        window.addEventListener('hashchange', function () {
          route();
          render();
          window.scrollTo(0, 0);
        });
        route();
        render();
        initFirebase();
      })
      .catch(function (e) { showError(e.message); });
  }

  init();
}(typeof self !== 'undefined' ? self : this));
