import {STATION_UPGRADES,dryingBatch,collectorCapacity} from './upgrades.js';
import {gearProfile} from './survival.js';
import {BAITS,FISHING_SPOTS,gameHour,weatherAt} from './expedition.js';
import { CROPS, FINDS, MEMORIES, cropInfo } from './homelife.js';
import { LOCATIONS, WORLD_LIMIT, ROADS, mapPoint } from './district.js';
import { inventoryItems, EQUIPMENT_SLOTS } from './inventory.js';
import { HOTBAR_ITEMS, hotbarItem } from './hotbar.js';
import { RESOURCES, RECIPES, CONTRACTS, bagWeight, capacity, total, craftStatus, contractStatus, productionInfo, weapon } from './game.js';

import { icon, resourceIcon, recipeIcon, categoryIcon } from './icons.js';
export { icon } from './icons.js';
const costHTML = (state, cost) => Object.entries(cost).map(([id, n]) => `<span class="cost ${total(state, id) < n ? 'missing' : 'enough'}" title="${RESOURCES[id].name}: есть ${total(state, id)}, нужно ${n}"><span style="color:${RESOURCES[id].color}">${resourceIcon(id, 17)}</span><b>${total(state, id)}</b><small>/${n}</small></span>`).join('');
const rewardHTML = reward => Object.entries(reward).map(([id, n]) => `<span class="cost reward" title="${RESOURCES[id].name}"><span style="color:${RESOURCES[id].color}">${resourceIcon(id, 16)}</span>+${n}</span>`).join('');
const categories = { tools: 'Инструменты', weapons: 'Оружие', gear: 'Экипировка', supplies: 'Расходники', shelter: 'Убежище' };
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class UI {
  constructor(root, state, actions) {
    this.state = state; this.actions = actions; this.panel = null; this.category = 'tools'; this.root = root;
    this.cache = new Map(); this.search = ''; this.onlyAvailable = false; this.returnFocus = null; this.inventoryView = 'bag'; this.hotbarEditSlot = 0; this.selectedItem = null;
    root.innerHTML = `
      <div id="world" aria-label="Игровой район"></div>
      <div class="cinematic-overlay"></div>
      <div id="intro" class="intro">
        <header class="intro-header"><a class="brand" href="#" aria-label="Тихий район">${icon('home', 28)}<span>ТИХИЙ РАЙОН<small>A PLACE TO BEGIN AGAIN</small></span></a><span class="edition">ПЕРВАЯ ГЛАВА <i></i> ВЕРНИ СВЕТ</span></header>
        <div class="intro-copy"><div class="eyebrow"><span class="line"></span> ПОСЛЕ ВСЕГО — НОВОЕ НАЧАЛО</div><h1>Здесь снова<br>будет <em>свет.</em></h1><p>Заброшенный район. Маленькое убежище.<br>И целый мир, который можно восстановить.</p><button class="primary start-button" data-action="start" disabled><span id="start-label">Загружаем район…</span>${icon('arrow')}</button><div id="load-progress"><span></span></div><div class="intro-save" id="intro-save"></div></div>
        <div class="intro-location"><span class="coordinate">55° 43′ N / 37° 36′ E</span><h3>Ремонтная станция</h3><span>Дом начинается с одной тёплой комнаты.</span></div>
        <footer class="intro-footer"><span>ДОБЫВАЙ <i>·</i> ИССЛЕДУЙ <i>·</i> ОБУСТРАИВАЙ</span><span>Надень наушники. Здесь можно не спешить.</span></footer>
      </div>
      <div id="hud" hidden>
        <header class="topbar"><div class="brand">${icon('home', 24)}<span>ТИХИЙ РАЙОН<small id="location-name">РЕМОНТНАЯ СТАНЦИЯ</small></span></div><div class="weather">${icon('sun', 18)}<span id="game-time">17:42</span><span class="separator"></span><span>ДЕНЬ <b id="game-day">01</b></span><span class="weather-text">Лёгкий туман</span></div><div class="header-actions"><span class="saved-indicator" id="save-indicator"><i></i>Сохранено</span><button class="icon-button hud-secondary" data-action="sound" aria-label="Включить или выключить звук" id="sound-button">${icon('sound')}</button><button class="icon-button" data-action="settings" aria-label="Настройки">${icon('settings', 24)}</button><button class="menu-toggle" data-action="toggle-menu" aria-expanded="false">${icon('book', 23)} Меню</button></div></header>
        <div id="resource-peek" hidden></div>

        <div id="region-banner" class="region-banner"><span id="region-subtitle"></span><h2 id="region-title"></h2></div>
        <div id="floating-text"></div>
        <div id="context" class="context" hidden></div>
        <div id="task-progress" class="task-progress" hidden><span></span><div><i></i></div></div>
        <div id="tutorial" class="tutorial glass" hidden><button data-action="dismiss-tutorial" aria-label="Закрыть подсказку">${icon('close', 14)}</button><strong>Твой первый вечер</strong><p>Собирай находки в районе и возвращай их домой. На станции можно создавать снаряжение и восстанавливать убежище.</p><span><kbd>W A S D</kbd> движение <i>·</i> <kbd>E</kbd> действие<br>Или нажми на землю, чтобы идти.</span></div>
        <div class="vitals glass" id="vitals"></div>
        <nav class="toolbar glass" aria-label="Меню игры" hidden><button data-action="craft" title="Станция рецептов · C">${icon('craft')}<span>Станция</span><kbd>C</kbd></button><button data-action="inventory" title="Рюкзак · I">${icon('bag')}<span>Рюкзак</span><small class="toolbar-cargo" id="toolbar-bag-count">0/26</small><kbd>I</kbd></button><button data-action="build" title="Обустройство · B">${icon('build')}<span>Обустройство</span><kbd>B</kbd></button><button data-action="orders" title="Заказы соседей · K">${icon('board')}<span>Заказы</span></button><button data-action="map" title="Карта · M">${icon('map')}<span>Район</span><kbd>M</kbd></button><button data-action="journal" title="Дневник · J">${icon('book')}<span>Дневник</span><kbd>J</kbd></button><button data-action="home">${icon('home')}<span>Домой</span></button></nav>
        <div id="hotbar" class="hotbar-dock glass"></div>
        <aside class="minimap glass collapsed"><div><button data-action="toggle-minimap" aria-expanded="false">${icon('map', 22)} Мини-карта</button><button class="map-expand" data-action="map" aria-label="Открыть карту">${icon('expand', 20)}</button></div><canvas id="minimap" width="190" height="132"></canvas><small id="map-caption">Там, где ты оставишь свет</small></aside>
        <div class="control-hint"><span><kbd>SHIFT</kbd> бег</span><span><kbd>ПРОБЕЛ</kbd> атака</span><span><kbd>Q</kbd> аптечка</span></div>
        <div id="build-hint" class="build-hint glass" hidden></div>
        <div class="mobile-controls"><div id="joystick" class="joystick"><span></span></div><div class="mobile-actions"><button data-action="attack" aria-label="Атаковать">${icon('sword', 22)}</button><button data-action="interact" aria-label="Взаимодействовать">E</button></div></div>
      </div>
      <div id="panel-backdrop" class="panel-backdrop" hidden></div><section id="panel" class="panel" role="dialog" aria-modal="true" hidden></section>
      <div id="fish-ui" class="fish-ui glass" hidden></div>
      <div id="toasts" class="toasts" role="status" aria-live="polite"></div>
      <div id="damage-flash" class="damage-flash"></div>
      <div id="fatal" class="fatal glass" hidden></div>`;
    root.addEventListener('click', event => {
      const button = event.target.closest('[data-action]');
      if (!button || button.disabled) return;
      event.preventDefault();
      const action = button.dataset.action;
      if (action === 'close') this.close();
      else if (action === 'category') { this.category = button.dataset.category; this.renderPanel(true); }
      else if (action === 'select-item') { this.selectedItem = button.dataset.id; this.renderPanel(); }
      else if (action === 'inventory-tab') { this.inventoryView = button.dataset.view; this.selectedItem=null; this.renderPanel(true); }
      else if (action === 'available-filter') { this.onlyAvailable = !this.onlyAvailable; this.renderPanel(true); }
      else if (action === 'toggle-minimap') { this.state.settings.minimapExpanded = !this.state.settings.minimapExpanded; this.update(); this.actions('hud-change'); }
      else if (action === 'toggle-menu') { const nav = document.querySelector('.toolbar'); nav.hidden = !nav.hidden; button.setAttribute('aria-expanded', String(!nav.hidden)); }
      else if (action === 'hotbar-edit-slot') { this.hotbarEditSlot = Number(button.dataset.index); this.renderPanel(); }
      else if (action === 'confirm-result') this.resolveConfirm(button.dataset.result === 'yes');
      else this.actions(action, button.dataset);
    });
    root.addEventListener('input', event => {
      if (event.target.id !== 'recipe-search') return;
      this.search = event.target.value; const cursor = event.target.selectionStart;
      this.renderPanel(true); const input = document.getElementById('recipe-search'); input.focus(); input.setSelectionRange(cursor, cursor);
    });
    document.getElementById('panel-backdrop').addEventListener('click', () => this.close());
    this.map = document.getElementById('minimap'); this.renderMap(this.map);
  }
  setHTML(id, markup) {
    if (this.cache.get(id) === markup) return;
    this.cache.set(id, markup); document.getElementById(id).innerHTML = markup;
  }
  loading(progress) { document.querySelector('#load-progress span').style.width = `${progress * 100}%`; }
  ready(hasSave) {
    const button = document.querySelector('.start-button'); button.disabled = false;
    document.getElementById('start-label').textContent = hasSave ? 'Вернуться домой' : 'Начать новую историю';
    document.getElementById('intro-save').textContent = hasSave ? 'Прогресс сохранён на этом устройстве' : 'Одиночная игра · автоматическое сохранение';
    document.getElementById('load-progress').style.opacity = '0';
  }
  start() {
    document.getElementById('intro').classList.add('leaving');
    setTimeout(() => { document.getElementById('intro').hidden = true; }, 700);
    document.getElementById('hud').hidden = false;
    document.getElementById('tutorial').hidden = true;
    if (this.state.tutorial) { this.toast('WASD — движение · E — действие · 1–6 — хотбар. На телефоне используй джойстик.', 'info'); this.state.tutorial = false; }
    this.update();
  }
  update() {
    const state=this.state;
    const bag = bagWeight(state), cap = capacity(state);
    this.setHTML('vitals', `<div class="vital-row ${state.health < 30 ? 'critical' : ''}">${icon('heart', 17)}<div class="vital-detail"><div><span>Здоровье</span><b>${Math.ceil(state.health)}<small>/100</small></b></div><div class="meter health"><i style="width:${state.health}%"></i></div></div></div><div class="vital-row">${icon('bolt', 17)}<div class="vital-detail"><div><span>Выносливость</span><b>${Math.ceil(state.stamina)}<small>/100</small></b></div><div class="meter stamina"><i style="width:${state.stamina}%"></i></div></div></div>`);
    const minimap = document.querySelector('.minimap'); minimap.classList.toggle('collapsed', !state.settings.minimapExpanded);
    minimap.querySelector('[data-action="toggle-minimap"]').setAttribute('aria-expanded', String(!!state.settings.minimapExpanded));
    document.getElementById('toolbar-bag-count').textContent = `${Number(bag.toFixed(1))}/${cap}`;
    this.renderHotbar();
    this.root.classList.toggle('home-zone', state.x >= -27 && state.x <= -6 && state.z >= 5 && state.z <= 27);
    this.setHTML('sound-button', icon(state.settings.sound ? 'sound' : 'mute'));
    const minutes = (17 * 60 + 42 + Math.floor(state.elapsed / 2)) % 1440;
    document.getElementById('game-time').textContent = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    document.getElementById('game-day').textContent = String(1 + Math.floor((17 * 60 + 42 + state.elapsed / 2) / 1440)).padStart(2, '0');
    if (state.settings.minimapExpanded) this.renderMap(this.map);
  }
  renderHotbar() {
    const state = this.state, choice = hotbarItem(state, state.hotbar[state.hotbarSelected]);
    const selected = choice && (choice.slot !== 'weapon' && choice.id !== 'pipe' || state.equipment.weapon === choice.id) ? choice : hotbarItem(state, state.equipment.weapon);
    this.setHTML('hotbar', `<div class="hotbar-heading"><span>${selected ? `${recipeIcon(selected.id, 22)} ${selected.name}` : weapon(state).name}</span><button data-action="inventory" aria-label="Открыть рюкзак">${icon('bag', 22)} ${Number(bagWeight(state).toFixed(1))}/${capacity(state)}</button></div><div class="hotbar-slots">${state.hotbar.map((id, index) => {
      const item = hotbarItem(state, id), active = index === state.hotbarSelected && item && !item.supply && (item.slot !== 'weapon' && item.id !== 'pipe' || state.equipment.weapon === id);
      return `<button class="hotbar-slot ${active ? 'active' : ''} ${item && !item.available ? 'unavailable' : ''}" data-action="hotbar-use" data-index="${index}" aria-label="${index + 1}: ${item ? item.name : 'Пустая ячейка'}${item?.count !== null && item ? `, ${item.count}` : ''}" aria-pressed="${!!active}" title="${item ? item.name : 'Назначить в инвентаре'} · ${index + 1}"><kbd>${index + 1}</kbd>${item ? recipeIcon(item.id, 36) : icon('add', 30)}${item?.count !== null && item ? `<b class="hotbar-count">${item.count}</b>` : ''}${item && !item.available && !item.supply ? `<span class="hotbar-lock">${icon('lock', 13)}</span>` : ''}</button>`;
    }).join('')}</div>`);
  }
  hotbarEditor() {
    const state = this.state, index = this.hotbarEditSlot;
    const choices = HOTBAR_ITEMS.filter(item => item.id === 'pipe' || state.owned.includes(item.id) || ['medkit', 'meal', 'tea'].includes(item.id));
    return `<p class="panel-note">Выбери ячейку, затем предмет. Цифры 1–6 и нажатия работают во время игры. Инструменты из набора также применяются автоматически.</p><div class="hotbar-edit-slots">${state.hotbar.map((id, slot) => `<button data-action="hotbar-edit-slot" data-index="${slot}" class="${slot === index ? 'active' : ''}" aria-label="Настроить ячейку ${slot + 1}" aria-pressed="${slot === index}"><b>${slot + 1}</b>${id ? recipeIcon(id, 30) : icon('add', 30)}</button>`).join('')}</div><div class="section-title"><h3>Предмет для ячейки ${index + 1}</h3></div><div class="hotbar-choices">${choices.map(item => {
      const info = hotbarItem(state, item.id);
      return `<button data-action="hotbar-assign" data-index="${index}" data-id="${item.id}" class="${state.hotbar[index] === item.id ? 'selected' : ''}">${recipeIcon(item.id, 32)}<span>${item.name}${info.supply ? `<small>В запасе: ${info.count}</small>` : ''}</span>${state.hotbar[index] === item.id ? icon('check', 20) : ''}</button>`;
    }).join('')}</div><button class="secondary full-width" data-action="hotbar-assign" data-index="${index}" data-id="">Очистить ячейку ${index + 1}</button>`;
  }
  region(location, announce = false) {
    document.getElementById('location-name').textContent = location.name.toUpperCase();
    document.getElementById('map-caption').textContent = location.subtitle;
    if (announce) {
      document.getElementById('region-title').textContent = location.name;
      document.getElementById('region-subtitle').textContent = location.subtitle;
      const banner = document.getElementById('region-banner'); banner.classList.remove('show'); void banner.offsetWidth; banner.classList.add('show');
    }
  }
  context(target) {
    const element = document.getElementById('context'); element.hidden = !target;
    if (target) this.setHTML('context', `<button data-action="interact"><span class="context-icon">${recipeIcon(({ node: target.entity?.find||target.entity?.requires || ({ scrap: 'metal', herbs: target.entity?.originalLoot?.seeds ? 'seeds' : 'herbs', wood: 'wood', tree: 'axe', ore: 'pick', crate: 'chest', electronics: 'wire', cloth: 'cloth' })[target.entity?.type] || 'bag', station: 'craft', storage: 'chest', bed: 'bed', fish: 'rod', grave: 'bag', production: target.entity?.id || 'parts', water: 'water', orders: 'board', helper:'herbs',dryer:'dryrack',loadouts:'gearrack',gate:target.entity?.tool,garden:'cropbed',note:'book','furniture-toggle':target.entity?.id })[target.type], 21)}</span><kbd>E</kbd><span>${target.label}</span>${target.hint ? `<small>${target.hint}</small>` : ''}</button>`);
  }
  progress(label, ratio) {
    const element = document.getElementById('task-progress'); element.hidden = !label;
    if (label) { element.querySelector('span').textContent = label; element.querySelector('i').style.width = `${Math.min(100, ratio * 100)}%`; }
  }
  toast(text, type = 'info') {
    const toast = document.createElement('div'); toast.className = `toast ${type}`;
    toast.innerHTML = `${icon(type === 'success' ? 'leaf' : 'bolt', 16)}<span>${escape(text)}</span>`;
    document.getElementById('toasts').appendChild(toast);
    setTimeout(() => { toast.classList.add('leaving'); setTimeout(() => toast.remove(), 400); }, 4200);
  }
  open(panel, category) {
    this.returnFocus = document.activeElement;
    if (this.panel !== panel) { this.search = ''; this.onlyAvailable = false; }
    if(this.panel!==panel) this.selectedItem=null;
    this.panel = panel;
    if (category) this.category = category;
    document.getElementById('panel-backdrop').hidden = false; document.getElementById('panel').hidden = false;
    document.querySelector('.toolbar').hidden = true;
    document.querySelector('[data-action="toggle-menu"]').setAttribute('aria-expanded', 'false');
    this.renderPanel(true); this.actions('panel-open');
    document.querySelector('#panel [data-action="close"]')?.focus();
  }
  close() {
    this.panel = null; document.getElementById('panel-backdrop').hidden = true; document.getElementById('panel').hidden = true;
    this.actions('panel-close');
    if (this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
  }
  renderPanel(resetScroll = false) {
    const scroll = resetScroll ? 0 : document.querySelector('#panel .panel-body')?.scrollTop || 0;
    const element = document.getElementById('panel'), state = this.state;
    const headers = {
      craft: ['МАСТЕРСКАЯ', 'Станция рецептов', 'Создавай то, что поможет идти дальше.'],
      inventory: ['СНАРЯЖЕНИЕ И ДОБЫЧА', 'Инвентарь', ''],
      station:['ОБУСТРОЙСТВО','Рабочая станция','Улучшения устанавливаются на выбранный объект.'],
      dryer:['ЗАПАСЫ ДЛЯ ВЫЛАЗКИ','Сушилка для улова','Загрузи рыбу и траву. Готовая еда появится после цикла.'],
      loadouts:['ПОДГОТОВКА','Комплекты экипировки','Сохрани текущую экипировку в один из двух комплектов.'],
      fishing:['У ВОДЫ','Наживка и место','Расходуемые наживки берутся из рюкзака. Каждая тратится один раз при забросе.'],
      garden:['ПОСАДКИ','Посадочная грядка','Выбери культуру. После урожая грядка освободится для новой посадки.'],
      note:['СЛЕДЫ ПРОШЛОГО','Найденная запись',''],
      storage: ['УБЕЖИЩЕ', 'Хранилище', 'Запасы для рецептов и будущих вылазок.'],
      build: ['МЕСТО, КОТОРОЕ ТЫ СОЗДАЁШЬ', 'Обустройство', 'Выбери предмет, затем размести его в убежище.'],
      map: ['ЗНАКОМЫЕ ТРОПЫ. НОВЫЕ ОТКРЫТИЯ.', 'Карта района', 'Выбери точку на карте — персонаж проложит путь.'],
      journal: ['ПЕРВАЯ ГЛАВА', 'Дневник возвращения', 'Маленькие шаги возвращают жизнь в большой мир.'],
      settings: ['ТВОЙ РИТМ', 'Настройки', 'Прогресс автоматически сохраняется в этом браузере.'],
      helper: ['ТЕПЕРЬ ТЫ НЕ ОДИН', 'Лада · садовница', 'Выбери работу. Готовая продукция отправится на склад, пока ты исследуешь район.'],
      orders: ['РАЙОН СТАНОВИТСЯ ЖИВЫМ', 'Заказы соседей', 'Передавай материалы дома. Награда сразу отправится на склад.'],
    };
    const [eyebrow, title, subtitle] = headers[this.panel];
    element.className = `panel ${this.panel === 'map' || this.panel === 'inventory' ? 'wide-panel' : ''}`;
    let body = '';
    if (this.panel === 'craft' || this.panel === 'build') {
      const isBuild = this.panel === 'build';
      const category = isBuild ? 'shelter' : this.category;
      const nearStation = Math.hypot(state.x + 21, state.z - 13) < 4.5;
      const nearHome = state.x >= -27 && state.x <= -6 && state.z >= 5 && state.z <= 27;
      body += `<div class="station-status ${isBuild ? nearHome ? 'online' : '' : nearStation ? 'online' : ''}"><i></i>${isBuild ? nearHome ? 'Ты дома · можно строить' : 'Для строительства вернись в убежище' : nearStation ? 'Станция рядом · готова к работе' : 'Изготовление доступно рядом со станцией'}</div>`;
      if (!(isBuild ? nearHome : nearStation)) body += `<button class="station-route secondary full-width" data-action="${isBuild ? 'home' : 'station-route'}">${icon('pin', 17)} ${isBuild ? 'Проложить путь домой' : 'Проложить путь к станции'} ${icon('arrow', 15)}</button>`;
      if (!isBuild) body += `<nav class="category-tabs">${Object.entries(categories).map(([id, name]) => `<button class="${id === category ? 'active' : ''}" data-action="category" data-category="${id}">${categoryIcon(id)}<span>${name}</span></button>`).join('')}</nav>`;
      body += `<div class="recipe-tools"><label>${icon('search', 17)}<input id="recipe-search" type="search" placeholder="${isBuild ? 'Найти постройку…' : 'Найти рецепт…'}" value="${escape(this.search)}" aria-label="Поиск рецептов"></label><button class="filter-button ${this.onlyAvailable ? 'active' : ''}" data-action="available-filter" aria-pressed="${this.onlyAvailable}" title="Показать только доступные">${icon('filter', 16)} Можно создать</button></div><div class="recipe-cost-guide">Материалы: в наличии / нужно · рюкзак и склад</div>`;
      const recipes = RECIPES.filter(r => r.category === category && (!isBuild || r.placeable) && r.name.toLocaleLowerCase('ru').includes(this.search.toLocaleLowerCase('ru')) && (!this.onlyAvailable || craftStatus(state, r).ok));
      if (!recipes.length) body += `<div class="panel-empty">${icon('search', 36)}<h3>Пока ничего не найдено</h3><p>Измени поиск или отключи фильтр доступных рецептов.</p></div>`;
      body += `<div class="recipe-list">${recipes.map(r => {
        const status = craftStatus(state, r), equipped = Object.values(state.equipment).includes(r.id);
        const canEquip = status.owned && r.slot && r.slot !== 'tool';
        const canAct = canEquip || (status.ok && (isBuild ? nearHome : nearStation));
        return `<article class="recipe-card ${status.owned ? 'owned' : ''}"><div class="recipe-top"><span class="recipe-icon">${recipeIcon(r.id, 28)}</span><div><div class="recipe-heading"><h3>${r.name}</h3><span class="availability-badge ${status.owned ? 'made' : status.ok ? 'ready' : 'locked'}">${status.owned ? icon('check', 12) : status.ok ? icon('check', 12) : icon(r.requires && !state.owned.includes(r.requires) ? 'lock' : 'bag', 12)} ${status.owned ? 'Готово' : status.ok ? r.foundOnly?'Вещь найдена':'Есть материалы' : r.requires && !state.owned.includes(r.requires) ? 'Закрыто' : r.foundOnly?'Находка':'Нужны ресурсы'}</span></div><p>${r.desc}</p></div></div><div class="recipe-bottom"><div class="costs">${status.owned ? `<span class="owned-text">${equipped ? 'Экипировано' : 'Изготовлено'}</span>` : r.foundOnly?`<span class="owned-text">${(state.finds[r.id]||0)+(state.storedFinds[r.id]||0)} в запасе</span>`:costHTML(state,r.cost)}</div><button class="craft-button" data-action="${canEquip ? 'equip' : 'make'}" data-id="${r.id}" ${!canAct || equipped ? 'disabled' : ''}>${canEquip ? equipped ? 'Надето' : 'Надеть' : status.owned ? 'Готово' : r.placeable ? 'Разместить' : 'Создать'}</button></div>${!status.ok && !status.owned ? `<small class="recipe-reason">${icon('info', 13)} ${status.reason}</small>` : ''}</article>`;
      }).join('')}</div>`;
      if (isBuild && state.placed.length) body += `<div class="section-title"><h3>Уже дома</h3><span>Можно переставить</span></div><div class="owned-items">${state.placed.map((p, index) => `<div class="furniture-row">${recipeIcon(p.id,36)}<span>${RECIPES.find(r=>r.id===p.id).name}${p.upgrade===1?' · улучшено':''}</span>${STATION_UPGRADES[p.id]?`<button class="secondary" data-action="station-details" data-index="${index}" ${!nearHome?'disabled':''}>Станция</button>`:''}<button class="secondary" data-action="move-furniture" data-index="${index}" ${!nearHome?'disabled':''}>Переставить</button><button class="text-button" data-action="pack-furniture" data-index="${index}" ${!nearHome?'disabled':''}>На склад</button></div>`).join('')}</div>`;
      if(isBuild)body+=this.packedOverview();
      if(isBuild&&state.placed.some(p=>p.id==='gearrack'))body+='<button class="secondary full-width" data-action="loadouts">Открыть комплекты экипировки</button>';
      if (isBuild) body += this.productionOverview();
      if(isBuild) body+=`<div class="furniture-controls">${state.placed.map((p,index)=>['lamp','foundlamp','recordplayer'].includes(p.id)?`<button class="secondary" data-action="toggle-furniture" data-index="${index}" ${!nearHome?'disabled':''}>${recipeIcon(p.id,26)} ${p.enabled?'Выключить':'Включить'} · ${RECIPES.find(r=>r.id===p.id).name}</button>`:'').join('')}</div>`;
    }
    if (this.panel === 'inventory') {
      body = `<nav class="category-tabs inventory-tabs"><button data-action="inventory-tab" data-view="bag" class="${this.inventoryView !== 'hotbar' ? 'active' : ''}">${icon('bag',22)} Предметы</button><button data-action="inventory-tab" data-view="hotbar" class="${this.inventoryView === 'hotbar' ? 'active' : ''}">${icon('hotbar',22)} Хотбар</button></nav>`;
      if(this.inventoryView === 'hotbar') body += this.hotbarEditor();
      else body += this.inventoryWindow();
    }
    if (this.panel === 'storage') {
      body = `<div class="storage-actions"><button class="primary" data-action="deposit">${icon('bag',22)} Сложить добычу</button><button class="secondary" data-action="inventory">${icon('bag',22)} Рюкзак</button></div>${this.itemGrid(inventoryItems(state,true),'storage-grid')}${this.itemDetails(true)}${this.haulSummary()}${this.packedOverview()}`;
    }
    if(this.panel==='note') {const note=MEMORIES.find(n=>n.id===this.noteId);body=note?`<article class="found-note"><h3>${note.name}</h3><p>${note.text}</p><small>Запись сохранена в дневнике.</small></article>`:'<p>Запись не найдена.</p>';}
    if(this.panel==='fishing') {const spot=FISHING_SPOTS.find(p=>Math.hypot(p.x-state.x,p.z-state.z)<3);body=`<p class="panel-note">${spot?spot.name+' · '+spot.desc:'Подойди к причалу или заводи.'} ${gameHour(state.elapsed)>=20||gameHour(state.elapsed)<6?'Ночь: форель подходит ближе к берегу.':'День: активнее обычная рыба.'}</p><div class="recipe-list">${Object.entries(BAITS).map(([id,b])=>{const available=!b.tool||state.owned.includes(b.tool),count=b.resource?state.bag[b.resource]||0:null;return `<article class="recipe-card"><div class="recipe-top">${recipeIcon(id==='none'?'rod':id,40)}<div><h3>${b.name}</h3><p>${b.desc}${count!==null?' · в рюкзаке: '+count:''}</p></div></div><button class="secondary" data-action="select-bait" data-id="${id}" ${!available||count===0?'disabled':''}>${state.fishingBait===id?'Выбрано':'Выбрать'}</button></article>`;}).join('')}</div>`;}
    if(this.panel==='dryer'||this.panel==='station')body=this.stationWindow();
    if(this.panel==='loadouts')body=this.loadoutWindow();
    if(this.panel==='garden') body=this.gardenWindow();
    if (this.panel === 'helper') {
      const recruited = state.owned.includes('helper');
      body = `<div class="story-intro"><p>«Я думала, здесь уже никто не живёт. А у тебя горит свет… Давай вернём этому месту зелень».</p></div>${recruited ? `<div class="orders-summary">${icon('herbs', 28)}<div><strong>${state.helper.cycles} циклов собрано на склад</strong><p>Работа идёт только во время активной игры. Переработчик берёт металл со склада.</p></div></div><div class="recipe-list">${[['garden', 'Грядки с травами'], ['seedbed', 'Питомники'], ['purifier', 'Очистка воды'], ['recycler', 'Переработка лома'], ['rest', 'Отдохнуть']].map(([id, name]) => `<article class="recipe-card"><div class="recipe-top"><span class="recipe-icon">${icon(id === 'rest' ? 'bed' : id === 'purifier' ? 'water' : 'herbs', 26)}</span><div><h3>${name}</h3><p>${id === 'rest' ? 'Производство можно собирать вручную.' : `${state.placed.filter(p => p.id === id).length} станций в убежище · сбор в общий склад`}</p></div></div><button class="craft-button" data-action="helper-assignment" data-id="${id}" ${state.helper.assignment === id || id !== 'rest' && !state.placed.some(p => p.id === id) ? 'disabled' : ''}>${state.helper.assignment === id ? 'Выбрано' : 'Поручить'}</button></article>`).join('')}</div>` : '<p class="panel-note">Размести удобную кровать, восстанови радио и пригласи Ладу через рецепт в мастерской.</p><button class="primary full-width" data-action="craft-objective">Открыть проекты убежища</button>'}`;
    }
    if (this.panel === 'orders') {
      const home = state.x >= -27 && state.x <= -6 && state.z >= 5 && state.z <= 27;
      body = `<button class="secondary full-width" data-action="helper">${icon('herbs', 18)} Помощник убежища</button><div class="orders-summary">${icon('board', 28)}<div><strong>${state.completedOrders} заказов выполнено</strong><p>Материалы идут соседям, награда — на твой склад.</p></div></div>${!home ? '<button class="secondary full-width" data-action="home">Вернуться домой для передачи заказа</button>' : ''}<div class="recipe-list">${CONTRACTS.map(order => {
        const status = contractStatus(state, order);
        return `<article class="recipe-card order-card"><div class="recipe-top"><span class="recipe-icon">${resourceIcon(Object.keys(order.cost)[0], 27)}</span><div><h3>${order.title}</h3><p>${order.desc}</p></div></div><div class="order-costs"><small>Передать</small><div class="costs">${costHTML(state, order.cost)}</div></div><div class="order-rewards"><small>Получить на склад</small><div>${rewardHTML(order.reward)}</div></div><div class="order-footer"><span>${status.ok ? `${icon('check', 14)} Материалы собраны` : `${icon(status.remaining ? 'clock' : 'info', 14)} ${status.reason}`}</span><button class="craft-button" data-action="deliver-order" data-id="${order.id}" ${!status.ok || !home ? 'disabled' : ''}>Передать</button></div></article>`;
      }).join('')}</div><p class="panel-note">Заказы повторяются. Время ожидания идёт во время вылазок.</p>`;
    }
    if (this.panel === 'map') body = `<canvas id="large-map" width="560" height="420" aria-label="Карта района"></canvas><p class="panel-note">На карте остаются места, где ты побывал. Светлые точки — замеченные запасы, серые — разобранные.</p><div class="location-list">${LOCATIONS.filter(l=>state.visited.includes(l.id)).map(l => `<button data-action="travel" data-id="${l.id}"><span style="color:${l.color}">${icon('pin', 22)}</span><div><strong>${l.name}</strong><small>${l.subtitle}</small></div>${icon('arrow', 15)}</button>`).join('')}</div>${state.grave ? '<p class="map-warning">✕ На карте отмечен оставленный рюкзак. Его можно вернуть.</p>' : ''}`;
    if (this.panel === 'journal') {
      body = `<div class="journal-note"><span class="note-date">ПЕРВАЯ ЗАПИСЬ</span><p>«В мастерской пахнет мокрым деревом. Печь ещё работает. Если починить генератор, здесь можно остаться. Пока это просто комната. Но уже моя».</p></div><div class="story-steps">${[
        ['generator', 'Верни свет домой', 'Старый генератор ждёт проводов и деталей. После ремонта оживёт мастерская.'],
        ['bridge', 'Открой путь в депо', 'Восстанови мост через дренажный канал. На другой стороне сохранились технические запасы.'],
        ['radio', 'Найди голос в тишине', 'Собери радиостанцию. Возможно, в этом мире остался кто-то ещё.'],
      ].map(([id, name, desc], i) => `<div class="story-step ${state.owned.includes(id) ? 'complete' : ''}"><span>${state.owned.includes(id) ? '✓' : `0${i + 1}`}</span><div><h3>${name}</h3><p>${desc}</p></div></div>`).join('')}</div>${state.chapterComplete ? '<div class="radio-message"><div class="eyebrow">ВХОДЯЩИЙ СИГНАЛ · 104.6</div><p>«Если кто-нибудь слышит… У нас есть семена. И свободное место за столом. Мы у водонапорной башни».</p><small>Конец первой главы. Теперь можно наладить воду и помочь соседям.</small></div>' : ''}<div class="section-title"><h3>Твоя история в цифрах</h3></div><div class="stats-grid"><div><strong>${state.gathered}</strong><span>ресурсов найдено</span></div><div><strong>${state.trips}</strong><span>добычи сдано</span></div><div><strong>${state.placed.length}</strong><span>предметов дома</span></div><div><strong>${state.kills}</strong><span>дронов отключено</span></div></div><div class="section-title"><h3>Рыбацкая коллекция</h3><span>${state.fishCollection.length} / 4</span></div><div class="collection-list">${['Речной окунь', 'Серебряный карась', 'Лунная форель', 'Перламутровая раковина'].map(name => `<div class="${state.fishCollection.includes(name) ? 'found' : ''}">${recipeIcon(({ 'Речной окунь': 'fish-perch', 'Серебряный карась': 'fish-crucian', 'Лунная форель': 'fish-trout', 'Перламутровая раковина': 'shell' })[name], 24)}<span>${state.fishCollection.includes(name) ? name : 'Неизвестная находка'}</span></div>`).join('')}</div>`;
    }
    if (this.panel === 'settings') body = `<div class="settings-row"><div><h3>Звуки района</h3><p>Ветер, шаги, инструменты и вода.</p></div><button class="toggle ${state.settings.sound ? 'on' : ''}" data-action="sound" aria-label="Переключить звук"><i></i></button></div><div class="settings-row"><div><h3>Качество графики</h3><p>Мягкие тени и свечение источников света.</p></div><button class="secondary" data-action="quality">${state.settings.quality === 'high' ? 'Высокое' : 'Экономное'}</button></div><div class="settings-row"><div><h3>Сохранение</h3><p id="save-note">Хранится только в этом браузере.</p></div><button class="secondary" data-action="save">Сохранить</button></div><button class="secondary full-width" data-action="export-save">Скачать сохранение</button><label class="import-save secondary full-width">Загрузить сохранение<input id="import-save" type="file" accept="application/json,.json"></label><div class="controls-table"><h3>Управление</h3><p><kbd>WASD / стрелки</kbd> Движение</p><p><kbd>ЛКМ по земле</kbd> Идти к точке</p><p><kbd>E</kbd> Сбор / действие / подсечка</p><p><kbd>Пробел</kbd> Атака / рыбалка</p><p><kbd>Shift</kbd> Бег</p><p><kbd>Q</kbd> Аптечка</p><p><kbd>R</kbd> Повернуть предмет при строительстве</p><p><kbd>Esc</kbd> Закрыть меню / отменить</p><p><kbd>Колесо мыши</kbd> Масштаб</p></div><div class="credits"><strong>Модели: KayKit / Kay Lousberg и Kenney · CC0</strong><p>Персонаж KayKit в капюшоне, растительность, дроны и бластеры. Архитектура и эффекты созданы для игры.</p></div><button class="danger-button" data-action="reset">Начать новую историю…</button>`;
    if(this.panel==='journal') body=`${state.notes.length?`<div class="section-title"><h3>Найденные записи</h3><span>${state.notes.length}</span></div><div class="place-memories">${MEMORIES.filter(n=>state.notes.includes(n.id)).map(n=>`<article><h3>${n.name}</h3><p>${n.text}</p></article>`).join('')}</div>`:''}`+body;
    if(this.panel==='journal') body=`<div class="section-title"><h3>Места, которые я помню</h3><span>${state.visited.length} / ${LOCATIONS.length}</span></div><div class="place-memories">${LOCATIONS.filter(l=>state.visited.includes(l.id)).map(l=>`<article><h3>${l.name}</h3><p>${l.note}</p></article>`).join('')}</div>`+body;
    const nearbyFish=FISHING_SPOTS.some(p=>Math.hypot(p.x-state.x,p.z-state.z)<3),selectedBait=BAITS[state.fishingBait];
    const canCast=nearbyFish&&state.owned.includes('rod')&&(!selectedBait.tool||state.owned.includes(selectedBait.tool))&&(!selectedBait.resource||state.bag[selectedBait.resource]>0);
    const footer=this.panel==='fishing'?`<button class="primary full-width" data-action="cast-selected" ${canCast?'':'disabled'}>Забросить удочку ${icon('arrow',18)}</button>`:`${icon('clock',14)} Игра на паузе <span>ESC — закрыть</span>`;
    element.innerHTML = `<header class="panel-header"><div class="eyebrow">${eyebrow}</div><button class="icon-button" data-action="close" aria-label="Закрыть меню">${icon('close')}</button><div class="panel-title"><span class="panel-title-icon">${icon(({ craft: 'craft', inventory: 'bag', storage: 'chest', build: 'build', map: 'map', journal: 'book', settings: 'settings', station:'craft', dryer:'dryrack',loadouts:'gearrack',fishing:'rod',garden:'herbs',note:'book',orders: 'board', helper: 'herbs' })[this.panel], 27)}</span><h2>${title}</h2></div>${subtitle ? `<p>${subtitle}</p>` : ''}</header><div class="panel-body">${body}</div><footer class="panel-footer">${footer}</footer>`;
    element.querySelector('.panel-body').scrollTop = scroll;
    if (this.panel === 'map') {
      const canvas = document.getElementById('large-map'); this.renderMap(canvas, true);
      canvas.addEventListener('click', event => {
        const rect = canvas.getBoundingClientRect();
        const {x,z}=mapPoint((event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height);
        this.actions('map-point', { x, z });
      });
    }
    if (this.panel === 'settings') document.getElementById('import-save').addEventListener('change', event => this.actions('import-save', { file: event.target.files[0] }));
  }
  inventoryWindow() {
    const state=this.state, items=inventoryItems(state), home=state.x>=-27&&state.x<=-6&&state.z>=5&&state.z<=27;
    return `<div class="inventory-layout"><section class="equipment-column"><h3>Экипировка</h3><div class="equipment-grid">${Object.entries(EQUIPMENT_SLOTS).map(([slot,label])=>{
      const id=state.equipment[slot], name=id==='pipe'?'Стальная труба':RECIPES.find(r=>r.id===id)?.name;
      return `<button class="equipment-slot ${id?'filled':''} ${id&&this.selectedItem===id?'selected':''}" data-action="${id?'select-item':'inventory-tab'}" ${id?`data-id="${id}"`:'data-view="bag"'} aria-label="${label}: ${name||'не надето'}"><span>${label}</span>${id?recipeIcon(id,60):icon(({weapon:'sword',armor:'shield',bag:'bag',boots:'boots'})[slot],32)}<small>${name||'Свободно'}</small></button>`;
    }).join('')}</div><div class="equipment-summary"><span>${icon('sword',20)} ${weapon(state).damage} урона</span><span>${icon('shield',20)} ${Math.round((RECIPES.find(r=>r.id===state.equipment.armor)?.defense||0)*100)}% защиты</span><span>${icon('boots',20)} Скорость ${Math.round(gearProfile(state,RECIPES).speed*(state.equipment.boots==='boots'?1.18:1)*100)}%</span></div></section><section class="pack-column"><div class="inventory-weight"><h3>Рюкзак</h3><span>${Number(bagWeight(state).toFixed(2))} / ${capacity(state)}</span></div>${this.itemGrid(items,'inventory-grid')}${home?'<button class="secondary storage-link" data-action="storage">Открыть склад убежища →</button>':''}</section></div>${this.itemDetails(false)}`;
  }
  itemGrid(items,id) {
    const cells=Math.max(24,Math.ceil(items.length/6)*6);
    return `<div id="${id}" class="item-grid" role="group" aria-label="${id==='storage-grid'?'Ячейки склада':'Ячейки рюкзака'}">${Array.from({length:cells},(_,i)=>{
      const item=items[i];
      return item?`<button class="item-cell ${this.selectedItem===item.id?'selected':''}" data-action="select-item" data-id="${item.id}" aria-label="${item.name}, ${item.count}" aria-pressed="${this.selectedItem===item.id}" title="${item.name}">${recipeIcon(item.id,58)}<b>${item.count}</b></button>`:'<div class="item-cell empty" aria-hidden="true"></div>';
    }).join('')}</div>`;
  }
  itemDetails(storage) {
    const state=this.state, equipped=Object.entries(state.equipment).find(([,id])=>id&&id===this.selectedItem);
    const item=inventoryItems(state,storage).find(r=>r.id===this.selectedItem)||(!storage&&equipped?{...(this.selectedItem==='pipe'?{id:'pipe',name:'Стальная труба',desc:'Надёжное оружие ближнего боя.'}:RECIPES.find(r=>r.id===this.selectedItem)),kind:'gear',count:1}:null);
    if(!item) return '<div class="item-details empty-details">Выбери предмет, чтобы увидеть описание и действия.</div>';
    let actions='';
    if(storage&&item.kind==='find') actions=`<button class="secondary" data-action="withdraw-find" data-id="${item.id}" data-count="1">Взять в рюкзак</button><button class="primary" data-action="make" data-id="${item.id}">Поставить дома</button>`;
    else if(storage) actions=`<button class="secondary" data-action="withdraw" data-id="${item.id}" data-count="1">Взять 1</button><button class="secondary" data-action="withdraw" data-id="${item.id}" data-count="${item.count}">Взять всё</button>`;
    else if(item.kind==='find') actions=`<button class="primary" data-action="make" data-id="${item.id}">Поставить дома</button>`;
    else if(equipped) actions=`<button class="secondary" data-action="unequip" data-slot="${equipped[0]}">Снять</button>`;
    else if(item.kind==='gear'&&item.slot!=='tool') actions=`<button class="primary" data-action="equip" data-id="${item.id}">Надеть</button>`;
    else if(['medkit','meal','tea'].includes(item.id)) actions=`<button class="primary" data-action="use-${item.id}">Использовать</button>`;
    return `<section class="item-details"><div class="item-portrait">${recipeIcon(item.id,72)}</div><div><h3>${item.name}</h3><p>${item.desc||'Материал для создания и развития убежища.'}</p>${item.kind==='find'?`<small>Вес: ${FINDS[item.id].weight} · находка для дома</small>`:item.id==='pipe'?'<small>13 урона · 2.4 м</small>':''}<div class="item-actions">${actions}</div></div></section>`;
  }
  stationWindow(){
    const s=this.state,item=s.placed[this.stationIndex??this.dryerIndex],spec=STATION_UPGRADES[item?.id];if(!spec)return '<p>Станция не найдена.</p>';
    const index=s.placed.indexOf(item),info=productionInfo(s,item),batch=dryingBatch(item),near=Math.hypot(item.x-s.x,item.z-s.z)<=3;
    let work=item.id==='dryrack'?`<p>${info.needsLoading?`${batch.cost.fish} рыбы и ${batch.cost.herbs} травы → ${batch.output} порции за ${batch.duration} секунд.`:info.remaining?`До готовности: ${Math.ceil(info.remaining)} сек.`:`Готово: ${info.mealOutput} порции еды.`}</p>${info.needsLoading?`<div class="costs">${costHTML(s,batch.cost)}</div>`:''}<button class="primary full-width" data-action="${info.needsLoading?'load-dryer':'harvest-dryer'}" data-index="${index}" ${(!near|| (info.needsLoading?Object.entries(batch.cost).some(([id,n])=>total(s,id)<n):info.remaining>0))?'disabled':''}>${info.needsLoading?'Загрузить улов':'Забрать еду'}</button>`:item.id==='raincatcher'?`<p>Запас воды: ${Math.floor(item.rainWater||0)} / ${collectorCapacity(item)}. ${info.waitingForRain?'Ожидает дождь.':''}</p>`:`<p>3 металла → ${info.loot.parts} детали и ${info.loot.wire} провода. Цикл: ${Math.round(info.interval)} сек.</p>`;
    if(item.id!=='dryrack')work+=`<button class="primary full-width" data-action="harvest-station" data-index="${index}" ${!near||info.remaining?'disabled':''}>Забрать продукцию</button>`;
    return `<div class="crop-status">${recipeIcon(item.id,64)}<h3>${RECIPES.find(r=>r.id===item.id).name}</h3>${work}${near?'':'<p>Для загрузки и сбора подойди к станции.</p>'}</div><article class="recipe-card"><h3>${spec.name}${item.upgrade===1?' · установлено':''}</h3><p>${spec.desc}</p>${item.upgrade===1?'':`<div class="costs">${costHTML(s,spec.cost)}</div><button class="primary full-width" data-action="upgrade-station" data-index="${index}" ${Object.entries(spec.cost).some(([id,n])=>total(s,id)<n)?'disabled':''}>Установить улучшение</button>`}</article>`;
  }
  loadoutWindow(){
    const s=this.state,rack=s.placed.some(p=>p.id==='gearrack');if(!rack)return '<p class="panel-note">Размести стеллаж комплектов в убежище.</p>';
    return `<div class="recipe-list">${s.loadouts.map((e,index)=>`<article class="recipe-card"><h3>Комплект ${index+1}</h3><div class="haul-items">${e?Object.values(e).filter(Boolean).map(id=>`<span>${recipeIcon(id,36)} ${id==='pipe'?'Стальная труба':RECIPES.find(r=>r.id===id)?.name}</span>`).join(''):'<p>Комплект пока пуст.</p>'}</div><div class="storage-actions"><button class="secondary" data-action="save-loadout" data-index="${index}">Сохранить текущий</button><button class="primary" data-action="apply-loadout" data-index="${index}" ${!e?'disabled':''}>Надеть комплект</button></div></article>`).join('')}</div>`;
  }
  gardenWindow() {
    const state=this.state,item=state.placed[this.gardenIndex],info=item?cropInfo(state,item):null;
    if(!item||item.id!=='cropbed') return '<p>Грядка не найдена.</p>';
    if(info) return `<div class="crop-status">${resourceIcon(item.crop,64)}<h3>${CROPS[item.crop].name}</h3><p>${info.remaining?`До урожая: ${Math.ceil(info.remaining)} сек.`:'Урожай готов к сбору'}${weatherAt(state.elapsed).rain>.2&&item.z>19.5?' · дождь поливает грядку':''}</p><div class="meter health"><i style="width:${info.progress*100}%"></i></div><button class="primary full-width" data-action="harvest-bed" data-index="${this.gardenIndex}" ${info.remaining?'disabled':''}>Собрать урожай</button></div>`;
    return `<div class="recipe-list">${Object.entries(CROPS).map(([id,crop])=>`<article class="recipe-card"><div class="recipe-top"><span class="recipe-icon">${resourceIcon(id,48)}</span><div><h3>${crop.name}</h3><p>${crop.interval} сек. · урожай ${Object.values(crop.loot)[0]} шт.</p></div></div><div class="costs">${costHTML(state,crop.cost)}</div><button class="craft-button" data-action="plant-crop" data-id="${id}" data-index="${this.gardenIndex}" ${Object.entries(crop.cost).some(([r,n])=>total(state,r)<n)?'disabled':''}>Посадить</button></article>`).join('')}</div>`;
  }
  haulSummary() {
    const haul=Object.entries(this.state.lastHaul),finds=Object.entries(this.state.lastFindHaul);if(!haul.length&&!finds.length) return '';
    const ready=RECIPES.filter(r=>craftStatus(this.state,r).ok);
    return `<details class="haul-summary"><summary>Последняя сдача · ${haul.reduce((n,[,v])=>n+v,0)+finds.reduce((n,[,v])=>n+v,0)} материалов и находок</summary><div class="haul-items">${haul.map(([id,n])=>`<span>${resourceIcon(id,28)} ${RESOURCES[id].name} × ${n}</span>`).join('')}${finds.map(([id,n])=>`<span>${recipeIcon(id,28)} ${FINDS[id].name} × ${n}</span>`).join('')}</div><h3>Можно создать · ${ready.length}</h3><div class="haul-items">${ready.slice(0,8).map(r=>`<button class="secondary" data-action="craft-projects" data-category="${r.category}">${recipeIcon(r.id,28)} ${r.name}</button>`).join('')}</div></details>`;
  }
  packedOverview() {
    if(!this.state.packedFurniture.length)return '';
    return `<div class="section-title"><h3>Мебель на складе</h3><span>Состояние сохранено</span></div><div class="packed-furniture">${this.state.packedFurniture.map((p,index)=>`<div class="furniture-row">${recipeIcon(p.id,36)}<span>${RECIPES.find(r=>r.id===p.id).name}${p.crop?' · посадки сохранены':''}</span><button class="secondary" data-action="unpack-furniture" data-index="${index}">Разместить</button></div>`).join('')}</div>`;
  }
  productionOverview() {
    const producers = this.state.placed.map(p => ({ item: p, info: productionInfo(this.state, p) })).filter(p => p.info);
    if (!producers.length) return '';
    return `<div class="section-title"><h3>Производство дома</h3><span>${producers.length} станций</span></div><div class="production-list">${producers.map(({ item, info }) => `<div>${recipeIcon(item.id, 23)}<div><strong>${RECIPES.find(r => r.id === item.id).name}</strong><small>${info.needsLoading?'Загрузить улов':info.waitingForRain?'Ожидает дождь':info.remaining ? `До готовности: ${Math.ceil(info.remaining)} сек.` : 'Готово — подойди и нажми E'}</small></div><span class="${info.remaining ? '' : 'ready'}">${icon(info.remaining ? 'clock' : 'check', 18)}</span></div>`).join('')}</div>`;
  }
  confirm(title, message, label = 'Продолжить') {
    return new Promise(resolve => {
      this.pendingConfirm = resolve;
      const overlay = document.createElement('div'); overlay.id = 'confirm-overlay'; overlay.className = 'confirm-overlay';
      overlay.innerHTML = `<section class="confirm-card glass" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">${icon('info', 32)}<h2 id="confirm-title">${escape(title)}</h2><p>${escape(message)}</p><div><button class="secondary" data-action="confirm-result" data-result="no">Отмена</button><button class="primary" data-action="confirm-result" data-result="yes">${escape(label)}</button></div></section>`;
      this.root.appendChild(overlay); overlay.querySelector('[data-result="no"]').focus();
    });
  }
  resolveConfirm(value) { const resolve = this.pendingConfirm; this.pendingConfirm = null; document.getElementById('confirm-overlay')?.remove(); resolve?.(value); }
  resourceGrid(resources) {
    const entries = Object.entries(RESOURCES);
    return `<div class="resource-grid">${entries.map(([id, resource]) => `<div class="resource-tile ${(resources[id] || 0) === 0 ? 'empty' : ''}"><span style="color:${resource.color}">${resourceIcon(id, 27)}</span><div><small>${resource.name}</small><b>${resources[id] || 0}</b></div></div>`).join('')}</div>`;
  }
  renderMap(canvas, large = false) {
    const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    const labelSize = Math.ceil((large ? 16 : 12) / Math.min(1, canvas.clientWidth / w || 1));
    const span=(WORLD_LIMIT+2)*2;const p=(x,z)=>[(x+WORLD_LIMIT+2)/span*w,(z+WORLD_LIMIT+2)/span*h];
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#263a34'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#65796c18'; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(i / 10 * w, 0); ctx.lineTo(i / 10 * w, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i / 10 * h); ctx.lineTo(w, i / 10 * h); ctx.stroke(); }
    ctx.fillStyle='#60716945';for(const r of ROADS) ctx.fillRect(...p(r.x-r.w/2,r.z-r.d/2),r.w/span*w,r.d/span*h);
    ctx.fillStyle='#557a764f';ctx.beginPath();ctx.ellipse(...p(23,-24),10/span*w,8/span*h,0,0,Math.PI*2);ctx.fill();
    for(const l of LOCATIONS.filter(l=>this.state.visited.includes(l.id))) {
      ctx.fillStyle='#87927b40';ctx.fillRect(...p(l.x-4,l.z-3),8/span*w,6/span*h);
    }
    if(large) for(const n of this.nodes||[]) if(this.state.foundNodes.includes(n.id)) {
      const [nx,ny]=p(n.x,n.z);ctx.fillStyle=n.group.visible?'#c6cb9a':'#778779';ctx.fillRect(nx-2,ny-2,4,4);
    }
    for (const l of LOCATIONS.filter(l=>this.state.visited.includes(l.id))) {
      const [x, y] = p(l.x, l.z); ctx.fillStyle = l.color; ctx.beginPath(); ctx.arc(x, y, large ? 4 : 2.4, 0, Math.PI * 2); ctx.fill();
      if (large) { ctx.fillStyle = '#d7d7bd'; ctx.font = `${labelSize}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText(l.label, x, y + labelSize + 8); }
    }
    if (this.state.grave) { const [x, y] = p(this.state.grave.x, this.state.grave.z); ctx.fillStyle = '#e3a281'; ctx.font = '16px sans-serif'; ctx.fillText('×', x - 4, y + 4); }
    const [x, y] = p(this.state.x, this.state.z); ctx.fillStyle = '#f3dda5'; ctx.shadowBlur = 8; ctx.shadowColor = '#edc98b'; ctx.beginPath(); ctx.arc(x, y, large ? 5 : 3.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#f3dda566'; ctx.beginPath(); ctx.arc(x, y, large ? 10 : 6.5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#a8b5a1'; ctx.font = `${labelSize}px sans-serif`; ctx.textAlign = 'right'; ctx.fillText('N ↑', w - 9, labelSize + 5);
  }
  fishing(fish) {
    const element = document.getElementById('fish-ui'); element.hidden = !fish;
    if (!fish) return;
    if (fish.phase === 'wait') element.innerHTML = `<div class="eyebrow">${icon('fish', 15)} ТИХАЯ ВОДА</div><h3>Поплавок качается…</h3><p>Дождись поклёвки. Можно просто послушать воду.</p><p>${BAITS[fish.bait]?.name||'Без наживки'}</p><div class="fishing-dots"><i></i><i></i><i></i></div><button class="text-button" data-action="cancel-fish">Смотать удочку</button>`;
    if (fish.phase === 'bite') element.innerHTML = `<div class="eyebrow bite-label">ЕСТЬ ПОКЛЁВКА!</div><h3>Подсекай!</h3><button class="primary full-width" data-action="fish-action">Подсечь <kbd>E / ПРОБЕЛ</kbd></button>`;
    if (fish.phase === 'reel') {
      const width = fish.upgraded ? 26 : 20;
      element.innerHTML = `<div class="eyebrow">${icon('fish', 15)} ДЕРЖИ ЛЕСКУ</div><h3>Поймай момент</h3><p>Нажми, когда указатель внутри светлой зоны.</p><div class="fish-meter"><span class="fish-target" style="left:${fish.target - width / 2}%;width:${width}%"></span><i style="left:${fish.needle}%"></i></div><div class="fish-score"><span>${'●'.repeat(fish.hits)}${'○'.repeat(3 - fish.hits)}</span><small>Ошибки: ${fish.misses} / 2</small></div><button class="primary full-width" data-action="fish-action">Подтянуть <kbd>E / ПРОБЕЛ</kbd></button>`;
    }
    if (fish.phase === 'caught') element.innerHTML = `<div class="eyebrow">${fish.result.rarity.toUpperCase()}</div><h3>${recipeIcon(({ 'Речной окунь': 'fish-perch', 'Серебряный карась': 'fish-crucian', 'Лунная форель': 'fish-trout', 'Перламутровая раковина': 'shell' })[fish.result.name], 32)} ${fish.result.name}</h3><p>+${fish.result.count} ${RESOURCES[fish.result.resource].name.toLowerCase()} · находка в рюкзаке</p><button class="primary full-width" data-action="fish-again">Ещё один заброс ${icon('arrow', 16)}</button><button class="text-button" data-action="cancel-fish">На сегодня хватит</button>`;
    element.insertAdjacentHTML('beforeend','<button class="secondary full-width" data-action="bait-menu">Выбрать наживку</button>');
  }
  updateFishNeedle(value) { const needle = document.querySelector('.fish-meter i'); if (needle) needle.style.left = `${value}%`; }
  buildHint(recipe, valid, rotation) {
    const element = document.getElementById('build-hint'); element.hidden = !recipe;
    if (recipe) element.innerHTML = `${icon('build', 20)}<div><strong>${recipe.name}</strong><span>${['wallclock','fishtrophy'].includes(recipe.id)?(valid?'Нажми, чтобы закрепить на стене':'Выбери стену внутри убежища'):valid?'Нажми на землю, чтобы разместить':'Выбери свободное место в убежище'}</span></div>${['wallclock','fishtrophy'].includes(recipe.id)?'':`<button data-action="rotate-build">${icon('rotate',17)} ${Math.round(rotation*180/Math.PI)}°</button>`}<button data-action="cancel-build" aria-label="Отменить строительство">${icon('close', 17)}</button>`;
  }
  floating(items, world) {
    const root = document.getElementById('floating-text'); root.replaceChildren();
    for (const item of items) {
      const p = world.screenPosition(item.x, item.y, item.z);
      const div = document.createElement('div'); div.className = 'float-label'; div.innerHTML = `${(item.icons || []).map(id => resourceIcon(id, 22)).join('')}<span>${escape(item.text)}</span>`;
      div.style.cssText = `left:${p.x}px;top:${p.y}px;color:${item.color};opacity:${Math.min(1, item.life)};`; root.appendChild(div);
    }
  }
  damage() { const el = document.getElementById('damage-flash'); el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
  fatal(message) { const el = document.getElementById('fatal'); el.hidden = false; el.innerHTML = `<h2>Не удалось открыть район</h2><p>${escape(message)}</p><button class="primary" data-action="reload">Попробовать снова</button>`; }
}
