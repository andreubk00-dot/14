import './style.css';
import './interface.css';
import './hud.css';
import './inventory.css';
import { equipItem, unequipItem, withdrawResource } from './inventory.js';
import { fishingFrameDelta } from './fishing.js';
import { hotbarItem, assignHotbar } from './hotbar.js';
import { Locomotion } from './movement.js';
import { World, LOCATIONS } from './world.js';
import { UI } from './ui.js';
import { DistrictAudio } from './audio.js';
import { SAVE_KEY, RESOURCES, RECIPES, HOME, freshState, validateSave, collect, deposit, craft, craftStatus, place, weapon, takeDamage, respawn, useSupply, catchFish, bagWeight, capacity, deliverContract, productionInfo, harvestProduction, updateHelper } from './game.js';

class QuietDistrict {
  constructor() {
    let loaded = null;
    try { loaded = validateSave(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch { /* Unavailable/corrupt storage does not prevent starting a new game. */ }
    this.state = loaded || freshState(); this.hasSave = !!loaded;
    this.started = false; this.ready = false; this.keys = new Set(); this.path = []; this.target = null;
    this.job = null; this.fish = null; this.build = null; this.pointerPosition = { x: innerWidth / 2, y: innerHeight / 2 };
    this.attackCooldown = 0; this.stepTimer = 0; this.uiTimer = 0; this.saveTimer = 0; this.visibilityPaused = false;
    this.motion = new Locomotion(); this.touchMovement = { x: 0, z: 0 }; this.audio = new DistrictAudio();
    this.ui = new UI(document.getElementById('app'), this.state, (action, data) => this.action(action, data));
    try {
      this.world = new World(document.getElementById('world'), this.state);
      this.world.setQuality(this.state.settings.quality);
      for (const item of this.state.placed) this.world.addPlaced(item);
      if (this.world.blocked(this.state.x, this.state.z)) {
        const candidates = [];
        for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) {
          const x = this.state.x + dx, z = this.state.z + dz;
          if (!this.world.blocked(x, z)) candidates.push({ x, z, distance: Math.hypot(dx, dz) });
        }
        candidates.sort((a, b) => a.distance - b.distance);
        const position = candidates[0] || HOME; this.world.move(position.x, position.z);
      }
      this.updateGrave(); this.bindInputs();
      this.world.loadAssets(progress => this.ui.loading(progress)).then(() => {
        this.ready = true; this.ui.ready(this.hasSave);
      }).catch(error => {
        console.error('Asset loading failed', error);
        this.ui.fatal('Не удалось загрузить локальные 3D-модели. Проверь соединение с сервером игры и попробуй ещё раз.');
      });
      this.lastFrame = performance.now(); this.frame = this.frame.bind(this); requestAnimationFrame(this.frame);
    } catch (error) {
      console.error('Renderer failed', error);
      this.ui.fatal('Для игры нужен браузер с WebGL 2. Попробуй актуальный Chrome, Edge или Firefox с аппаратным ускорением.');
    }
  }
  bindInputs() {
    const canvas = this.world.renderer.domElement;
    window.addEventListener('keydown', event => {
      if (event.target?.matches?.('input, textarea') && event.code !== 'Escape') return;
      const key = event.code;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(key)) {
        if (key !== 'Tab') event.preventDefault();
      }
      if (!this.started) return;
      if (this.ui.pendingConfirm) {
        if (key === 'Escape') this.ui.resolveConfirm(false);
        if (key === 'Tab') {
          event.preventDefault(); const buttons = [...document.querySelectorAll('#confirm-overlay button')];
          const index = buttons.indexOf(document.activeElement); buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
        }
        return;
      }
      if (key === 'Tab' && this.ui.panel) {
        const focusable = [...document.getElementById('panel').querySelectorAll('button:not(:disabled), input, [tabindex="0"]')];
        if (focusable.length) {
          event.preventDefault(); const current = focusable.indexOf(document.activeElement);
          focusable[(current + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length].focus();
        }
        return;
      }
      if (key === 'Escape') { this.cancelAction(); return; }
      if (event.repeat) { if (!this.ui.panel) this.keys.add(key); return; }
      if (!this.ui.panel && /^Digit[1-6]$/.test(key)) { event.preventDefault(); this.action('hotbar-use', { index: Number(key.slice(-1)) - 1 }); return; }
      const shortcuts = { KeyC: 'craft', KeyI: 'inventory', KeyB: 'build', KeyM: 'map', KeyJ: 'journal', KeyK: 'orders', KeyQ: 'use-medkit', KeyH: 'home' };
      if (shortcuts[key]) { this.action(shortcuts[key]); return; }
      if (key === 'KeyR' && this.build) { this.action('rotate-build'); return; }
      if (this.ui.panel) return;
      if (key === 'KeyE') { this.interact(); return; }
      if (key === 'Space') { if (this.fish) this.fishAction(); else this.attack(); return; }
      this.keys.add(key);
    });
    window.addEventListener('keyup', event => this.keys.delete(event.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.touchMovement = { x: 0, z: 0 }; });
    document.addEventListener('visibilitychange', () => {
      this.visibilityPaused = document.hidden; this.keys.clear(); this.touchMovement = { x: 0, z: 0 };
      if (document.hidden) { this.save(false); this.audio.pause(); } else if (this.started) this.audio.resume();
      this.lastFrame = performance.now();
    });
    window.addEventListener('pagehide', () => this.save(false));
    canvas.addEventListener('wheel', event => { event.preventDefault(); this.world.zoom(event.deltaY); }, { passive: false });
    canvas.addEventListener('pointermove', event => {
      this.pointerPosition = { x: event.clientX, y: event.clientY };
      if (this.build) this.updateBuildPreview();
    });
    canvas.addEventListener('pointerdown', event => {
      if (!this.started || this.ui.panel || event.button > 0) return;
      this.pointerPosition = { x: event.clientX, y: event.clientY };
      if (this.build) { this.updateBuildPreview(); this.confirmBuild(); return; }
      if (this.fish) return;
      const hit = this.world.pointer(event.clientX, event.clientY);
      this.job = null; this.ui.progress(null);
      if (hit.enemy?.health > 0) {
        this.target = { type: 'enemy', entity: hit.enemy, x: hit.enemy.x, z: hit.enemy.z };
        const distance = Math.hypot(hit.enemy.x - this.state.x, hit.enemy.z - this.state.z);
        if (distance <= weapon(this.state).range) { this.attack(hit.enemy); return; }
      } else if (hit.node?.group.visible) this.target = { type: 'node', entity: hit.node, x: hit.node.x, z: hit.node.z };
      else this.target = null;
      const dest = this.target || hit.point;
      this.navigate(dest.x, dest.z, false);
    });
    const joystick = document.getElementById('joystick'), stick = joystick.querySelector('span');
    let pointer = null;
    const update = event => {
      const rect = joystick.getBoundingClientRect(), dx = event.clientX - rect.left - rect.width / 2, dy = event.clientY - rect.top - rect.height / 2;
      const length = Math.hypot(dx, dy), scale = length > 30 ? 30 / length : 1;
      stick.style.transform = `translate(${dx * scale}px,${dy * scale}px)`;
      this.touchMovement = { x: dx * scale / 30, z: dy * scale / 30 }; this.path = []; this.target = null;
    };
    joystick.addEventListener('pointerdown', event => { pointer = event.pointerId; joystick.setPointerCapture(pointer); update(event); });
    joystick.addEventListener('pointermove', event => { if (event.pointerId === pointer) update(event); });
    const release = () => { pointer = null; this.touchMovement = { x: 0, z: 0 }; stick.style.transform = ''; };
    joystick.addEventListener('pointerup', release); joystick.addEventListener('pointercancel', release);
  }
  start() {
    if (!this.ready || this.started) return;
    this.started = true; this.audio.start(this.state.settings.sound); this.ui.start();
    this.ui.region(this.world.location(), true); this.currentRegion = this.world.location().id;
    this.save(false);
  }
  action(action, data = {}) {
    if (action === 'reload') { location.reload(); return; }
    if (action === 'start') { this.start(); return; }
    if (!this.started) return;
    if (action === 'panel-open') { this.motion.reset(); this.path = []; this.target = null; this.job = null; this.keys.clear(); this.touchMovement = { x: 0, z: 0 }; this.ui.progress(null); this.cancelFishing(); return; }
    if (action === 'panel-close') { this.keys.clear(); return; }
    if (this.ui.pendingConfirm) return;
    if (['craft', 'inventory', 'build', 'map', 'journal', 'settings', 'orders', 'helper', 'storage'].includes(action)) {
      if (action === 'storage' && !this.atHome()) { this.ui.toast('Подойди к хранилищу в убежище.'); return; }
      this.cancelBuild(); this.cancelFishing();
      if (this.ui.panel === action) this.ui.close(); else this.ui.open(action);
      return;
    }
    if (action === 'hud-change') { this.save(false); return; }
    if (action === 'hotbar-assign') {
      if (assignHotbar(this.state, Number(data.index), data.id || null)) this.changed(); return;
    }
    if (action === 'hotbar-use') { this.useHotbar(Number(data.index)); return; }
    if (action === 'craft-objective') { this.ui.open('craft', 'shelter'); return; }
    if (action === 'station-route') {
      this.ui.close(); this.target = { type: 'station', entity: { x: -19.5, z: 13 }, x: -19.5, z: 13 }; this.navigate(-19.5, 13); return;
    }
    if (action === 'helper-assignment') {
      if (this.state.owned.includes('helper') && ['garden', 'seedbed', 'purifier', 'recycler', 'rest'].includes(data.id)) this.state.helper.assignment = data.id;
      this.changed(); return;
    }
    if (action === 'deliver-order') {
      const result = deliverContract(this.state, data.id);
      this.ui.toast(result.ok ? `${result.contract.title}: награда на домашнем складе.` : result.reason, result.ok ? 'success' : 'info');
      if (result.ok) { this.audio.collect(); this.world.playCharacterAction('cheer'); } this.changed(); return;
    }
    if (action === 'dismiss-tutorial') { this.state.tutorial = false; document.getElementById('tutorial').hidden = true; this.save(); return; }
    if (action === 'make') { this.make(data.id); return; }
    if (action === 'move-furniture') {
      const index = Number(data.index), item = this.state.placed[index];
      if (!this.atHome() || !item) return;
      this.ui.close(); this.build = { recipe: RECIPES.find(r => r.id === item.id), rotation: item.rotation, movingIndex: index, valid: false };
      this.world.placedGroups[index].group.visible = false;
      this.world.createGhost(item.id); this.updateBuildPreview(); return;
    }
    if (action === 'equip' || action === 'unequip') {
      const result = action === 'equip' ? equipItem(this.state, data.id) : unequipItem(this.state, data.slot);
      if (!result.ok) this.ui.toast(result.reason);
      else this.world.updateEquipment();
      this.changed(); return;
    }
    if (action === 'withdraw') {
      const result = withdrawResource(this.state, data.id, Number(data.count));
      if (!result.ok) this.ui.toast(result.reason);
      this.changed(); return;
    }
    if (action === 'deposit') {
      if (!this.atHome()) { this.ui.toast('Добычу можно сложить только в убежище.'); return; }
      const n = deposit(this.state); this.ui.toast(n ? `Добыча дома: ${n} ресурсов отправлено на склад` : 'Рюкзак уже пуст.', n ? 'success' : 'info');
      if (n) this.audio.collect(); this.changed(); return;
    }
    if (['use-medkit', 'use-meal', 'use-tea'].includes(action)) {
      const ok = useSupply(this.state, action.replace('use-', ''));
      this.ui.toast(ok ? 'Теперь гораздо лучше.' : 'Сейчас нечего использовать или восстановление не требуется.', ok ? 'success' : 'info');
      if (ok) { this.audio.collect(); this.world.playCharacterAction('use_item'); } this.changed(); return;
    }
    if (action === 'sound') { this.state.settings.sound = !this.state.settings.sound; this.audio.toggle(this.state.settings.sound); this.changed(); return; }
    if (action === 'quality') { this.world.setQuality(this.state.settings.quality === 'high' ? 'low' : 'high'); this.changed(); return; }
    if (action === 'save') { this.save(true); return; }
    if (action === 'export-save') {
      const blob = new Blob([JSON.stringify(this.state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'quiet-district-save.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); return;
    }
    if (action === 'import-save' && data.file) {
      if (data.file.size > 1000000) { this.ui.toast('Файл сохранения слишком большой.'); return; }
      data.file.text().then(async text => {
        let next; try { next = validateSave(JSON.parse(text)); } catch { next = null; }
        if (!next) { this.ui.toast('Это не сохранение «Тихого района».'); return; }
        if (!await this.ui.confirm('Загрузить другую историю?', 'Текущий прогресс будет заменён выбранным сохранением.', 'Загрузить')) return;
        try {
          // Stop pagehide/autosave from overwriting the imported history with the old one.
          this.started = false; localStorage.setItem(SAVE_KEY, JSON.stringify(next)); location.reload();
        } catch { this.started = true; this.ui.toast('Браузер не разрешает сохранять данные.'); }
      }).catch(() => this.ui.toast('Не удалось прочитать файл.')); return;
    }
    if (action === 'reset') {
      this.ui.confirm('Начать новую историю?', 'Текущий прогресс будет удалён. Если хочешь вернуться к нему позже, сначала скачай сохранение.', 'Начать заново').then(confirmed => { if (confirmed) {
        try { localStorage.removeItem(SAVE_KEY); this.started = false; location.reload(); } catch { this.ui.toast('Не удалось удалить сохранение.'); }
      } });
      return;
    }
    if (action === 'travel' || action === 'home') {
      const target = LOCATIONS.find(l => l.id === (action === 'home' ? 'home' : data.id));
      const destination = target.id === 'depot' ? { x: -17, z: -20 } : target.id === 'market' ? { x: 13, z: 5 } : target.id === 'pond' ? { x: 19, z: -17 } : target.id === 'tower' ? { x: 30, z: -31 } : target.id === 'garden' ? { x: -34, z: -5 } : HOME;
      this.ui.close(); this.target = null; this.navigate(destination.x, destination.z); return;
    }
    if (action === 'map-point') { this.ui.close(); this.target = null; this.navigate(Number(data.x), Number(data.z)); return; }
    if (action === 'interact') { this.interact(); return; }
    if (action === 'attack') { if (this.fish) this.fishAction(); else this.attack(); return; }
    if (action === 'fish-action') { this.fishAction(); return; }
    if (action === 'fish-again') { this.startFishing(); return; }
    if (action === 'cancel-fish') { this.cancelFishing(); return; }
    if (action === 'rotate-build' && this.build) { this.build.rotation += Math.PI / 2; this.updateBuildPreview(); return; }
    if (action === 'cancel-build') { this.cancelBuild(); return; }
  }
  useHotbar(index) {
    if (!Number.isInteger(index) || index < 0 || index > 5 || this.ui.panel) return;
    if (this.build || this.fish) { this.ui.toast('Заверши строительство или смотай удочку, чтобы сменить предмет.'); return; }
    const item = hotbarItem(this.state, this.state.hotbar[index]);
    if (!item) { this.ui.toast('Назначь предмет в эту ячейку через инвентарь.'); return; }
    if (!item.available) { this.ui.toast(item.supply ? `${item.name}: запас закончился.` : `Сначала создай: ${item.name}.`); return; }
    if (item.supply) { this.action(`use-${item.id}`); return; }
    this.state.hotbarSelected = index;
    if (item.slot === 'weapon' || item.id === 'pipe') {
      this.state.equipment.weapon = item.id; this.world.updateEquipment();
    } else if (item.id === 'rod' || item.id === 'rod2') {
      if (Math.hypot(this.state.x - 19.7, this.state.z + 17) <= 3) this.startFishing();
      else this.ui.toast('Удочка готова. Подойди к затопленному причалу.');
    } else if (item.id === 'lantern') {
      this.state.lanternOn = !this.state.lanternOn; this.world.updateEquipment();
      this.ui.toast(this.state.lanternOn ? 'Фонарь включён.' : 'Фонарь выключен.');
    } else {
      const target = this.nearestInteraction();
      if (target?.type === 'node' && target.entity.requires === item.id) this.interact();
      else this.ui.toast(`${item.name} готов. Подойди к подходящей находке.`);
    }
    this.changed();
  }
  atHome() { return this.state.x >= -27 && this.state.x <= -6 && this.state.z >= 5 && this.state.z <= 27; }
  atStation() { return Math.hypot(this.state.x + 21, this.state.z - 13) < 4.5; }
  navigate(x, z, notify = true) {
    if (x < -43 || x > 43 || z < -43 || z > 43) return;
    this.path = this.world.pathTo(x, z);
    if (this.path.length) { this.world.setDestination(x, z); if (notify) this.ui.toast('Маршрут построен. WASD или стрелки — взять управление.'); }
    else { this.world.destination.visible = false; if (notify) this.ui.toast('Путь закрыт. Попробуй другую точку или восстанови мост.'); }
  }
  make(id) {
    const recipe = RECIPES.find(r => r.id === id);
    if (!recipe) return;
    if (recipe.placeable) {
      if (!this.atHome()) { this.ui.toast('Вернись домой, чтобы обустроить убежище.'); return; }
    } else if (!this.atStation()) { this.ui.toast('Подойди к станции рецептов в убежище.'); return; }
    const result = craft(this.state, id);
    if (!result.ok) { this.ui.toast(result.reason); return; }
    if (result.placement) {
      this.ui.close(); this.build = { recipe, rotation: 0, valid: false, x: this.state.x + 2, z: this.state.z };
      this.world.createGhost(id); this.updateBuildPreview(); return;
    }
    this.audio.craft(); this.world.applyProgress(); this.world.updateEquipment();
    if (recipe.slot === 'weapon') this.state.hotbarSelected = this.state.hotbar.indexOf(id);
    if (id === 'generator') { this.ui.toast('В убежище снова горит свет. Ты сделал это.', 'success'); this.ui.region(LOCATIONS.find(l => l.id === 'home'), true); }
    else if (id === 'bridge') this.ui.toast('Мост восстановлен. Депо теперь доступно.', 'success');
    else if (id === 'radio') { this.ui.toast('В тишине появился голос. Первая глава завершена.', 'success'); this.ui.open('journal'); }
    else if (id === 'pump') this.ui.toast('Чистая вода снова доступна. Грядки растут быстрее.', 'success');
    else if (id === 'solar') this.ui.toast('Солнечные панели питают производство. Дом стал самостоятельнее.', 'success');
    else this.ui.toast(`Готово: ${recipe.name}`, 'success');
    this.changed();
  }
  updateBuildPreview() {
    if (!this.build) return;
    const hit = this.world.pointer(this.pointerPosition.x, this.pointerPosition.y), b = this.build;
    b.x = Math.round(hit.point.x); b.z = Math.round(hit.point.z);
    b.valid = b.x >= -25 && b.x <= -7 && b.z >= 7 && b.z <= 25
      && !this.world.blocked(b.x, b.z, 0.85)
      && this.state.placed.every((p, i) => i === b.movingIndex || Math.hypot(p.x - b.x, p.z - b.z) >= 1.8)
      && Math.hypot(b.x + 21, b.z - 13) > 2
      && Math.hypot(b.x + 11, b.z - 11.4) > 1.8
      && Math.hypot(b.x + 13.5, b.z - 17) > 1.8
      && Math.hypot(b.x + 22, b.z - 17.7) > 1.8
      && (b.movingIndex !== undefined || craftStatus(this.state, b.recipe).ok);
    const ghost = this.world.ghost;
    ghost.position.set(b.x, 0.25, b.z); ghost.rotation.y = b.rotation;
    ghost.traverse(mesh => { if (mesh.isMesh) mesh.material.color.set(b.valid ? '#b6cd9a' : '#b57359'); });
    this.ui.buildHint(b.recipe, b.valid, b.rotation);
  }
  confirmBuild() {
    if (!this.build?.valid) { this.ui.toast('Здесь недостаточно места. Выбери свободный участок дома.'); return; }
    const b = this.build;
    if (b.movingIndex !== undefined) {
      const item = this.state.placed[b.movingIndex], group = this.world.placedGroups[b.movingIndex].group;
      item.x = b.x; item.z = b.z; item.rotation = b.rotation;
      group.position.set(b.x, 0.24, b.z); group.rotation.y = b.rotation;
      this.cancelBuild(); this.audio.craft(); this.changed(); return;
    }
    if (place(this.state, b.recipe.id, b.x, b.z, b.rotation)) {
      const item = this.state.placed.at(-1); this.world.addPlaced(item); this.audio.craft();
      this.ui.toast(`${b.recipe.name} — теперь часть твоего дома.`, 'success'); this.cancelBuild(); this.changed();
    } else { this.ui.toast('Не хватает материалов для размещения.'); this.cancelBuild(); }
  }
  cancelBuild() { if (this.build?.movingIndex !== undefined) this.world.placedGroups[this.build.movingIndex].group.visible = true; this.build = null; this.world?.removeGhost(); this.ui.buildHint(null); }
  cancelAction() {
    const navigation = document.querySelector('.toolbar');
    if (!navigation.hidden) {
      navigation.hidden = true; document.querySelector('[data-action="toggle-menu"]').setAttribute('aria-expanded', 'false'); return;
    }
    if (this.ui.panel) this.ui.close(); else if (this.build) this.cancelBuild(); else if (this.fish) this.cancelFishing();
    else { this.path = []; this.target = null; this.job = null; this.ui.progress(null); this.world.destination.visible = false; }
  }
  nearestInteraction() {
    const s = this.state, candidates = [];
    const add = (type, x, z, label, hint, entity, range = 2.4) => { const distance = Math.hypot(s.x - x, s.z - z); if (distance < range) candidates.push({ type, x, z, label, hint, entity, distance }); };
    for (const node of this.world.nodes) if (node.group.visible) add('node', node.x, node.z, `${({ tree: 'Рубить дерево', wood: 'Собрать доски', ore: 'Добыть металл', herbs: 'Собрать растения', electronics: 'Разобрать электронику', crate: 'Открыть ящик', cloth: 'Собрать ткань', scrap: 'Разобрать лом', drop: 'Забрать добычу' })[node.type] || 'Собрать'} · ${node.name}`, node.requires && !s.owned.includes(node.requires) ? `Нужно: ${RECIPES.find(r => r.id === node.requires)?.name}` : 'Добыча в рюкзак', node);
    add('station', -21, 13, 'Станция рецептов', 'Создать снаряжение', null, 2.8);
    add('storage', -13.5, 17, 'Открыть хранилище', 'Склад убежища', null, 2.2);
    add('bed', -22, 17.7, 'Отдохнуть', 'Восстановить здоровье', null, 2);
    add('fish', 19.7, -17, 'Забросить удочку', s.owned.includes('rod') ? 'Рыбалка' : 'Сначала создай удочку', null, 2.8);
    add('orders', -14.5, 12.8, 'Заказы соседей', 'Обмен материалов на награды', null, 2.2);
    if (s.owned.includes('helper')) add('helper', -18, 21, 'Лада · помощник убежища', 'Выбрать работу', null, 2.4);
    add('water', 30, -31, 'Набрать чистую воду', s.owned.includes('pump') ? 'Водоснабжение восстановлено' : 'Нужно восстановить насос', null, 2.6);
    if (s.grave) add('grave', s.grave.x, s.grave.z, 'Вернуть оставленный рюкзак', 'Твои ресурсы', s.grave);
    for (const p of s.placed) {
      const info = productionInfo(s, p);
      if (info) add('production', p.x, p.z, RECIPES.find(r => r.id === p.id).name, info.remaining ? `До готовности: ${Math.ceil(info.remaining)} сек.` : info.name, p);
      if (p.id === 'bed') add('bed', p.x, p.z, 'Отдохнуть', 'Восстановить здоровье полностью', p);
      if (p.id === 'chest') add('storage', p.x, p.z, 'Открыть хранилище', 'Склад убежища', p);
    }
    candidates.sort((a, b) => a.distance - b.distance); return candidates[0] || null;
  }
  interact() {
    if (!this.started || this.ui.panel || this.build) return;
    if (this.fish) { this.fishAction(); return; }
    if (this.job) return;
    const target = this.nearestInteraction();
    if (!target) { this.ui.toast('Подойди ближе к находке или рабочей станции.'); return; }
    this.path = []; this.target = null; this.world.destination.visible = false;
    if (target.type === 'station') { this.ui.open('craft'); return; }
    if (target.type === 'helper') { this.ui.open('helper'); return; }
    if (target.type === 'orders') { this.ui.open('orders'); return; }
    if (target.type === 'storage') { this.action('storage'); return; }
    if (target.type === 'fish') { this.startFishing(); return; }
    if (target.type === 'bed') {
      const max = target.entity ? 100 : 80;
      if (this.state.health >= max) { this.ui.toast(target.entity ? 'Ты уже хорошо отдохнул.' : 'Для полного восстановления создай удобную кровать.'); return; }
      this.job = { type: 'rest', elapsed: 0, duration: 3, x: this.state.x, z: this.state.z, max, label: 'Тишина. Можно передохнуть…' }; return;
    }
    if (target.type === 'production') {
      const result = harvestProduction(this.state, target.entity);
      if (result.ok) { this.showLoot(result.received, target.x, target.z); this.audio.collect(); this.world.playCharacterAction('pickup'); this.changed(); }
      else this.ui.toast(result.reason); return;
    }
    if (target.type === 'water') {
      if (!this.state.owned.includes('pump')) { this.ui.toast('Наладь водоснабжение через рецепт в мастерской.'); return; }
      if (this.state.elapsed - this.state.waterCollected < 90) { this.ui.toast('Насос наполняет резервуар. Подожди немного.'); return; }
      if (capacity(this.state) - bagWeight(this.state) < 1.5) { this.ui.toast('Освободи место для трёх бутылок воды.'); return; }
      collect(this.state, { water: 3 }); this.state.waterCollected = this.state.elapsed;
      this.showLoot({ water: 3 }, target.x, target.z); this.audio.water(); this.changed(); return;
    }
    if (target.type === 'grave') {
      const result = collect(this.state, this.state.grave.loot); this.showLoot(result.received, target.x, target.z);
      if (!Object.keys(result.remaining).length) { this.state.grave = null; this.ui.toast('Все вещи снова с тобой.', 'success'); } else this.state.grave.loot = result.remaining;
      this.updateGrave(); this.changed(); return;
    }
    if (target.type === 'node') this.harvest(target.entity);
  }
  harvest(node) {
    if (!node.group.visible || this.job) return;
    if (node.requires && !this.state.owned.includes(node.requires)) { this.ui.toast(`Нужно изготовить: ${RECIPES.find(r => r.id === node.requires).name}`); return; }
    if (bagWeight(this.state) >= capacity(this.state)) { this.ui.toast('Рюкзак полон. Вернись домой и сложи добычу.'); return; }
    this.job = { type: 'harvest', node, elapsed: 0, duration: node.type === 'tree' || node.type === 'ore' ? 1.8 : 1.1, x: this.state.x, z: this.state.z, label: node.type === 'herbs' ? 'Собираем травы…' : 'Разбираем находку…' };
    this.audio.hit();
    this.world.playCharacterAction('pickup');
  }
  finishJob() {
    const job = this.job; this.job = null; this.ui.progress(null);
    if (job.type === 'rest') { this.state.health = Math.max(this.state.health, job.max); this.state.stamina = 100; this.ui.toast('Силы вернулись. Дом ждёт новых находок.', 'success'); this.changed(); return; }
    const node = job.node, result = collect(this.state, node.loot);
    this.showLoot(result.received, node.x, node.z);
    node.loot = result.remaining;
    this.state.nodeLoot ||= {};
    if (!Object.keys(result.remaining).length) {
      this.state.depleted[node.id] = this.state.elapsed; delete this.state.nodeLoot[node.id];
      if (node.type === 'drop') this.state.drops = this.state.drops.filter(d => d.id !== node.id);
      node.group.visible = false; node.marker.visible = false;
    } else {
      this.state.nodeLoot[node.id] = { ...result.remaining };
      if (node.type === 'drop') { const savedDrop = this.state.drops.find(d => d.id === node.id); if (savedDrop) savedDrop.loot = { ...result.remaining }; }
      this.ui.toast('Рюкзак почти полон. Остальное осталось на месте.');
    }
    this.audio.collect(); this.changed();
  }
  showLoot(loot, x, z) {
    const entries = Object.entries(loot);
    if (entries.length) this.world.floatingText(entries.map(([id, n]) => `+${n} ${RESOURCES[id].name.toLowerCase()}`).join(' · '), x, z, '#e6cc98', entries.map(([id]) => id));
  }
  attack(target) {
    if (this.ui.panel || this.build || this.job || this.attackCooldown > 0) return;
    const s = this.state, w = weapon(s), ranged = ['pistol', 'carbine'].includes(w.id);
    target ||= this.world.enemies.filter(e => e.health > 0 && Math.hypot(e.x - s.x, e.z - s.z) <= w.range).sort((a, b) => Math.hypot(a.x - s.x, a.z - s.z) - Math.hypot(b.x - s.x, b.z - s.z))[0];
    if (!target || Math.hypot(target.x - s.x, target.z - s.z) > w.range) { this.ui.toast('В пределах досягаемости нет противника.'); return; }
    if (ranged && !s.ammo) { this.ui.toast('Нет зарядов. Создай их на станции или возьми трубу.'); return; }
    if (ranged) s.ammo--;
    this.attackCooldown = w.cooldown;
    this.world.facing = Math.atan2(target.x - s.x, target.z - s.z);
    this.world.playerVisual.rotation.y = this.world.facing;
    target.health = Math.max(0, target.health - w.damage); this.world.floatingText(`−${w.damage}`, target.x, target.z, '#edbf87');
    if (ranged) { this.world.shot(s.x, s.z, target.x, target.z); this.audio.shoot(); }
    else { this.world.impact(target.x, 1.2, target.z); this.audio.hit(); }
    this.world.playCharacterAction(ranged ? '1h_ranged_shoot' : '1h_melee_attack_chop');
    if (!target.health) {
      target.deadAt = s.elapsed; s.droneDeaths[target.id] = s.elapsed; s.kills++;
      const result = collect(s, { metal: 2, parts: 1 }); this.showLoot(result.received, target.x, target.z);
      if (result.full) {
        const drop = { id: `drop-${Date.now()}-${s.kills}`, x: target.x, z: target.z, loot: result.remaining };
        s.drops.push(drop); this.world.addDrop(drop);
        this.ui.toast('Рюкзак полон. Обломки остались на месте — вернись за ними.');
      }
      this.audio.collect(); this.target = null;
    }
    this.ui.update();
  }
  updateEnemies(dt) {
    for (const enemy of this.world.enemies) {
      if (enemy.health <= 0) {
        if (this.state.elapsed - enemy.deadAt > 180) { enemy.health = enemy.maxHealth; enemy.x = enemy.originX; enemy.z = enemy.originZ; delete this.state.droneDeaths[enemy.id]; }
        continue;
      }
      enemy.cooldown -= dt;
      const distance = Math.hypot(enemy.x - this.state.x, enemy.z - this.state.z), fromHome = Math.hypot(enemy.x - enemy.originX, enemy.z - enemy.originZ);
      let dx = 0, dz = 0;
      if (distance < 6.2 && fromHome < 10) {
        dx = this.state.x - enemy.x; dz = this.state.z - enemy.z;
        if (distance < 1.6 && enemy.cooldown <= 0) {
          enemy.cooldown = 1.25; this.ui.damage(); this.audio.hit();
          if (takeDamage(this.state, 11)) { this.die(); return; }
        }
      } else if (fromHome > 0.4) { dx = enemy.originX - enemy.x; dz = enemy.originZ - enemy.z; }
      const length = Math.hypot(dx, dz);
      if (length > 1.25 || (distance >= 6.2 && length > 0.4)) {
        const speed = distance < 6.2 ? 1.85 : 1.1;
        const nx = enemy.x + dx / length * speed * dt, nz = enemy.z + dz / length * speed * dt;
        if (!this.world.blocked(nx, enemy.z)) enemy.x = nx;
        if (!this.world.blocked(enemy.x, nz)) enemy.z = nz;
        enemy.group.rotation.y = Math.atan2(dx, dz);
      }
    }
  }
  die() {
    this.motion.reset(); this.keys.clear(); this.touchMovement = { x: 0, z: 0 };
    respawn(this.state); this.path = []; this.target = null; this.job = null; this.cancelFishing(); this.cancelBuild();
    this.world.move(this.state.x, this.state.z); this.ui.progress(null); this.world.destination.visible = false;
    for (const enemy of this.world.enemies) { enemy.x = enemy.originX; enemy.z = enemy.originZ; }
    this.updateGrave(); this.ui.toast('Ты очнулся дома. Рюкзак остался на месте — его можно вернуть.'); this.changed();
  }
  updateGrave() {
    if (this.graveGroup) { this.world.scene.remove(this.graveGroup); this.graveGroup = null; }
    if (this.state.grave) { this.graveGroup = this.world.crate(this.state.grave.x, this.state.grave.z, 0.75); }
  }
  startFishing() {
    if (!this.state.owned.includes('rod')) { this.ui.toast('Изготовь удочку на станции: дерево, ткань и провод.'); return; }
    if (bagWeight(this.state) > capacity(this.state) - 3) { this.ui.toast('Освободи хотя бы 3 места в рюкзаке для улова.'); return; }
    if (Math.hypot(this.state.x - 19.7, this.state.z + 17) > 3) return;
    this.path = []; this.target = null; this.keys.clear();
    this.fish = { phase: 'wait', timer: 0, biteAt: 2 + Math.random() * 3.5, upgraded: this.state.owned.includes('rod2'), hits: 0, misses: 0, needle: 0, target: 50, totalTime: 0 };
    this.audio.water(); this.ui.fishing(this.fish);
  }
  fishAction() {
    const f = this.fish; if (!f) return;
    if (f.phase === 'wait') return;
    if (f.phase === 'caught') { this.startFishing(); return; }
    if (f.phase === 'bite') { f.phase = 'reel'; f.timer = 0; f.totalTime = 0; f.target = 35 + Math.random() * 30; this.ui.fishing(f); return; }
    if (f.phase === 'reel') {
      if (Math.abs(f.needle - f.target) <= (f.upgraded ? 13 : 10)) { f.hits++; this.audio.water(); }
      else { f.misses++; this.audio.hit(); }
      if (f.misses >= 2) { this.ui.toast('Леска ослабла — рыба ушла. Попробуй ещё раз.'); this.cancelFishing(); return; }
      if (f.hits >= 3) {
        f.result = catchFish(Math.random, f.upgraded); f.phase = 'caught';
        const loot = { [f.result.resource]: f.result.count }; collect(this.state, loot);
        if (!this.state.fishCollection.includes(f.result.name)) this.state.fishCollection.push(f.result.name);
        this.showLoot(loot, this.state.x, this.state.z); this.audio.collect(); this.changed();
      } else { f.target = 28 + Math.random() * 44; }
      this.ui.fishing(f);
    }
  }
  updateFishing(dt) {
    const f = this.fish; if (!f) return;
    const delta = fishingFrameDelta(dt, f.phase); f.timer += delta;
    if (f.phase === 'wait' && f.timer >= f.biteAt) { f.phase = 'bite'; f.timer = 0; this.audio.bite(); this.ui.fishing(f); }
    if (f.phase === 'bite' && f.timer > 2.3) { this.ui.toast('Поклёвку упустили. Сделай новый заброс.'); this.cancelFishing(); }
    if (f.phase === 'reel') {
      f.totalTime += delta; f.needle = 50 + Math.sin(f.timer * 2.6) * 46; this.ui.updateFishNeedle(f.needle);
      if (f.totalTime > 18) { this.ui.toast('Рыба сорвалась. В следующий раз получится.'); this.cancelFishing(); }
    }
  }
  cancelFishing() { this.fish = null; this.ui.fishing(null); }
  movement(dt) {
    if (this.fish || this.build || this.job && !this.keys.size && !Math.hypot(this.touchMovement.x, this.touchMovement.z)) { this.motion.reset(); return false; }
    let screenX = this.touchMovement.x, screenZ = this.touchMovement.z;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) screenZ--;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) screenZ++;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) screenX--;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) screenX++;
    let dx = screenX * 0.754 + screenZ * 0.657, dz = screenZ * 0.754 - screenX * 0.657;
    const manual = Math.hypot(dx, dz) > 0.08;
    if (manual) { this.path = []; this.target = null; this.world.destination.visible = false; }
    else {
      while (this.path.length && Math.hypot(this.path[0].x - this.state.x, this.path[0].z - this.state.z) < 0.18) this.path.shift();
      if (this.path.length) { dx = this.path[0].x - this.state.x; dz = this.path[0].z - this.state.z; }
      else this.world.destination.visible = false;
    }
    const distance = Math.hypot(dx, dz);
    if (!manual && distance > 0) { dx /= distance; dz /= distance; }
    if (distance > 0.08 && this.job) { this.job = null; this.ui.progress(null); }
    const result = this.motion.update(dt, dx, dz, this.state.stamina,
      this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'), this.state.equipment.boots === 'boots');
    this.state.stamina = result.stamina; this.world.running = result.running;
    if (!manual && this.path.length && Math.hypot(result.x, result.z) > distance) {
      const ratio = distance / Math.hypot(result.x, result.z); result.x *= ratio; result.z *= ratio;
    }
    const oldX = this.state.x, oldZ = this.state.z;
    this.world.move(oldX + result.x, oldZ + result.z);
    const moved = Math.hypot(this.state.x - oldX, this.state.z - oldZ) > 0.0001;
    this.world.moveSpeed = Math.hypot(this.state.x - oldX, this.state.z - oldZ) / dt;
    if (moved) {
      this.world.facing = Math.atan2(this.state.x - oldX, this.state.z - oldZ); this.stepTimer += dt;
      if (this.stepTimer > (result.running ? 0.22 : 0.34)) { this.audio.step(); this.stepTimer = 0; }
      this.blockedTime = 0;
    } else if (this.path.length) {
      this.blockedTime = (this.blockedTime || 0) + dt;
      if (this.blockedTime > 0.4) { this.path = []; this.motion.reset(); this.world.destination.visible = false; }
    }
    return moved;
  }
  changed() { this.ui.update(); if (this.ui.panel) this.ui.renderPanel(); this.save(false); }
  save(notify = false) {
    if (!this.started) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
      document.getElementById('save-indicator').innerHTML = '<i></i>Сохранено';
      if (notify) this.ui.toast('История сохранена на этом устройстве.', 'success');
    } catch {
      document.getElementById('save-indicator').textContent = 'Не сохранено';
      if (!this.saveWarning || notify) { this.ui.toast('Браузер не разрешает сохранение. Скачай прогресс в настройках.'); this.saveWarning = true; }
    }
  }
  tick(dt) {
    const active = this.started && !this.ui.panel && !this.visibilityPaused;
    let moving = false;
    if (active) {
      this.state.elapsed += dt;
      if (updateHelper(this.state)) this.ui.update(); this.attackCooldown = Math.max(0, this.attackCooldown - dt);
      moving = this.movement(dt); this.updateEnemies(dt); this.audio.tick(this.state.elapsed);
      if (this.target) {
        const target = this.target, range = target.type === 'enemy' ? weapon(this.state).range : 2;
        if (Math.hypot(target.entity.x - this.state.x, target.entity.z - this.state.z) <= range) {
          this.path = []; this.world.destination.visible = false;
          if (target.type === 'node') { this.harvest(target.entity); this.target = null; }
          else if (target.type === 'station') { this.target = null; this.ui.open('craft'); }
          else this.attack(target.entity);
        }
      }
      if (this.job) {
        this.job.elapsed += dt; this.ui.progress(this.job.label, this.job.elapsed / this.job.duration);
        if (this.job.elapsed >= this.job.duration) this.finishJob();
      }
      this.uiTimer += dt; this.saveTimer += dt;
      if (this.uiTimer > 0.2) {
        this.uiTimer = 0; this.ui.update(); this.world.syncNodes();
        const context = this.fish || this.build || this.job ? null : this.nearestInteraction(); this.ui.context(context);
        this.world.selectionRing.visible = !!context && context.type === 'node';
        if (context) this.world.selectionRing.position.set(context.x, 0.13, context.z);
        const location = this.world.location();
        if (location.id !== this.currentRegion) { this.ui.region(location, true); this.currentRegion = location.id; }
      }
      if (this.saveTimer > 5) { this.saveTimer = 0; this.save(); }
    }
    return moving;
  }
  frame(time) {
    // Small simulation steps preserve movement and combat on slower GPUs.
    const elapsed = Math.min(Math.max(0, (time - this.lastFrame) / 1000), 0.5); this.lastFrame = time;
    let remaining = elapsed, moving = false;
    while (remaining > 0.0001) { const step = Math.min(1 / 60, remaining); moving = this.tick(step) || moving; remaining -= step; }
    if (this.started && !this.ui.panel && !this.visibilityPaused) this.updateFishing(elapsed);
    if (!this.visibilityPaused) {
      // A paused scene needs one frame, then only redraws for equipment, lighting or resize changes.
      if (!this.ui.panel || !this.panelRendered || this.world.renderDirty) this.world.update(this.ui.panel ? 0 : elapsed, moving, this.started);
      this.panelRendered = !!this.ui.panel;
      this.ui.floating(this.world.floating, this.world);
    }
    requestAnimationFrame(this.frame);
  }
}

const game = new QuietDistrict();
// Expose only in the development server for integration tests and inspection.
if (import.meta.env.DEV) window.__quietDistrict = game;
