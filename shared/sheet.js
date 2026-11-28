(function (root) {
  'use strict';

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
  var ICON_BACK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" aria-hidden="true">' +
    '<path d="M20 12H5M11 5l-7 7 7 7"/>' +
    '</svg>';

  var base = '../';

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

  function vitalHtml(label, icon, value) {
    return '<div class="status" role="group" aria-label="' + label + ' ' + esc(value) + '">' +
      img('image/icon/' + icon + '.png', 'status-icon') + '<span class="status-num">' + esc(value) + '</span></div>';
  }

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

  function artBgAttr(art, cls, p) {
    if (art.kind !== 'portrait' || art.placeholder) { return 'class="' + cls + '"'; }
    return 'class="' + cls + ' has-bg" style="background-image: url(\'' + esc(base + p.background) + '\')"';
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

  function headColorVar(color, ghost) {
    return (color ? '--head-color: ' + color + ';' : '') + (ghost != null ? ' --ghost-opacity: ' + ghost + '%;' : '');
  }

  function sinVars(id) {
    var d = SIN_BY_ID[id];
    return d ? '--sin: ' + d.color + '; --sin-text: ' + d.text + ';' : '';
  }

  function statusInfo(id) {
    return FX.statusInfo(id);
  }

  function seasonName(identity, seasons) {
    var season = identity && identity.season ? seasons[identity.season] : null;
    return season && season.name ? season.name : '';
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
    (p.effects || []).filter(function (e) { return !e.hidden; }).forEach(function (e) {
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
        ? '<div class="passive-have">' + img('image/icon/sin/' + p.sin + '.png', 'passive-sin') + '<span>×' + esc(p.count) + (p.resonance ? ' 共鳴' : ' 保有') + '</span></div>'
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

  function skillTabHtml(identity, vs) {
    var items = skillItems(identity);
    if (vs.sub >= items.length) { vs.sub = 0; }
    var cur = items[vs.sub];
    var subs = '';
    items.forEach(function (it, i) {
      subs += '<button class="subtab is-' + it.sin + '" style="' + sinVars(it.sin) + '" type="button"' +
        ' aria-pressed="' + (!vs.passive && i === vs.sub) + '" data-act="sub" data-sub="' + i + '">' + esc(it.tab) + '</button>';
    });
    if (vs.passive) { return passiveTabHtml(identity, subs); }
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
      '<span class="detail-weight">攻撃加重値' + weight + '</span>' +
      '</div></div>';
    var rows = '';
    var plain = cur.effects.filter(function (e) { return e.coin === undefined; });
    rows += effectHtml(FX.sortByTiming(plain));
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

  function egoTabHtml(eq, vs) {
    var rank = RANKS[vs.sub] || RANKS[0];
    var ego = eq.egos[rank];
    var subs = '';
    RANKS.forEach(function (rk, i) {
      var on = !!eq.egos[rk];
      var rsin = on ? eq.egos[rk].sin : '';
      subs += '<button class="subtab is-rank is-' + rsin + '" style="' + sinVars(rsin) + '" type="button" aria-pressed="' + (on && i === vs.sub) + '"' +
        (on ? ' data-act="sub" data-sub="' + i + '"' : ' disabled') + ' aria-label="' + rk + '">' + RANK_LETTERS[rk] + '</button>';
    });
    var head = '<div class="subtabs is-rank" role="group" aria-label="E.G.Oの等級">' + subs + '</div>';
    if (!ego) {
      return '<div class="skill-tab">' + head + '<div class="tab-note">この等級のE.G.Oは未装備です。</div></div>';
    }
    var body;
    if (vs.egoMode === 'passive' && ego.passive) {
      body = '<div class="passives">' + passiveHtml('パッシブ', ego.passive) + '</div>';
    } else if (vs.egoMode === 'corrosion' && ego.corrosion) {
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
      var label = m > 1 ? (m < 2 ? '弱点' : '脆弱') : (m < 0.75 ? '耐性' : (m < 1 ? '抵抗' : '普通'));
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
      var label = m > 1 ? (m < 2 ? '弱点' : '脆弱') : (m < 1 ? '耐性' : '普通');
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

  function keywordsHtml(identity) {
    return root.LC_KEYWORDS.list(identity).map(function (k) {
      return '<span class="head-keyword' + (k.strike ? ' is-strike' : '') + '">' + esc(k.text) + '</span>';
    }).join(' / ');
  }

  function equipBtnHtml(state) {
    if (state === 'on') { return '<span class="persona-btn is-on">装備中</span>'; }
    if (state === 'unowned') { return '<span class="persona-btn is-on">未所持</span>'; }
    if (state === 'can') { return '<button class="persona-btn" type="button" data-act="equip">装備</button>'; }
    return '';
  }

  function backHtml(back) {
    return '<a class="side-btn is-back"' + (back.act ? ' data-act="' + back.act + '"' : '') +
      ' href="' + esc(back.href) + '" aria-label="' + esc(back.label) + '">' + ICON_BACK + '</a>';
  }

  function sheetHtml(o) {
    var p = o.p;
    var identity = o.identity;
    var persona = !!o.persona;
    var vs = o.vs || { sub: 0, passive: false, egoMode: 'awaken' };
    var eq = o.eq || { egos: {} };
    var tabNow = persona ? 'skill' : (o.tab || 'overview');
    var art = identityArt(p, o.identityId, identity);
    var tabContent;
    if (tabNow === 'overview') {
      var egoRow = '';
      RANKS.forEach(function (rank) { egoRow += egoUnit(rank, eq.egos[rank]); });
      tabContent = scrollWrap('<div class="ego-row">' + egoRow + '</div>' +
        '<div class="divider" aria-hidden="true"></div>' +
        '<div class="skill-row">' + skillsHtml(identity) + '</div>');
    } else if (tabNow === 'skill') {
      tabContent = skillTabHtml(identity, vs);
    } else {
      tabContent = egoTabHtml(eq, vs);
    }
    var isEgoTab = tabNow === 'ego';
    var curEgo = isEgoTab ? eq.egos[RANKS[vs.sub] || RANKS[0]] : null;
    var modeNav = '';
    if (tabNow === 'skill' && (identity.passive || identity.support)) {
      modeNav = modeNavHtml([{ label: 'パッシブ', on: vs.passive, act: 'passive' }]);
    } else if (isEgoTab && curEgo) {
      var items = [{ label: '覚醒', on: vs.egoMode === 'awaken', act: 'mode', mode: 'awaken' }];
      if (curEgo.corrosion) { items.push({ label: '侵食', on: vs.egoMode === 'corrosion', act: 'mode', mode: 'corrosion' }); }
      if (curEgo.passive) { items.push({ label: 'パッシブ', on: vs.egoMode === 'passive', act: 'mode', mode: 'passive' }); }
      modeNav = modeNavHtml(items);
    }
    var season = persona ? seasonName(identity, o.seasons || {}) : '';
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
      headHtml = '<header class="head" style="' + headColorVar(p.themeColor, p.ghostOpacity) + '">' +
      '<div class="head-ghost" aria-hidden="true">' + esc(p.name) + '</div>' +
      '<div class="head-body">' +
      '<div class="head-top">' +
      '<div class="head-keywords">' + keywordsHtml(identity) + '</div>' +
      (season ? '<div class="head-season">' + esc(season) + '</div>' : '') +
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
    (persona ? ['skill'] : ['overview', 'skill', 'ego']).forEach(function (t) {
      tabs += '<button class="tab is-' + t + '" type="button" aria-pressed="' + (tabNow === t) + '" data-act="tab" data-tab="' + t + '">' + TAB_NAMES[t] + '</button>';
    });
    var action = o.actionHtml != null ? o.actionHtml : equipBtnHtml(o.equip);

    return '<div class="sheet">' +
      '<section class="stage' + (isEgoTab ? ' is-ego' : '') + '" aria-label="囚人表示" style="background-image: url(\'' + esc(base + (art.kind === 'stage' ? art.src : p.background)) + '\')' + (art.kind === 'stage' && art.layout.stagePos ? '; background-position: ' + esc(art.layout.stagePos) : '') + '">' +
      portraitHtml(art, p) +
      '<div class="stage-shade" aria-hidden="true"></div>' +
      '<div class="stage-edge" aria-hidden="true"></div>' +
      '<nav class="side-nav" aria-label="補助機能">' +
      backHtml(o.back) +
      (o.navHtml || '') +
      '</nav>' +
      (o.panelHtml || '') +
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
      action +
      '</div></div>' +
      modeNav +
      '<section class="content">' + tabContent + '</section>' +
      '</main>' +
      '</div>';
  }

  function confirmHtml(o) {
    return '<div class="confirm" role="dialog" aria-label="装備の確認"><div class="confirm-box">' +
      '<p class="confirm-text">「' + esc(o.name) + '」を装備しますか？</p>' +
      '<div class="confirm-actions">' +
      '<button class="panel-btn" type="button" data-act="equip-no"' + (o.saving ? ' disabled' : '') + '>キャンセル</button>' +
      '<button class="panel-btn is-primary" type="button" data-act="equip-yes"' + (o.saving ? ' disabled' : '') + '>装備する</button>' +
      '</div>' + (o.status ? '<p class="panel-status">' + esc(o.status) + '</p>' : '') + '</div></div>';
  }

  function assign(to, from) {
    Object.keys(from).forEach(function (k) { to[k] = from[k]; });
    return to;
  }

  function mount(el, initial) {
    var host = assign({}, initial);
    var vs = { sub: 0, passive: false, egoMode: 'awaken' };
    var ui = { confirm: false, saving: false, status: '' };
    var wrap = document.createElement('div');
    wrap.className = 'lc-sheet-host';

    function render() {
      if (wrap.parentNode !== el) {
        el.innerHTML = '';
        el.appendChild(wrap);
      }
      var o = assign({ persona: true, vs: vs }, host);
      o.back = host.back || { href: '#', label: '戻る', act: 'back' };
      wrap.innerHTML = sheetHtml(o) +
        (ui.confirm ? confirmHtml({ name: host.identity.name, saving: ui.saving, status: ui.status }) : '');
    }

    function doEquip() {
      if (host.equip !== 'can' || ui.saving) { return; }
      var pr = host.saveEquip ? host.saveEquip(host.identityId) : null;
      if (!pr) {
        ui.status = '保存できません。ログイン状態と接続を確認してください。';
        render();
        return;
      }
      ui.saving = true;
      ui.status = '保存しています…';
      render();
      pr.then(function () {
        ui.saving = false;
        ui.status = '';
        ui.confirm = false;
        if (host.onEquipped) { host.onEquipped(); } else { render(); }
      }, function (e) {
        ui.saving = false;
        ui.status = '保存できませんでした。' + (e && e.message ? e.message : '');
        render();
      });
    }

    function onClick(ev) {
      var t = ev.target.closest ? ev.target.closest('[data-act]') : null;
      if (!t || !wrap.contains(t)) { return; }
      var act = t.getAttribute('data-act');
      if (act === 'sub') {
        vs.sub = Number(t.getAttribute('data-sub')) || 0;
        vs.passive = false;
      } else if (act === 'passive') {
        vs.passive = !vs.passive;
      } else if (act === 'equip') {
        ui.confirm = true;
        ui.status = '';
      } else if (act === 'equip-no') {
        ui.confirm = false;
        ui.status = '';
      } else if (act === 'equip-yes') {
        ev.stopPropagation();
        doEquip();
        return;
      } else if (act === 'back') {
        ev.preventDefault();
        ev.stopPropagation();
        if (host.onBack) { host.onBack(); }
        return;
      } else {
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      render();
    }

    wrap.addEventListener('click', onClick);
    render();
    return {
      update: function (patch) {
        if (patch.identityId != null && patch.identityId !== host.identityId) {
          vs = { sub: 0, passive: false, egoMode: 'awaken' };
          ui = { confirm: false, saving: false, status: '' };
        }
        assign(host, patch);
        render();
      },
      destroy: function () {
        wrap.removeEventListener('click', onClick);
        if (wrap.parentNode) { wrap.parentNode.removeChild(wrap); }
      }
    };
  }

  root.LCSheet = {
    setBase: function (b) { base = b; },
    RANKS: RANKS,
    TAG_COLOR: TAG_COLOR,
    ROMAN: ROMAN,
    RANK_LETTERS: RANK_LETTERS,
    RESIST_TYPES: RESIST_TYPES,
    ICON_BACK: ICON_BACK,
    esc: esc,
    img: img,
    identityArt: identityArt,
    artBgAttr: artBgAttr,
    artImgHtml: artImgHtml,
    sinVars: sinVars,
    statusInfo: statusInfo,
    seasonName: seasonName,
    piece: piece,
    coinsHtml: coinsHtml,
    skillUnit: skillUnit,
    skillsHtml: skillsHtml,
    statusHtml: statusHtml,
    speedText: speedText,
    keywordsHtml: keywordsHtml,
    resistHtml: resistHtml,
    sheetHtml: sheetHtml,
    confirmHtml: confirmHtml,
    mount: mount
  };
}(typeof self !== 'undefined' ? self : this));
