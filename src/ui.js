import { RESOURCES, RECIPES, bagWeight, capacity, total, craftStatus, objective, weapon } from './game.js';
import { LOCATIONS } from './world.js';

const paths = {
  home: '<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/>',
  craft: '<path d="m14 4 6 6M3 21l10-10M12 3l9 9M15 7l-3 3"/><path d="m3 3 5 5-2 2-5-5zM10 12l9 9 2-2-9-9"/>',
  bag: '<rect x="5" y="6" width="14" height="15" rx="3"/><path d="M9 6V3h6v3M5 13h14M9 17h6"/>',
  build: '<path d="M3 21V9l9-6 9 6v12zM7 21v-8h10v8M3 9h18"/>',
  map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2zM9 3v16M15 5v16"/>',
  book: '<path d="M4 3h13a3 3 0 0 1 3 3v15H7a3 3 0 0 1-3-3zM4 17a3 3 0 0 1 3-3h13M8 7h8M8 10h5"/>',
  sound: '<path d="m3 9 5 0 5-5v16l-5-5H3zM17 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"/>',
  mute: '<path d="m3 9 5 0 5-5v16l-5-5H3zM17 9l5 6M22 9l-5 6"/>',
  settings: '<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  leaf: '<path d="M20 3C7 2 1 9 6 16s17 3 14-13ZM4 21 15 10"/>',
  heart: '<path d="M12 21 3 12C-2 5 7 1 12 7c5-6 14-2 9 5z"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',
  shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z"/>',
  fish: '<path d="M4 12c4-9 13-9 17 0-4 9-13 9-17 0Zm0 0L1 7v10z"/><circle cx="16" cy="11" r=".6"/>',
};
export const icon = (name, size = 20) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.leaf}</svg>`;
const costHTML = (state, cost) => Object.entries(cost).map(([id, n]) => `<span class="cost ${total(state, id) < n ? 'missing' : ''}"><span style="color:${RESOURCES[id].color}">${RESOURCES[id].icon}</span> ${total(state, id)}<small>/${n}</small></span>`).join('');
const categories = { tools: 'Инструменты', weapons: 'Оружие', gear: 'Экипировка', supplies: 'Расходники', shelter: 'Убежище' };
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class UI {
  constructor(root, state, actions) {
    this.state = state; this.actions = actions; this.panel = null; this.category = 'tools'; this.root = root;
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
        <header class="topbar"><div class="brand">${icon('home', 24)}<span>ТИХИЙ РАЙОН<small id="location-name">РЕМОНТНАЯ СТАНЦИЯ</small></span></div><div class="weather">${icon('sun', 18)}<span id="game-time">17:42</span><span class="separator"></span><span>ДЕНЬ <b id="game-day">01</b></span><span class="weather-text">Лёгкий туман</span></div><div class="header-actions"><span class="saved-indicator" id="save-indicator"><i></i>Сохранено</span><button class="icon-button" data-action="sound" aria-label="Включить или выключить звук" id="sound-button">${icon('sound')}</button><button class="icon-button" data-action="settings" aria-label="Настройки">${icon('settings')}</button></div></header>
        <aside class="quest-card glass" id="quest-card"></aside>
        <aside class="resource-peek glass" id="resource-peek"></aside>
        <div id="region-banner" class="region-banner"><span id="region-subtitle"></span><h2 id="region-title"></h2></div>
        <div id="floating-text"></div>
        <div id="context" class="context" hidden></div>
        <div id="task-progress" class="task-progress" hidden><span></span><div><i></i></div></div>
        <div id="tutorial" class="tutorial glass" hidden><button data-action="dismiss-tutorial" aria-label="Закрыть подсказку">${icon('close', 14)}</button><strong>Твой первый вечер</strong><p>Собирай находки в районе и возвращай их домой. На станции можно создавать снаряжение и восстанавливать убежище.</p><span><kbd>W A S D</kbd> движение <i>·</i> <kbd>E</kbd> действие<br>Или нажми на землю, чтобы идти.</span></div>
        <div class="vitals glass" id="vitals"></div>
        <nav class="toolbar glass" aria-label="Меню игры"><button data-action="craft" title="Станция рецептов · C">${icon('craft')}<span>Станция</span><kbd>C</kbd></button><button data-action="inventory" title="Рюкзак · I">${icon('bag')}<span>Рюкзак</span><kbd>I</kbd></button><button data-action="build" title="Обустройство · B">${icon('build')}<span>Обустройство</span><kbd>B</kbd></button><span class="toolbar-divider"></span><button data-action="map" title="Карта · M">${icon('map')}<span>Район</span><kbd>M</kbd></button><button data-action="journal" title="Дневник · J">${icon('book')}<span>Дневник</span><kbd>J</kbd></button></nav>
        <aside class="minimap glass"><div><span><i></i> ТВОЙ РАЙОН</span><button data-action="map" aria-label="Открыть карту">↗</button></div><canvas id="minimap" width="190" height="132"></canvas><small id="map-caption">Там, где ты оставишь свет</small></aside>
        <div class="control-hint"><span><kbd>SHIFT</kbd> бег</span><span><kbd>ПРОБЕЛ</kbd> атака</span><span><kbd>Q</kbd> аптечка</span></div>
        <div id="build-hint" class="build-hint glass" hidden></div>
        <div class="mobile-controls"><div id="joystick" class="joystick"><span></span></div><div class="mobile-actions"><button data-action="attack" aria-label="Атаковать">⚔</button><button data-action="interact" aria-label="Взаимодействовать">E</button></div></div>
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
      else if (action === 'category') { this.category = button.dataset.category; this.renderPanel(); }
      else this.actions(action, button.dataset);
    });
    document.getElementById('panel-backdrop').addEventListener('click', () => this.close());
    this.map = document.getElementById('minimap'); this.renderMap(this.map);
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
    document.getElementById('tutorial').hidden = !this.state.tutorial;
    this.update();
  }
  update() {
    const state = this.state, quest = objective(state), recipe = RECIPES.find(r => r.id === quest.recipe);
    document.getElementById('quest-card').innerHTML = `<div class="eyebrow"><span class="quest-dot"></span> ТВОЯ ИСТОРИЯ <span class="chapter">${quest.number}</span></div><h3>${quest.title}</h3><p>${quest.desc}</p>${recipe ? `<div class="quest-costs">${costHTML(state, recipe.cost)}</div><button class="text-button" data-action="craft-objective">К рецепту ${icon('arrow', 15)}</button>` : '<span class="chapter-done">Первая глава завершена</span>'}`;
    const bag = bagWeight(state), cap = capacity(state);
    document.getElementById('vitals').innerHTML = `<div class="vital-row">${icon('heart', 15)}<div class="meter health"><i style="width:${state.health}%"></i></div><span>${Math.ceil(state.health)}</span></div><div class="vital-row">${icon('bolt', 15)}<div class="meter stamina"><i style="width:${state.stamina}%"></i></div><span>${Math.ceil(state.stamina)}</span></div><div class="vital-bottom">${icon('bag', 14)}<span class="${bag >= cap ? 'missing' : ''}">${Number(bag.toFixed(1))} / ${cap}</span><span class="vital-weapon">${weapon(state).name}</span></div>`;
    const resources = Object.entries(state.bag).filter(([, n]) => n > 0).slice(0, 5);
    document.getElementById('resource-peek').innerHTML = `<div class="eyebrow">В РЮКЗАКЕ ${icon('bag', 13)}</div>${resources.length ? resources.map(([id, n]) => `<div class="resource-row"><span class="resource-symbol" style="color:${RESOURCES[id].color}">${RESOURCES[id].icon}</span><span>${RESOURCES[id].name}</span><b>${n}</b></div>`).join('') : '<p class="empty-bag">Здесь будут твои находки</p>'}<button class="text-button" data-action="inventory">Открыть рюкзак ↗</button>`;
    document.getElementById('sound-button').innerHTML = icon(state.settings.sound ? 'sound' : 'mute');
    const minutes = (17 * 60 + 42 + Math.floor(state.elapsed / 2)) % 1440;
    document.getElementById('game-time').textContent = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    document.getElementById('game-day').textContent = String(1 + Math.floor((17 * 60 + 42 + state.elapsed / 2) / 1440)).padStart(2, '0');
    this.renderMap(this.map);
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
    if (target) element.innerHTML = `<kbd>E</kbd><span>${target.label}</span>${target.hint ? `<small>${target.hint}</small>` : ''}`;
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
    this.panel = panel;
    if (category) this.category = category;
    document.getElementById('panel-backdrop').hidden = false; document.getElementById('panel').hidden = false;
    this.renderPanel(); this.actions('panel-open');
    document.querySelector('#panel [data-action="close"]')?.focus();
  }
  close() {
    this.panel = null; document.getElementById('panel-backdrop').hidden = true; document.getElementById('panel').hidden = true;
    this.actions('panel-close');
  }
  renderPanel() {
    const element = document.getElementById('panel'), state = this.state;
    const headers = {
      craft: ['МАСТЕРСКАЯ', 'Станция рецептов', 'Создавай то, что поможет идти дальше.'],
      inventory: ['ТВОИ НАХОДКИ', 'Рюкзак и снаряжение', 'Снаряжение остаётся с тобой. Добычу храни дома.'],
      build: ['МЕСТО, КОТОРОЕ ТЫ СОЗДАЁШЬ', 'Обустройство', 'Выбери предмет, затем размести его в убежище.'],
      map: ['ЧЕТЫРЕ МЕСТА. ОДНА ИСТОРИЯ.', 'Карта района', 'Выбери точку на карте — персонаж проложит путь.'],
      journal: ['ПЕРВАЯ ГЛАВА', 'Дневник возвращения', 'Маленькие шаги возвращают жизнь в большой мир.'],
      settings: ['ТВОЙ РИТМ', 'Настройки', 'Прогресс автоматически сохраняется в этом браузере.'],
    };
    const [eyebrow, title, subtitle] = headers[this.panel];
    element.className = `panel ${this.panel === 'map' ? 'wide-panel' : ''}`;
    let body = '';
    if (this.panel === 'craft' || this.panel === 'build') {
      const isBuild = this.panel === 'build';
      const category = isBuild ? 'shelter' : this.category;
      const nearStation = Math.hypot(state.x + 21, state.z - 13) < 4.5;
      const nearHome = state.x >= -27 && state.x <= -6 && state.z >= 5 && state.z <= 27;
      body += `<div class="station-status ${isBuild ? nearHome ? 'online' : '' : nearStation ? 'online' : ''}"><i></i>${isBuild ? nearHome ? 'Ты дома · можно строить' : 'Для строительства вернись в убежище' : nearStation ? 'Станция рядом · готова к работе' : 'Изготовление доступно рядом со станцией'}</div>`;
      if (!isBuild) body += `<nav class="category-tabs">${Object.entries(categories).map(([id, name]) => `<button class="${id === category ? 'active' : ''}" data-action="category" data-category="${id}">${name}</button>`).join('')}</nav>`;
      const recipes = RECIPES.filter(r => r.category === category && (!isBuild || r.placeable));
      body += `<div class="recipe-list">${recipes.map(r => {
        const status = craftStatus(state, r), equipped = Object.values(state.equipment).includes(r.id);
        const canEquip = status.owned && r.slot && r.slot !== 'tool';
        const canAct = canEquip || (status.ok && (isBuild ? nearHome : nearStation));
        return `<article class="recipe-card ${status.owned ? 'owned' : ''}"><div class="recipe-top"><span class="recipe-icon">${r.icon}</span><div><h3>${r.name}</h3><p>${r.desc}</p></div>${status.owned ? '<span class="owned-badge">✓</span>' : ''}</div><div class="recipe-bottom"><div class="costs">${status.owned ? `<span class="owned-text">${equipped ? 'Экипировано' : 'Изготовлено'}</span>` : costHTML(state, r.cost)}</div><button class="craft-button" data-action="${canEquip ? 'equip' : 'make'}" data-id="${r.id}" ${!canAct || equipped ? 'disabled' : ''}>${canEquip ? equipped ? 'Надето' : 'Надеть' : status.owned ? 'Готово' : r.placeable ? 'Разместить' : 'Создать'}</button></div>${!status.ok && !status.owned ? `<small class="recipe-reason">${status.reason}</small>` : ''}</article>`;
      }).join('')}</div>`;
      if (isBuild && state.placed.length) body += `<div class="section-title"><h3>Уже дома</h3><span>Можно переставить</span></div><div class="owned-items">${state.placed.map((p, index) => `<button data-action="move-furniture" data-index="${index}" ${!nearHome ? 'disabled' : ''}>↔ ${RECIPES.find(r => r.id === p.id).name}</button>`).join('')}</div>`;
    }
    if (this.panel === 'inventory') {
      const currentWeapon = weapon(state);
      body = `<div class="equipment-card"><div class="eyebrow">ЭКИПИРОВКА</div><h3>${currentWeapon.name}</h3><p>Урон ${currentWeapon.damage} · дальность ${currentWeapon.range} м${['pistol', 'carbine'].includes(currentWeapon.id) ? ` · зарядов ${state.ammo}` : ''}</p><div class="equipment-slots">${Object.entries({ armor: 'Защита', bag: 'Рюкзак', boots: 'Обувь' }).map(([slot, label]) => `<div><small>${label}</small><span>${RECIPES.find(r => r.id === state.equipment[slot])?.name || ({ armor: 'Обычная куртка', bag: 'Походная сумка', boots: 'Старые ботинки' }[slot])}</span></div>`).join('')}</div></div><div class="section-title"><h3>В рюкзаке</h3><span>${bagWeight(state)} / ${capacity(state)}</span></div>${this.resourceGrid(state.bag)}<button class="primary full-width" data-action="deposit" ${Math.hypot(state.x + 17, state.z - 16) > 13 ? 'disabled' : ''}>${icon('home', 16)} Сложить добычу дома</button><div class="section-title"><h3>Запасы убежища</h3><span>Без ограничения</span></div>${this.resourceGrid(state.stash)}<div class="section-title"><h3>Расходники</h3></div><div class="supplies"><button data-action="use-medkit" ${!state.medkits || state.health >= 100 ? 'disabled' : ''}>✚ Аптечка <b>${state.medkits}</b></button><button data-action="use-meal" ${!state.meals || (state.health >= 100 && state.stamina >= 100) ? 'disabled' : ''}>♨ Уха <b>${state.meals}</b></button><span>▰ Заряды <b>${state.ammo}</b></span></div><div class="section-title"><h3>Изготовленное снаряжение</h3></div><div class="owned-items">${state.owned.filter(id => RECIPES.find(r => r.id === id)?.slot).map(id => { const r = RECIPES.find(r => r.id === id); return `<button data-action="equip" data-id="${id}" ${r.slot === 'tool' ? 'disabled' : ''}>${r.icon} ${r.name}${Object.values(state.equipment).includes(id) || r.slot === 'tool' ? ' ✓' : ''}</button>`; }).join('') || '<p class="muted">Создай своё первое снаряжение на станции.</p>'}<button data-action="equip" data-id="pipe">↗ Стальная труба${state.equipment.weapon === 'pipe' ? ' ✓' : ''}</button></div>`;
    }
    if (this.panel === 'map') body = `<canvas id="large-map" width="560" height="420" aria-label="Карта района"></canvas><div class="location-list">${LOCATIONS.map(l => `<button data-action="travel" data-id="${l.id}"><span style="color:${l.color}">◇</span><div><strong>${l.name}</strong><small>${l.subtitle}</small></div>${icon('arrow', 15)}</button>`).join('')}</div>${state.grave ? '<p class="map-warning">✕ На карте отмечен оставленный рюкзак. Его можно вернуть.</p>' : ''}`;
    if (this.panel === 'journal') {
      body = `<div class="journal-note"><span class="note-date">ПЕРВАЯ ЗАПИСЬ</span><p>«В мастерской пахнет мокрым деревом. Печь ещё работает. Если починить генератор, здесь можно остаться. Пока это просто комната. Но уже моя».</p></div><div class="story-steps">${[
        ['generator', 'Верни свет домой', 'Старый генератор ждёт проводов и деталей. После ремонта оживёт мастерская.'],
        ['bridge', 'Открой путь в депо', 'Восстанови мост через дренажный канал. На другой стороне сохранились технические запасы.'],
        ['radio', 'Найди голос в тишине', 'Собери радиостанцию. Возможно, в этом мире остался кто-то ещё.'],
      ].map(([id, name, desc], i) => `<div class="story-step ${state.owned.includes(id) ? 'complete' : ''}"><span>${state.owned.includes(id) ? '✓' : `0${i + 1}`}</span><div><h3>${name}</h3><p>${desc}</p></div></div>`).join('')}</div>${state.chapterComplete ? '<div class="radio-message"><div class="eyebrow">ВХОДЯЩИЙ СИГНАЛ · 104.6</div><p>«Если кто-нибудь слышит… У нас есть семена. И свободное место за столом. Мы у водонапорной башни».</p><small>Конец первой главы. Следующий район пока не реализован.</small></div>' : ''}<div class="section-title"><h3>Твоя история в цифрах</h3></div><div class="stats-grid"><div><strong>${state.gathered}</strong><span>ресурсов найдено</span></div><div><strong>${state.trips}</strong><span>добычи сдано</span></div><div><strong>${state.placed.length}</strong><span>предметов дома</span></div><div><strong>${state.kills}</strong><span>дронов отключено</span></div></div><div class="section-title"><h3>Рыбацкая коллекция</h3><span>${state.fishCollection.length} / 4</span></div><div class="collection-list">${['Речной окунь', 'Серебряный карась', 'Лунная форель', 'Перламутровая раковина'].map(name => `<div class="${state.fishCollection.includes(name) ? 'found' : ''}">${icon('fish', 20)}<span>${state.fishCollection.includes(name) ? name : 'Неизвестная находка'}</span></div>`).join('')}</div>`;
    }
    if (this.panel === 'settings') body = `<div class="settings-row"><div><h3>Звуки района</h3><p>Ветер, шаги, инструменты и вода.</p></div><button class="toggle ${state.settings.sound ? 'on' : ''}" data-action="sound" aria-label="Переключить звук"><i></i></button></div><div class="settings-row"><div><h3>Качество графики</h3><p>Мягкие тени и свечение источников света.</p></div><button class="secondary" data-action="quality">${state.settings.quality === 'high' ? 'Высокое' : 'Экономное'}</button></div><div class="settings-row"><div><h3>Сохранение</h3><p id="save-note">Хранится только в этом браузере.</p></div><button class="secondary" data-action="save">Сохранить</button></div><button class="secondary full-width" data-action="export-save">Скачать сохранение</button><label class="import-save secondary full-width">Загрузить сохранение<input id="import-save" type="file" accept="application/json,.json"></label><div class="controls-table"><h3>Управление</h3><p><kbd>WASD / стрелки</kbd> Движение</p><p><kbd>ЛКМ по земле</kbd> Идти к точке</p><p><kbd>E</kbd> Сбор / действие / подсечка</p><p><kbd>Пробел</kbd> Атака / рыбалка</p><p><kbd>Shift</kbd> Бег</p><p><kbd>Q</kbd> Аптечка</p><p><kbd>R</kbd> Повернуть предмет при строительстве</p><p><kbd>Esc</kbd> Закрыть меню / отменить</p><p><kbd>Колесо мыши</kbd> Масштаб</p></div><div class="credits"><strong>Бесплатные 3D-модели: Kenney · CC0</strong><p>Персонаж, растительность, дроны и бластеры. Архитектура и эффекты созданы для игры.</p></div><button class="danger-button" data-action="reset">Начать новую историю…</button>`;
    element.innerHTML = `<header class="panel-header"><div class="eyebrow">${eyebrow}</div><button class="icon-button" data-action="close" aria-label="Закрыть меню">${icon('close')}</button><h2>${title}</h2><p>${subtitle}</p></header><div class="panel-body">${body}</div><footer class="panel-footer">${icon('leaf', 13)} Здесь можно не спешить. <span>ESC — закрыть</span></footer>`;
    if (this.panel === 'map') {
      const canvas = document.getElementById('large-map'); this.renderMap(canvas, true);
      canvas.addEventListener('click', event => {
        const rect = canvas.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width * 90 - 45;
        const z = (event.clientY - rect.top) / rect.height * 90 - 45;
        this.actions('map-point', { x, z });
      });
    }
    if (this.panel === 'settings') document.getElementById('import-save').addEventListener('change', event => this.actions('import-save', { file: event.target.files[0] }));
  }
  resourceGrid(resources) {
    const entries = Object.entries(RESOURCES);
    return `<div class="resource-grid">${entries.map(([id, resource]) => `<div class="resource-tile ${(resources[id] || 0) === 0 ? 'empty' : ''}"><span style="color:${resource.color}">${resource.icon}</span><div><small>${resource.name}</small><b>${resources[id] || 0}</b></div></div>`).join('')}</div>`;
  }
  renderMap(canvas, large = false) {
    const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    const p = (x, z) => [(x + 45) / 90 * w, (z + 45) / 90 * h];
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#263a34'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#65796c18'; ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) { ctx.beginPath(); ctx.moveTo(i / 10 * w, 0); ctx.lineTo(i / 10 * w, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i / 10 * h); ctx.lineTo(w, i / 10 * h); ctx.stroke(); }
    ctx.fillStyle = '#60716945'; ctx.fillRect(...p(-4, -43), 8 / 90 * w, 86 / 90 * h); ctx.fillRect(...p(-35, 0), 70 / 90 * w, 6 / 90 * h);
    ctx.fillStyle = '#557a764f'; ctx.beginPath(); ctx.ellipse(...p(23, -24), 10 / 90 * w, 8 / 90 * h, 0, 0, Math.PI * 2); ctx.fill();
    for (const [x, z, bw, bh] of [[-24, 11, 12, 9], [8, 0, 10, 8], [9.5, 15, 11, 8], [24.5, 0.5, 9, 11], [-27, -31, 16, 12]]) {
      ctx.fillStyle = '#87927b40'; ctx.strokeStyle = '#87927b50'; ctx.fillRect(...p(x, z), bw / 90 * w, bh / 90 * h); ctx.strokeRect(...p(x, z), bw / 90 * w, bh / 90 * h);
    }
    for (const l of LOCATIONS) {
      const [x, y] = p(l.x, l.z); ctx.fillStyle = l.color; ctx.beginPath(); ctx.arc(x, y, large ? 4 : 2.4, 0, Math.PI * 2); ctx.fill();
      if (large) { ctx.fillStyle = '#d7d7bd'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(l.name, x, y + 19); }
    }
    if (this.state.grave) { const [x, y] = p(this.state.grave.x, this.state.grave.z); ctx.fillStyle = '#e3a281'; ctx.font = '16px sans-serif'; ctx.fillText('×', x - 4, y + 4); }
    const [x, y] = p(this.state.x, this.state.z); ctx.fillStyle = '#f3dda5'; ctx.shadowBlur = 8; ctx.shadowColor = '#edc98b'; ctx.beginPath(); ctx.arc(x, y, large ? 5 : 3.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = '#f3dda566'; ctx.beginPath(); ctx.arc(x, y, large ? 10 : 6.5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#a8b5a1'; ctx.font = `${large ? 12 : 9}px sans-serif`; ctx.textAlign = 'right'; ctx.fillText('N ↑', w - 9, 16);
  }
  fishing(fish) {
    const element = document.getElementById('fish-ui'); element.hidden = !fish;
    if (!fish) return;
    if (fish.phase === 'wait') element.innerHTML = `<div class="eyebrow">${icon('fish', 15)} ТИХАЯ ВОДА</div><h3>Поплавок качается…</h3><p>Дождись поклёвки. Можно просто послушать воду.</p><div class="fishing-dots"><i></i><i></i><i></i></div><button class="text-button" data-action="cancel-fish">Смотать удочку</button>`;
    if (fish.phase === 'bite') element.innerHTML = `<div class="eyebrow bite-label">ЕСТЬ ПОКЛЁВКА!</div><h3>Подсекай!</h3><button class="primary full-width" data-action="fish-action">Подсечь <kbd>E / ПРОБЕЛ</kbd></button>`;
    if (fish.phase === 'reel') {
      const width = fish.upgraded ? 26 : 20;
      element.innerHTML = `<div class="eyebrow">${icon('fish', 15)} ДЕРЖИ ЛЕСКУ</div><h3>Поймай момент</h3><p>Нажми, когда указатель внутри светлой зоны.</p><div class="fish-meter"><span class="fish-target" style="left:${fish.target - width / 2}%;width:${width}%"></span><i style="left:${fish.needle}%"></i></div><div class="fish-score"><span>${'●'.repeat(fish.hits)}${'○'.repeat(3 - fish.hits)}</span><small>Ошибки: ${fish.misses} / 2</small></div><button class="primary full-width" data-action="fish-action">Подтянуть <kbd>E / ПРОБЕЛ</kbd></button>`;
    }
    if (fish.phase === 'caught') element.innerHTML = `<div class="eyebrow">${fish.result.rarity.toUpperCase()}</div><h3>${fish.result.name}</h3><p>+${fish.result.count} ${RESOURCES[fish.result.resource].name.toLowerCase()} · находка в рюкзаке</p><button class="primary full-width" data-action="fish-again">Ещё один заброс ${icon('arrow', 16)}</button><button class="text-button" data-action="cancel-fish">На сегодня хватит</button>`;
  }
  updateFishNeedle(value) { const needle = document.querySelector('.fish-meter i'); if (needle) needle.style.left = `${value}%`; }
  buildHint(recipe, valid, rotation) {
    const element = document.getElementById('build-hint'); element.hidden = !recipe;
    if (recipe) element.innerHTML = `${icon('build', 20)}<div><strong>${recipe.name}</strong><span>${valid ? 'Нажми на землю, чтобы разместить' : 'Выбери свободное место в убежище'}</span></div><button data-action="rotate-build">↻ ${Math.round(rotation * 180 / Math.PI)}°</button><button data-action="cancel-build" aria-label="Отменить строительство">${icon('close', 17)}</button>`;
  }
  floating(items, world) {
    const root = document.getElementById('floating-text'); root.replaceChildren();
    for (const item of items) {
      const p = world.screenPosition(item.x, item.y, item.z);
      const div = document.createElement('div'); div.className = 'float-label'; div.textContent = item.text;
      div.style.cssText = `left:${p.x}px;top:${p.y}px;color:${item.color};opacity:${Math.min(1, item.life)};`; root.appendChild(div);
    }
  }
  damage() { const el = document.getElementById('damage-flash'); el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit'); }
  fatal(message) { const el = document.getElementById('fatal'); el.hidden = false; el.innerHTML = `<h2>Не удалось открыть район</h2><p>${escape(message)}</p><button class="primary" data-action="reload">Попробовать снова</button>`; }
}
