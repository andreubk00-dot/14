import {QUARRY_WORKSHOP} from './quarry.js';
import {craftAtQuarry} from './game.js';
import {nearFoundStation,rememberPackingPlan,refillPackingPlan,salvageQueue} from './game.js';
import {idlePatrolTarget} from './patrols.js';
import {RESTORATIONS,restorationStatus,restoreRoute,drainBlocked} from './restoration.js';
import {FLOOD_DOCKS,CAMP,dockNearBoat,rowBoat,inWorld} from './floodplain.js';
import {repairField,atCamp,transferCamp,cookCamp} from './game.js';
import {beginEnemyAttack,advanceEnemyAttack,segmentDistance} from './enemy-combat.js';
import {addMapMark} from './map-marks.js';
import {harvestTimeline,advanceHarvest} from './harvesting.js';
import {salvageDuration} from './salvage.js';
import {toggleYardGate} from './game.js';
import {salvageStatus,takeSalvage,processSalvage,recoverCargo} from './game.js';
import {COOKING_RECIPES,atCookingStove} from './game.js';
import {swingProfile,selectMeleeTarget,advanceSwing,GUNS,coolWeapons,fireCharge,shotSpread,traceShot,beginDodge,advanceDodge} from './combat.js';
import {DRONE_TYPES,gearProfile,droneSees,attackCharge,updateAwareness,reactToHit} from './survival.js';
import {STRUCTURES,snapStructure,dismantleAllowed} from './construction.js';
import {buildStructure,dismantleStructure} from './game.js';
import {chooseInteraction,interactionKey} from './interactions.js';
import {reelMood,advanceReel,reelInput} from './fishing.js';
import {upgradeStation,startDrying,saveLoadout,applyLoadout} from './game.js';
import { GATES,FISHING_SPOTS,BAITS,gameHour,weatherAt,gateForPoint } from './expedition.js';
import {openGate,consumeBait,packFurniture,unpackFurniture,updateRainCrops} from './game.js';
import { CROPS, FINDS, MEMORIES, dismantleInfo } from './homelife.js';
import { clockAnchor,furniturePoint } from './layout.js';
import { discover, WORLD_LIMIT } from './district.js';
import './style.css';
import './interface.css';
import './hud.css';
import './inventory.css';
import { equipItem, unequipItem, withdrawResource } from './inventory.js';
import { fishingFrameDelta } from './fishing.js';
import {SUPPLY_FIELDS,activeFood} from './food.js';
import {discoverCultivar} from './homelife.js';
import { hotbarItem, assignHotbar } from './hotbar.js';
import { Locomotion } from './movement.js';
import { World, LOCATIONS } from './world.js';
import { UI } from './ui.js';
import { DistrictAudio } from './audio.js';
import { SAVE_KEY, RESOURCES, RECIPES, HOME, claimFind, takeStoredFind, plantCrop, recoverFinds, freshState, validateSave, collect, deposit, craft, craftStatus, place, weapon, takeDamage, respawn, useSupply, catchFish, bagWeight, capacity, deliverContract, productionInfo, harvestProduction, updateHelper } from './game.js';

class QuietDistrict {
  constructor() {
    let loaded = null;
    try { loaded = validateSave(JSON.parse(localStorage.getItem(SAVE_KEY))); } catch { /* Unavailable/corrupt storage does not prevent starting a new game. */ }
    this.state = loaded || freshState(); this.hasSave = !!loaded;
    this.started = false; this.ready = false; this.keys = new Set(); this.path = []; this.target = null;
    this.job = null; this.fish = null; this.build = null; this.pointerPosition = { x: innerWidth / 2, y: innerHeight / 2 };
    this.aiming=false;this.aimPoint=null;this.dodging=null;this.swing=null;this.attackCooldown = 0; this.stepTimer = 0; this.uiTimer = 0; this.saveTimer = 0; this.visibilityPaused = false;
    this.motion = new Locomotion(); this.touchMovement = { x: 0, z: 0 }; this.audio = new DistrictAudio();
    this.ui = new UI(document.getElementById('app'), this.state, (action, data) => this.action(action, data));
    try {
      this.world = new World(document.getElementById('world'), this.state);
      this.ui.nodes=this.world.nodes;
      discover(this.state,this.world.nodes);
      this.world.setQuality(this.state.settings.quality);
      this.repairedFurniture = this.world.repairFurniture();
      for (const item of this.state.placed) this.world.addPlaced(item);
      const room=gateForPoint(this.state.x,this.state.z,.5),closedRoom=this.world.gates.find(g=>g.id===room&&!this.state.openedGates.includes(g.id));
      if(closedRoom)this.world.move(closedRoom.x,closedRoom.z+1.2);
      if (!this.state.boat.aboard && this.world.blocked(this.state.x, this.state.z)) {
        const candidates = [];
        for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) {
          const x = this.state.x + dx, z = this.state.z + dz;
          if (!this.world.blocked(x, z)) candidates.push({ x, z, distance: Math.hypot(dx, dz) });
        }
        candidates.sort((a, b) => a.distance - b.distance);
        const position = candidates[0] || HOME; this.world.move(position.x, position.z);
      }
      this.updateGrave(); this.bindInputs();
      this.frame = this.frame.bind(this);
      this.world.loadAssets(progress => this.ui.loading(progress*.9)).then(async () => {
        // Warm the final scene once, instead of compiling an incomplete scene
        // during loading and compiling it again when models and lights arrive.
        this.ui.loading(.95);
        this.world.scene.updateMatrixWorld(true);this.world.camera.updateMatrixWorld(true);
        if(this.world.renderer.extensions.has('KHR_parallel_shader_compile'))await this.world.renderer.compileAsync(this.world.scene,this.world.camera);
        else this.world.renderer.compile(this.world.scene,this.world.camera);
        this.world.update(0,false,false);
        this.ready = true; this.ui.ready(this.hasSave);
        this.lastFrame=performance.now();requestAnimationFrame(this.frame);
      }).catch(error => {
        console.error('Asset loading failed', error);
        this.ui.fatal('Не удалось загрузить локальные 3D-модели. Проверь соединение с сервером игры и попробуй ещё раз.');
      });
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
      if(key==='KeyR'&&this.fish?.phase==='reel'&&!this.ui.panel){this.action('relax-fish');return;}
      if(key==='KeyR'&&!this.ui.panel&&!this.fish&&!this.build){this.ventWeapon();return;}
      if(key==='AltLeft'&&!this.ui.panel){event.preventDefault();this.dodge();return;}
      if (key === 'KeyR' && this.build) { this.action('rotate-build'); return; }
      if (this.ui.panel) return;
      if(key==='KeyF'&&!this.fish&&!this.build&&!this.job){event.preventDefault();this.cycleInteraction();return;}
      if (key === 'KeyE') { this.interact(); return; }
      if (key === 'Space') { if (this.fish) this.fishAction(); else this.attack(); return; }
      this.keys.add(key);
    });
    window.addEventListener('keyup', event => this.keys.delete(event.code));
    window.addEventListener('blur', () => {this.aiming=false;this.aimPoint=null;this.dodging=null; this.keys.clear(); this.touchMovement = { x: 0, z: 0 }; });
    document.addEventListener('visibilitychange', () => {
      this.visibilityPaused = document.hidden; this.keys.clear(); this.touchMovement = { x: 0, z: 0 };
      if (document.hidden) { this.save(false); this.audio.pause(); } else if (this.started) this.audio.resume();
      this.lastFrame = performance.now();
    });
    window.addEventListener('pagehide', () => this.save(false));
    canvas.addEventListener('wheel', event => { event.preventDefault(); this.world.zoom(event.deltaY); }, { passive: false });
    canvas.addEventListener('contextmenu',event=>event.preventDefault());
    window.addEventListener('mouseup',event=>{if(event.button===2){this.aiming=false;this.aimPoint=null;}});
    canvas.addEventListener('pointermove', event => {
      this.pointerPosition = { x: event.clientX, y: event.clientY };
      if (this.build) this.updateBuildPreview();
      if(this.aiming&&this.aimPoint)this.updateAim();
    });
    // Chorded mice send mousedown, but no second pointerdown while RMB is held.
    canvas.addEventListener('mousedown',event=>{
      if(event.button===2&&this.started&&!this.ui.panel&&!this.build&&!this.fish&&!this.job&&!this.state.boat.aboard&&GUNS[weapon(this.state).id]){event.preventDefault();this.aiming=true;this.aimPoint={};this.pointerPosition={x:event.clientX,y:event.clientY};this.path=[];this.target=null;this.updateAim();return;}
      if(event.button===0&&(event.buttons&2)&&this.aiming&&!this.ui.panel)this.attack();
    });
    canvas.addEventListener('pointerdown', event => {
      if (!this.started || this.ui.panel || event.button > 0) return;
      this.pointerPosition = { x: event.clientX, y: event.clientY };
      if (this.build) { this.updateBuildPreview(); this.confirmBuild(); return; }
      if (this.fish) return;
      if(this.aiming&&GUNS[weapon(this.state).id]){this.attack();return;}
      const hit = this.world.pointer(event.clientX, event.clientY);
      this.job = null; this.ui.progress(null);
      if(this.state.boat.aboard){this.target=null;this.navigate(hit.point.x,hit.point.z,false);return;}
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
    this.started = true; this.audio.start(this.state.settings.sound);this.audio.setMusic(this.state.settings.music,this.state.settings.musicVolume); this.ui.start();
    if(this.repairedFurniture) { this.ui.toast('Мебель, пересекавшая стены или проходы, переставлена на ближайшие свободные места.'); this.repairedFurniture=0; this.save(); }
    this.ui.region(this.world.location(), true); this.currentRegion = this.world.location().id;
    this.save(false);
  }
  action(action, data = {}) {
    if (action === 'reload') { location.reload(); return; }
    if (action === 'start') { this.start(); return; }
    if (!this.started) return;
    if(action==='dodge'){this.dodge();return;}
    if(action==='vent'){this.ventWeapon();return;}
    if(action==='aim'){if(!this.ui.panel&&!this.build&&!this.fish&&!this.job&&!this.state.boat.aboard&&GUNS[weapon(this.state).id]){this.aiming=!this.aiming;this.aimPoint=null;this.path=[];this.target=null;this.ui.aiming=this.aiming;this.ui.update();}return;}
    if (action === 'panel-open') {this.aiming=false;this.aimPoint=null;this.dodging=null; this.state.boat.vx=this.state.boat.vz=0;this.swing=null;this.world.clearWeaponEffect(); this.motion.reset(); this.path = []; this.target = null; this.job = null; this.keys.clear(); this.touchMovement = { x: 0, z: 0 }; this.ui.progress(null); this.cancelFishing(); return; }
    if (action === 'panel-close') { this.keys.clear(); return; }
    if(this.state.boat.aboard&&['build','craft','orders','station-route','structure-select'].includes(action)){this.ui.toast('Сначала причаль к берегу.');return;}
    if (this.ui.pendingConfirm) return;
    if (['craft', 'inventory', 'build', 'map', 'journal', 'settings', 'orders', 'helper', 'storage', 'garden','dryer','station','loadouts','architecture','cook','salvage','salvage-workbench','packing','quarry-workshop'].includes(action)) {
      if (action === 'storage' && !this.atHome()) { this.ui.toast('Подойди к хранилищу в убежище.'); return; }
      this.cancelBuild(); this.cancelFishing();
      if (this.ui.panel === action) this.ui.close(); else this.ui.open(action);
      return;
    }
    if(action==='salvage-quick'||action==='salvage-take'){
      const node=this.world.nodes.find(n=>n.id===this.ui.salvageNode);this.ui.close();if(!node||Math.hypot(node.x-this.state.x,node.z-this.state.z)>2.4)return;
      if(action==='salvage-quick')this.harvest(node);else {const status=salvageStatus(this.state,node);if(!status.ok)this.ui.toast(status.reason);else {this.world.playCharacterAction('pickup');this.audio.collect();this.job={type:'haul',node,elapsed:0,duration:2.4,label:'Грузим технику…'};}}return;
    }
    if(action==='packing-remember'||action==='packing-refill'){
      const result=action==='packing-remember'?rememberPackingPlan(this.state):refillPackingPlan(this.state);
      if(!result.ok)this.ui.toast(result.reason);else this.ui.toast(action==='packing-remember'?'Состав рюкзака запомнен.':Object.keys(result.missing).length?'Получено доступное. Не всё удалось пополнить: проверь запас и свободный вес.':'Рюкзак пополнен по списку.','success');this.changed();return;
    }
    if(action==='process-salvage-all'){
      const result=salvageQueue(this.state);if(!result.ok){this.ui.toast(result.reason);return;}
      this.ui.close();this.beginSalvageQueue(result.queue);return;
    }
    if(action==='process-salvage'){
      const index=Number(data.index),stored=data.stored==='true';if(Math.hypot(this.state.x+21,this.state.z-13)>=4.5&&!nearFoundStation(this.state,'salvagejig')){this.ui.toast('Подойди к станции рецептов или оснастке.');return;}
      const cargo=(stored?this.state.storedCargo:this.state.cargo)[index];if(!cargo)return;this.ui.close();this.world.playCharacterAction('pickup');this.job={type:'process-salvage',cargo,index,stored,elapsed:0,duration:salvageDuration(this.state),label:'Разбираем технику на верстаке…'};return;
    }
    if(action==='quarry-craft'){const result=craftAtQuarry(this.state,data.id);if(result.ok){this.audio.craft();this.ui.toast('Готово. Материалы взяты из рюкзака.','success');}else this.ui.toast(result.reason);this.changed();return;}
    if(action==='start-restoration'){const id=data.id,result=restorationStatus(this.state,id);if(!result.ok){this.ui.toast(result.reason);return;}const p=RESTORATIONS.find(p=>p.id===id);this.ui.close();this.job={type:'restore-route',projectId:id,elapsed:0,duration:p.duration,x:this.state.x,z:this.state.z,label:p.name+'…'};this.world.playCharacterAction('pickup');return;}
    if(action==='field-repair'){const result=repairField(this.state,data.id);if(result.ok){this.audio.craft();this.ui.toast(data.id==='boat'?'Лодка готова к выходу на воду.':'Стоянка восстановлена. Можно отдохнуть и оставить запасы.','success');this.world.renderDirty=true;this.changed();}else this.ui.toast(result.reason);return;}
    if(action==='camp-transfer'){const result=transferCamp(this.state,data.id,data.direction,Number(data.count));if(!result.ok)this.ui.toast(result.reason);this.changed();return;}
    if(action==='camp-cook'){const result=cookCamp(this.state,data.id);if(result.ok){this.audio.craft();this.ui.toast('Еда готова.','success');}else this.ui.toast(result.reason);this.changed();return;}
    if(action==='camp-rest'){if(!atCamp(this.state))return;this.ui.close();this.job={type:'rest',elapsed:0,duration:3,x:this.state.x,z:this.state.z,max:80,label:'Отдыхаем на стоянке…'};return;}
    if(action==='boat-land'){this.landBoat();return;}
    if (action === 'hud-change') { this.save(false); return; }
    if (action === 'hotbar-assign') {
      if (assignHotbar(this.state, Number(data.index), data.id || null)) this.changed(); return;
    }
    if (action === 'hotbar-use') { this.useHotbar(Number(data.index)); return; }
    if (action === 'craft-objective' || action==='craft-projects') { this.ui.open('craft',data.category||'shelter'); return; }
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
    if(action==='withdraw-find') {const result=takeStoredFind(this.state,data.id,Number(data.count));if(!result.ok)this.ui.toast(result.reason);this.changed();return;}
    if(action==='plant-crop'||action==='harvest-bed') {
      const item=this.state.placed[Number(data.index)];if(!item||!this.atHome()||Math.hypot(item.x-this.state.x,item.z-this.state.z)>3) {this.ui.toast('Подойди к грядке.');return;}
      const result=action==='plant-crop'?plantCrop(this.state,item,data.id):harvestProduction(this.state,item);if(!result.ok)this.ui.toast(result.reason);else {this.audio.collect();this.world.renderDirty=true;}this.changed();return;
    }
    if(action==='toggle-furniture') {const p=this.state.placed[Number(data.index)];if(!p||!this.atHome()||!['lamp','foundlamp','desklamp','homeradio','recordplayer'].includes(p.id))return;p.enabled=!p.enabled;this.world.renderDirty=true;this.world.syncFurniture();this.changed();return;}
    if(action==='structure-select'){if(!this.atHome())return;const recipe=STRUCTURES[data.id];if(!recipe)return;this.cancelBuild();this.ui.close();this.build={recipe:{...recipe,id:data.id,structural:true},rotation:0,valid:false};this.world.createStructureGhost(data.id);this.updateBuildPreview();return;}
    if(action==='station-details'){if(!this.atHome())return;this.ui.stationIndex=Number(data.index);this.ui.open('station');return;}
    if(action==='upgrade-station'||action==='harvest-station'){
      const item=this.state.placed[Number(data.index)];if(!item||!this.atHome()||action==='harvest-station'&&Math.hypot(item.x-this.state.x,item.z-this.state.z)>3)return;const result=action==='upgrade-station'?upgradeStation(this.state,item):harvestProduction(this.state,item);if(!result.ok)this.ui.toast(result.reason);else {if(action==='upgrade-station'){this.world.refreshStation(item);this.audio.craft();}else this.audio.collect();this.ui.toast(action==='upgrade-station'?'Улучшение установлено.':'Продукция получена.','success');}this.changed();return;
    }
    if(action==='load-dryer'||action==='harvest-dryer'){
      const item=this.state.placed[Number(data.index)];if(!item||!this.atHome()||Math.hypot(item.x-this.state.x,item.z-this.state.z)>3)return;
      const result=action==='load-dryer'?startDrying(this.state,item):harvestProduction(this.state,item);if(!result.ok)this.ui.toast(result.reason);else this.ui.toast(result.mealOutput?`Готово: ${result.mealOutput} порции походной еды.`:'Улов загружен.','success');this.changed();return;
    }
    if(action==='save-loadout'||action==='apply-loadout'){
      const index=Number(data.index);if(action==='save-loadout'){if(saveLoadout(this.state,index))this.ui.toast('Комплект сохранён.','success');}
      else {const result=applyLoadout(this.state,index);if(!result.ok)this.ui.toast(result.reason);else {this.world.updateEquipment();this.ui.toast('Комплект надет.','success');}}this.changed();return;
    }
    if(action==='pack-furniture') {
      this.cancelBuild();const index=Number(data.index),entry=this.world.placedGroups[index];
      if(!this.atHome()||!packFurniture(this.state,index)) {this.ui.toast('Нельзя убрать последнюю кровать приглашённого помощника или переполнить склад мебели.');return;}
      if(entry){this.world.scene.remove(entry.group);entry.group.traverse(m=>{if(m.isMesh)m.geometry.dispose();if(m.isPointLight)this.world.lights=this.world.lights.filter(l=>l.light!==m);});this.world.placedGroups.splice(index,1);}
      this.world.refreshConstructionLighting();this.world.renderDirty=true;this.changed();return;
    }
    if(action==='unpack-furniture') {
      const index=Number(data.index),item=this.state.packedFurniture[index];if(!this.atHome()||!item||this.state.placed.length>=70)return;
      this.cancelBuild();this.ui.close();this.build={recipe:RECIPES.find(r=>r.id===item.id),rotation:item.rotation,packedIndex:index,valid:false};this.world.createGhost(item.id);this.updateBuildPreview();return;
    }
    if(action==='bait-menu') {this.cancelFishing();this.ui.open('fishing');return;}
    if(action==='select-bait') {if(Object.hasOwn(BAITS,data.id))this.state.fishingBait=data.id;this.changed();return;}
    if(action==='cast-selected') {this.ui.close();this.startFishing();return;}
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
      const n = deposit(this.state); this.ui.toast(n ? `На склад отправлено: ${n} материалов и находок` : (bagWeight(this.state)>0?'В рюкзаке остались выбранные материалы или техника, для которой нет места на складе.':'Рюкзак уже пуст.'), n ? 'success' : 'info');
      if (n) this.world.syncNodes();this.audio.collect(); this.changed(); return;
    }
    if (action.startsWith('use-')&&Object.hasOwn(SUPPLY_FIELDS,action.slice(4))) {
      const ok = useSupply(this.state, action.replace('use-', ''));
      this.ui.toast(ok ? (activeFood(this.state)&&['fishmeal','stew'].includes(action.slice(4))?`${activeFood(this.state).name} · 8 минут.`:'Теперь гораздо лучше.') : 'Сейчас нечего использовать или восстановление не требуется.', ok ? 'success' : 'info');
      if (ok) { this.audio.collect(); this.world.playCharacterAction('use_item'); } this.changed(); return;
    }
    if (action === 'sound') { this.state.settings.sound = !this.state.settings.sound; this.audio.toggle(this.state.settings.sound); this.changed(); return; }
    if(action==='music'){this.state.settings.music=!this.state.settings.music;this.audio.setMusic(this.state.settings.music,this.state.settings.musicVolume);this.changed();return;}
    if(action==='music-volume'){this.state.settings.musicVolume=Number(data.value);this.audio.setMusic(this.state.settings.music,this.state.settings.musicVolume);this.save();return;}
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
      if(!target||!this.state.visited.includes(target.id)) return;
      let destination = target.id === 'depot' ? { x: -17, z: -20 } : target.id === 'market' ? { x: 13, z: 5 } : target.id === 'pond' ? { x: 19, z: -17 } : target.id === 'tower' ? { x: 30, z: -31 } : target.id === 'garden' ? { x: -34, z: -5 } : target.id==='home'?HOME:{x:target.x,z:target.z};
      if(this.state.boat.aboard){const dock=FLOOD_DOCKS.find(d=>d.id===target.id)||(target.id==='floodshore'?FLOOD_DOCKS[0]:null);if(!dock){this.ui.toast('К этому месту нужно идти с берега.');return;}destination={...dock.boat};}
      const gate=this.world.gates.find(g=>g.id===gateForPoint(target.x,target.z)&&!this.state.openedGates.includes(g.id));if(gate)destination={x:gate.x,z:gate.z+1.2};
      this.ui.close(); this.target = null; this.navigate(destination.x, destination.z); return;
    }
    if (action === 'keep-resource') {
      if (!Object.hasOwn(RESOURCES,data.id)) return;
      const list=this.state.keepResources, index=list.indexOf(data.id);
      if(index<0) list.push(data.id); else list.splice(index,1);
      this.changed(); return;
    }
    if (action === 'map-add') {
      const ok=addMapMark(this.state,Number(data.x),Number(data.z),data.label);
      if(ok) this.ui.mapMarking=false;
      else this.ui.toast(this.state.mapMarks.length>=16?'На карте уже 16 отметок. Удали ненужную.':'Поставь отметку внутри района.');
      this.changed(); return;
    }
    if (action === 'map-remove') {
      this.state.mapMarks=this.state.mapMarks.filter(m=>m.id!==Number(data.id)); this.changed(); return;
    }
    if (action === 'map-go') {
      const mark=this.state.mapMarks.find(m=>m.id===Number(data.id));
      if(mark) {this.ui.close();this.target=null;this.navigate(mark.x,mark.z);} return;
    }
    if (action === 'map-point') { this.ui.close(); this.target = null; this.navigate(Number(data.x), Number(data.z)); return; }
    if (action === 'interact') { this.interact(); return; }
    if (action === 'attack') { if (this.fish) this.fishAction(); else this.attack(); return; }
    if(action==='cycle-interaction'){this.cycleInteraction();return;}
    if(action==='relax-fish'){if(this.fish?.phase==='reel'){reelInput(this.fish,'relax');this.ui.fishing(this.fish);}return;}
    if (action === 'fish-action') { this.fishAction(); return; }
    if (action === 'fish-again') { this.startFishing(); return; }
    if (action === 'cancel-fish') { this.cancelFishing(); return; }
    if (action === 'rotate-build' && this.build) {if(this.build.recipe.structural){this.build.axis=this.build.part?.axis==='x'?'z':'x';this.updateBuildPreview();return;} this.build.rotation += Math.PI / 2; this.updateBuildPreview(); return; }
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
      if (target?.type === 'node' && (target.entity.requires === item.id||dismantleInfo(this.state.owned,target.entity).tool===item.id)) this.interact();
      else this.ui.toast(`${item.name} готов. Подойди к подходящей находке.`);
    }
    this.changed();
  }
  atHome() { return this.state.x >= -27 && this.state.x <= -6 && this.state.z >= 5 && this.state.z <= 27; }
  atStation() { return Math.hypot(this.state.x + 21, this.state.z - 13) < 4.5; }
  navigate(x, z, notify = true) {
    if (!inWorld(x,z)) return;
    if(this.state.boat.aboard){this.path=this.world.boatPathTo(x,z);this.target=null;if(this.path.length){const end=this.path.at(-1);this.world.setDestination(end.x,end.z);}else if(notify)this.ui.toast('Выбери свободную воду или причал.');return;}
    this.path = this.world.pathTo(x, z);
    if (this.path.length) { this.world.setDestination(x, z); if (notify) this.ui.toast('Маршрут построен. WASD или стрелки — взять управление.'); }
    else { this.world.destination.visible = false; if (notify) this.ui.toast('Выбранная точка недоступна.'); }
  }
  make(id) {
    const recipe = RECIPES.find(r => r.id === id);
    if (!recipe) return;
    if (recipe.placeable) {
      if (!this.atHome()) { this.ui.toast('Вернись домой, чтобы обустроить убежище.'); return; }
    } else if (!(this.atStation()||COOKING_RECIPES.includes(id)&&this.atHome()&&atCookingStove(this.state))) { this.ui.toast('Подойди к станции рецептов в убежище.'); return; }
    const result = craft(this.state, id);
    if (!result.ok) { this.ui.toast(result.reason); return; }
    if (result.placement) {
      this.ui.close(); this.build = { recipe, rotation: 0, valid: false, x: this.state.x + 2, z: this.state.z };
      this.world.createGhost(id); this.updateBuildPreview(); return;
    }
    this.audio.craft(); this.world.applyProgress(); this.world.updateEquipment();
    if (recipe.slot === 'weapon') this.state.hotbarSelected = this.state.hotbar.indexOf(id);
    if (id === 'generator') { this.ui.toast('В убежище снова горит свет. Ты сделал это.', 'success'); this.ui.region(LOCATIONS.find(l => l.id === 'home'), true); }
    else if (id === 'bridge') this.ui.toast('Мост восстановлен. Через канаву снова можно пройти.', 'success');
    else if (id === 'radio') this.ui.toast('Связь восстановлена. С Ладой можно договориться о помощи в убежище.', 'success');
    else if (id === 'pump') this.ui.toast('Чистая вода снова доступна. Грядки растут быстрее.', 'success');
    else if (id === 'solar') this.ui.toast('Солнечные панели питают производство. Дом стал самостоятельнее.', 'success');
    else this.ui.toast(`Готово: ${recipe.name}`, 'success');
    this.changed();
  }
  updateBuildPreview() {
    if (!this.build) return;
    const hit = this.world.pointer(this.pointerPosition.x, this.pointerPosition.y), b = this.build;
    if(b.recipe.structural){const selected=this.world.structureUnderPointer();const part=b.recipe.id==='dismantle'?selected:b.recipe.id!=='floor'&&selected&&selected.id!=='floor'?{...selected,id:b.recipe.id}:snapStructure(b.recipe.id,hit.point.x,hit.point.z,this.state.construction,b.axis);b.part=part;const status=b.recipe.id==='dismantle'?dismantleAllowed(this.state,part):this.world.canBuildStructure(part);b.valid=status.ok;b.reason=status.reason;this.world.updateStructureGhost(part,b.valid);this.ui.buildHint(b.recipe,b.valid,part?.axis==='z'?Math.PI/2:0);const hint=document.querySelector('#build-hint span');if(hint)hint.textContent=b.valid?(b.recipe.id==='dismantle'?'Нажми на выбранную деталь для разбора':(status.old?'Нажми, чтобы заменить деталь; доплата: '+(Object.entries(status.cost).map(([id,n])=>n+' '+RESOURCES[id].name.toLowerCase()).join(', ')||'не требуется'):'Нажми, чтобы установить конструкцию')):status.reason;return;}
    Object.assign(b,furniturePoint(hit.point.x,hit.point.z));
    if(['wallclock','fishtrophy','wallshelf','estatepanel'].includes(b.recipe.id)) {const anchor=clockAnchor(hit.point.x,hit.point.z,b.recipe.id,this.state.construction);if(anchor) Object.assign(b,anchor);}
    let status=this.world.placementStatus({id:b.recipe.id,x:b.x,z:b.z,rotation:b.rotation},b.movingIndex);
    if(status.ok&&b.movingIndex===undefined&&b.packedIndex===undefined)status=craftStatus(this.state,b.recipe);
    b.valid=status.ok;b.reason=status.reason;
    const ghost = this.world.ghost;
    ghost.position.set(b.x, this.world.furnitureElevation(b.x,b.z), b.z); ghost.rotation.y = b.rotation;
    ghost.traverse(mesh => { if (mesh.isMesh) mesh.material.color.set(b.valid ? '#b6cd9a' : '#b57359'); });
    this.ui.buildHint(b.recipe, b.valid, b.rotation,b.reason);
  }
  confirmBuild() {
    if(this.build?.recipe.structural){const b=this.build,result=b.recipe.id==='dismantle'?dismantleStructure(this.state,b.part):buildStructure(this.state,b.part,this.world.colliders);if(!result.ok){this.ui.toast(result.reason);return;}this.world.rebuildConstruction();this.audio.craft();this.changed();this.updateBuildPreview();return;}
    if (!this.build?.valid || !this.world.canPlace({id:this.build.recipe.id,x:this.build.x,z:this.build.z,rotation:this.build.rotation},this.build.movingIndex)) { this.ui.toast(this.build?.reason||'Выбери свободное место в убежище.'); return; }
    const b = this.build;
    if (b.movingIndex !== undefined) {
      const item = this.state.placed[b.movingIndex], group = this.world.placedGroups[b.movingIndex].group;
      item.x = b.x; item.z = b.z; item.rotation = b.rotation;
      group.position.set(b.x, this.world.furnitureElevation(b.x,b.z), b.z); group.rotation.y = b.rotation;
      this.world.refreshConstructionLighting();this.cancelBuild(); this.audio.craft(); this.changed(); return;
    }
    if(b.packedIndex!==undefined) {
      if(unpackFurniture(this.state,b.packedIndex,b.x,b.z,b.rotation,this.world.colliders)){this.world.addPlaced(this.state.placed.at(-1));this.audio.craft();this.cancelBuild();this.changed();}else this.ui.toast('Не удалось разместить вещь. Она осталась на складе.');return;
    }
    if (place(this.state, b.recipe.id, b.x, b.z, b.rotation,this.world.colliders)) {
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
    if(s.boat.aboard){const dock=dockNearBoat(s.boat);return dock?{type:'boat-land',x:dock.boat.x,z:dock.boat.z,label:'Причалить · '+dock.name,hint:'Выйти на настил',entity:dock,distance:0}:{type:'boat-water',x:s.x,z:s.z,label:'На воде',hint:'WASD / стрелки · подойди к причалу для высадки',distance:0};}
    const add = (type, x, z, label, hint, entity, range = 2.4) => { const distance = Math.hypot(s.x - x, s.z - z); if (distance < range) candidates.push({ type, x, z, label, hint, entity, distance }); };
    if(s.restoredRoutes.includes(QUARRY_WORKSHOP.id)&&this.world.canSee(s.x,s.z,QUARRY_WORKSHOP.x,QUARRY_WORKSHOP.z,null,true))add('quarry-workshop',QUARRY_WORKSHOP.x,QUARRY_WORKSHOP.z,'Мастерская разреза','Заряды и аптечки · материалы из рюкзака',QUARRY_WORKSHOP,2.6);
    for(const p of RESTORATIONS)if(!s.restoredRoutes.includes(p.id)&&Math.hypot(s.x-p.x,s.z-p.z)<2.6&&this.world.canSee(s.x,s.z,p.x,p.z,null,true))add('restoration',p.x,p.z,p.name,s.owned.includes('wrench')?'Ремонт · материалы из рюкзака':'Нужен гаечный ключ',p,2.6);
    for(const note of this.world.memories) if((s.x-note.x)**2+(s.z-note.z)**2<1.8**2&&this.world.canSee(s.x,s.z,note.x,note.z,null,true))add('note',note.x,note.z,'Прочитать запись',note.name,note,1.8);
    for (const node of this.world.nodes) if (node.group.visible&&(s.x-node.x)**2+(s.z-node.z)**2<2.4**2&&(!node.accessGate||s.openedGates.includes(node.accessGate))&&this.world.canSee(s.x,s.z,node.x,node.z,node.collider,true)) add('node', node.x, node.z, `${s.brokenNodes.includes(node.id)?'Забрать добычу':['appliance','motor'].includes(node.machine)?'Осмотреть технику':({ tree: 'Рубить дерево', wood: 'Собрать доски', stone:'Добыть камень', ore: 'Добыть металл', herbs: 'Собрать растения', electronics: 'Разобрать электронику', crate: 'Открыть ящик', cloth: 'Собрать ткань', scrap: 'Разобрать лом', drop: 'Забрать добычу' })[node.type] || (node.find?'Забрать находку':'Собрать')} · ${node.name}`, node.requires && !s.owned.includes(node.requires) ? `Нужно: ${RECIPES.find(r => r.id === node.requires)?.name}` : node.find?`Вес находки: ${FINDS[node.find].weight}`:s.brokenNodes.includes(node.id)?'Оставшиеся ресурсы в рюкзак':dismantleInfo(s.owned,node).kind?`${dismantleInfo(s.owned,node).duration.toFixed(1)} сек. · ${dismantleInfo(s.owned,node).fast?'инструмент ускоряет разбор':'ручной разбор'}`:'Добыча в рюкзак', node);
    const nearBoat=FLOOD_DOCKS.find(d=>Math.hypot(s.boat.x-d.boat.x,s.boat.z-d.boat.z)<3.2&&Math.hypot(s.x-d.foot.x,s.z-d.foot.z)<2.8);
    if(nearBoat)add(s.boat.repaired?'boat-board':'boat-repair',nearBoat.foot.x,nearBoat.foot.z,s.boat.repaired?'Сесть в лодку':'Восстановить лодку',s.boat.repaired?'Свободное движение по воде':'Доски, ткань и металл из рюкзака',nearBoat,2.8);
    add('camp',CAMP.x,CAMP.z,s.camp.ready?'Камышовая стоянка':'Обустроить стоянку',s.camp.ready?'Отдых · печь · местный ящик':'Принеси доски, ткань и металл',CAMP,3);
    add('station', -21, 13, 'Станция рецептов', 'Создать снаряжение', null, 2.8);
    add('storage', -13.5, 17, 'Открыть хранилище', 'Склад убежища', null, 2.2);
    add('bed', -22, 17.7, 'Отдохнуть', 'Восстановить здоровье', null, 2);
    for(const spot of FISHING_SPOTS)add('fish',spot.x,spot.z,'Забросить удочку',s.owned.includes('rod')?spot.name:'Сначала создай удочку',spot,2.8);
    for(const gate of this.world.gates)if(gate.group.visible)add('gate',gate.x,gate.z,gate.name,s.owned.includes(gate.tool)?'Открыть проход':`Нужно: ${RECIPES.find(r=>r.id===gate.tool).name}`,gate,2.6);
    add('orders', -14.5, 12.8, 'Заказы соседей', 'Обмен материалов на награды', null, 2.2);
    if (s.owned.includes('helper')) add('helper', -18, 21, 'Лада · помощник убежища', 'Выбрать работу', null, 2.4);
    add('water', 30, -31, 'Набрать чистую воду', s.owned.includes('pump') ? 'Водоснабжение восстановлено' : 'Нужно восстановить насос', null, 2.6);
    if (s.grave) add('grave', s.grave.x, s.grave.z, 'Вернуть оставленный рюкзак', 'Твои ресурсы', s.grave);
    for (const p of s.placed) {
      const info = productionInfo(s, p);
      if(p.id==='yardgate')add('yardgate',p.x,p.z,p.open?'Закрыть калитку':'Открыть калитку','Ограда двора',p);
      if(p.id==='packingdesk')add('packing',p.x,p.z,'Стол подготовки вылазок','Запомнить и пополнить рюкзак',p,3);
      if(p.id==='salvagejig')add('salvage-workbench',p.x,p.z,'Разборочная оснастка','Разобрать привезённую технику',p,3);
      if(p.id==='campstove')add('cook',p.x,p.z,'Кухонная печь','Готовить еду и чай',p,2.5);
      if(p.id==='dryrack')add('dryer',p.x,p.z,'Сушилка для улова',info.needsLoading?'Загрузить рыбу':info.remaining?`До готовности: ${Math.ceil(info.remaining)} сек.`:'Еда готова',p);
      if(['gearrack','toolcabinet'].includes(p.id))add('loadouts',p.x,p.z,p.id==='toolcabinet'?'Инструментальный шкаф':'Стеллаж комплектов','Выбрать снаряжение',p);
      if(p.id==='cropbed') add('garden',p.x,p.z,'Посадочная грядка',info?info.remaining?`Растёт: ${Math.ceil(info.remaining)} сек.`:'Урожай готов':'Выбрать посадки',p);
      if(['lamp','foundlamp','desklamp','homeradio','recordplayer'].includes(p.id)) add('furniture-toggle',p.x,p.z,['recordplayer','homeradio'].includes(p.id)?(p.enabled?'Выключить ':'Включить ')+(p.id==='homeradio'?'приёмник':'проигрыватель'):(p.enabled?'Погасить свет':'Включить свет'),'Обустройство убежища',p);
      if (info&&!['cropbed','dryrack'].includes(p.id)) add('production', p.x, p.z, RECIPES.find(r => r.id === p.id).name, info.waitingForRain?'Ожидает дождь':info.remaining ? `До готовности: ${Math.ceil(info.remaining)} сек.` : info.name, p);
      if (p.id === 'bed') add('bed', p.x, p.z, 'Отдохнуть', 'Восстановить здоровье полностью', p);
      if (p.id === 'chest') add('storage', p.x, p.z, 'Открыть хранилище', 'Склад убежища', p);
    }
    this.interactionCandidates=candidates;const target=chooseInteraction(candidates,this.preferredInteraction,this.interactionLocked);if(target){const key=interactionKey(target);if(key!==this.preferredInteraction)this.interactionLocked=false;this.preferredInteraction=key;}else {this.preferredInteraction=null;this.interactionLocked=false;}return target;
  }
  cycleInteraction(){if(!this.started||this.ui.panel||this.build||this.fish||this.job)return;this.nearestInteraction();const c=this.interactionCandidates;if(c.length<2)return;const i=c.findIndex(e=>interactionKey(e)===this.preferredInteraction);this.preferredInteraction=interactionKey(c[(i+1)%c.length]);this.interactionLocked=true;this.ui.context(this.nearestInteraction());}
  interact() {
    if (!this.started || this.ui.panel || this.build) return;
    if (this.fish) { this.fishAction(); return; }
    if (this.job) return;
    const target = this.nearestInteraction();
    if (!target) { this.ui.toast('Подойди ближе к находке или рабочей станции.'); return; }
    this.path = []; this.target = null; this.world.destination.visible = false;
    if(target.type==='boat-water'){this.ui.toast('Подойди к одному из деревянных причалов.');return;}
    if(target.type==='boat-land'){this.landBoat();return;}
    if(target.type==='boat-board'){const b=this.state.boat;b.aboard=true;b.vx=b.vz=0;b.lastDock=target.entity.id;this.state.x=b.x;this.state.z=b.z;this.motion.reset();this.keys.clear();this.swing=null;this.world.player.position.set(b.x,.33,b.z);this.world.renderDirty=true;this.audio.water();this.changed();return;}
    if(target.type==='boat-repair'){this.ui.open('boat-repair');return;}
    if(target.type==='restoration'){this.ui.restorationId=target.entity.id;this.ui.open('restoration');return;}
    if(target.type==='camp'){this.ui.open('camp');return;}
    if(target.type==='dryer'){this.ui.stationIndex=undefined;this.ui.dryerIndex=this.state.placed.indexOf(target.entity);this.ui.open('dryer');return;}
    if(target.type==='yardgate'){const result=toggleYardGate(this.state,target.entity,this.world.colliders);if(!result.ok)this.ui.toast(result.reason);else {this.world.renderDirty=true;this.world.syncFurniture();this.audio.playSample(target.entity.open?'door_open_1':'door_close_1',.3);this.changed();}return;}
    if(target.type==='cook'){this.ui.open('cook');return;}
    if(target.type==='loadouts'){this.ui.open('loadouts');return;}
    if(target.type==='gate') {if(!this.state.owned.includes(target.entity.tool)){this.ui.toast('Нужен '+RECIPES.find(r=>r.id===target.entity.tool).name);return;}this.job={type:'gate',gate:target.entity,elapsed:0,duration:target.entity.duration,label:target.entity.kind?'Разбираем завал…':'Открываем проход…'};return;}
    if(['packing','salvage-workbench','quarry-workshop'].includes(target.type)){this.ui.open(target.type);return;}
    if(target.type==='note') {if(!this.state.notes.includes(target.entity.id))this.state.notes.push(target.entity.id);this.ui.noteId=target.entity.id;this.ui.open('note');this.save(false);return;}
    if(target.type==='garden') {this.ui.gardenIndex=this.state.placed.indexOf(target.entity);this.ui.open('garden');return;}
    if(target.type==='furniture-toggle') {this.action('toggle-furniture',{index:this.state.placed.indexOf(target.entity)});return;}
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
      if (result.ok) { this.showLoot(result.received, target.x, target.z); if(result.toStash) this.ui.toast('Продукция отправлена на склад.'); this.audio.collect(); this.world.playCharacterAction('pickup'); this.changed(); }
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
      const recovered=recoverFinds(this.state,this.state.grave.finds),cargoRecovered=recoverCargo(this.state,this.state.grave.cargo);
      if (!Object.keys(result.remaining).length&&recovered&&cargoRecovered) { this.state.grave = null; this.ui.toast('Все вещи снова с тобой.', 'success'); } else this.state.grave.loot = result.remaining;
      this.updateGrave(); this.changed(); return;
    }
    if (target.type === 'node') this.beginNode(target.entity);
  }
  beginNode(node){if(!this.world.canSee(this.state.x,this.state.z,node.x,node.z,node.collider,true)){this.ui.toast('Подойди к находке со стороны открытого прохода.');return;}if(['appliance','motor'].includes(node.machine)){this.ui.salvageNode=node.id;this.ui.open('salvage');}else this.harvest(node);}
  harvest(node) {
    if (!node.group.visible ||drainBlocked(node.x,node.z,0,this.state.restoredRoutes)|| this.job||this.swing) return;
    if(node.accessGate&&!this.state.openedGates.includes(node.accessGate)){this.ui.toast('Сначала открой вход в помещение подходящим инструментом.');return;}
    if (node.requires && !this.state.owned.includes(node.requires)) { this.ui.toast(`Нужно изготовить: ${RECIPES.find(r => r.id === node.requires).name}`); return; }
    if (bagWeight(this.state) >= capacity(this.state)) { this.ui.toast('Рюкзак полон. Вернись домой и сложи добычу.'); return; }
    const resourceWork=['standingtree','quarry'].includes(node.machine)&&!this.state.brokenNodes.includes(node.id);
    const duration=this.state.brokenNodes.includes(node.id)?.65:dismantleInfo(this.state.owned,node).duration;
    this.job = { type:'harvest',node,resourceWork,elapsed:0,duration,beats:resourceWork?harvestTimeline(duration):[],x:this.state.x,z:this.state.z,label:this.state.brokenNodes.includes(node.id)?'Собираем добычу…':node.type==='herbs'?'Собираем травы…':node.machine==='standingtree'?'Рубим дерево…':node.machine==='quarry'?'Добываем камень…':'Разбираем находку…' };
    if(resourceWork){this.world.setHarvestTool(node.requires);this.world.facing=Math.atan2(node.x-this.state.x,node.z-this.state.z);this.world.playerVisual.rotation.y=this.world.facing;this.harvestBeat(this.job);}else this.world.playCharacterAction('pickup');
  }
  beginSalvageQueue(queue){
    // Keep object identities: cancellation or a changed inventory cannot process a different load.
    const next=queue.shift();if(!next)return;
    const index=(next.stored?this.state.storedCargo:this.state.cargo).indexOf(next.cargo);
    if(index<0||!nearFoundStation(this.state,'salvagejig'))return;
    this.world.playCharacterAction('pickup');this.job={type:'process-salvage',...next,index,queue,elapsed:0,duration:salvageDuration(this.state),x:this.state.x,z:this.state.z,label:`Разбираем технику · осталось ${queue.length+1}…`};
  }
  harvestBeat(job){
    for(const beat of advanceHarvest(job)){
      if(beat.type==='swing'){this.world.playCharacterAction('1h_melee_attack_chop');this.audio.swing(job.node.requires);}
      else {this.world.resourceStrike(job.node);this.audio.resourceHit(job.node.machine,job.node.x,job.node.z,beat.final);}
    }
  }
  finishJob() {
    const job = this.job; this.job = null; this.ui.progress(null);
    if(job.type==='vent'){this.state.gunHeat[job.weaponId]=0;this.state.gunLocked[job.weaponId]=false;this.audio.playSample('metal_click',.25);this.changed();return;}
    if(job.type==='restore-route'){const result=restoreRoute(this.state,job.projectId);if(result.ok){this.world.syncNodes();this.world.flood.restorations.sync();this.world.renderDirty=true;this.audio.craft();this.ui.toast(job.projectId==='quarry-workshop'?'Мастерская разреза готова. Заряды и аптечки можно делать здесь.':job.projectId==='drain-works'?'Ремонтный зал осушен. Сквозной выход открыт.':'Мостки восстановлены. Можно идти пешком.','success');this.changed();}else this.ui.toast(result.reason);return;}
    if (job.type === 'rest') { this.state.health = Math.max(this.state.health, job.max); this.state.stamina = 100; this.ui.toast('Силы вернулись. Дом ждёт новых находок.', 'success'); this.changed(); return; }
    if(job.type==='gate'){const result=openGate(this.state,job.gate.id);if(result.ok){this.world.syncGates();if(result.received)this.showLoot(result.received,job.gate.x,job.gate.z);this.audio.craft();this.ui.toast('Проход открыт.','success');this.changed();}else this.ui.toast(result.reason);return;}
    if(job.type==='process-salvage'){const list=job.stored?this.state.storedCargo:this.state.cargo;if(list[job.index]!==job.cargo)return;const result=processSalvage(this.state,job.index,job.stored);if(result.ok){this.audio.craft();this.ui.selectedItem=null;this.changed();if(job.queue?.length&&nearFoundStation(this.state,'salvagejig')){this.beginSalvageQueue(job.queue);return;}this.ui.toast('Техника разобрана. Материалы на складе.','success');this.ui.open('salvage-workbench');}else this.ui.toast(result.reason);return;}
    if(job.type==='haul'){const result=takeSalvage(this.state,job.node);if(result.ok){this.world.syncNodes();this.audio.collect();this.ui.toast('Техника в рюкзаке. Можно разобрать на станции.','success');this.changed();}else this.ui.toast(result.reason);return;}
    const node=job.node;
    if(node.find) {const result=claimFind(this.state,node);if(!result.ok) this.ui.toast(result.reason);else {node.group.visible=false;node.marker.visible=false;if(node.collider)node.collider.disabled=true;this.world.floatingText(`+1 ${FINDS[node.find].name}`,node.x,node.z,'#e6cc98',[node.find]);this.audio.collect();}this.changed();return;}
    const wasBroken=this.state.brokenNodes.includes(node.id);const result=collect(this.state,node.loot);if(['standingtree','quarry'].includes(node.machine)&&Object.keys(result.received).length&&!this.state.brokenNodes.includes(node.id))this.state.brokenNodes.push(node.id);
    if(['appliance','motor'].includes(node.machine)&&Object.keys(result.received).length&&Object.keys(result.remaining).length&&!this.state.strippedNodes.includes(node.id))this.state.strippedNodes.push(node.id);
    const cultivar=discoverCultivar(this.state,node,result.received);if(cultivar)this.ui.toast(`Новая посадка: ${cultivar.name}. Семена теперь можно высаживать дома.`,'success');
    this.showLoot(result.received, node.x, node.z);
    node.loot = result.remaining;
    this.state.nodeLoot ||= {};
    if (!Object.keys(result.remaining).length) {
      this.state.depleted[node.id] = this.state.elapsed; delete this.state.nodeLoot[node.id];
      if (node.type === 'drop') this.state.drops = this.state.drops.filter(d => d.id !== node.id);
      node.group.visible = false; node.marker.visible = false;if(node.collider)node.collider.disabled=true;
    } else {
      this.state.nodeLoot[node.id] = { ...result.remaining };
      if (node.type === 'drop') { const savedDrop = this.state.drops.find(d => d.id === node.id); if (savedDrop) savedDrop.loot = { ...result.remaining }; }
      this.ui.toast('Рюкзак почти полон. Остальное осталось на месте.');
    }
    if(!wasBroken&&Object.keys(result.received).length&&['standingtree','quarry'].includes(node.machine))this.world.breakResource(node,this.state.x,this.state.z);this.world.syncNodes();this.audio.collect(); this.changed();
  }
  showLoot(loot, x, z) {
    const entries = Object.entries(loot);
    if (entries.length) this.world.floatingText(entries.map(([id, n]) => `+${n} ${RESOURCES[id].name.toLowerCase()}`).join(' · '), x, z, '#e6cc98', entries.map(([id]) => id));
  }
  updateAim(){
    if(!this.aiming||!this.aimPoint)return;
    const p=this.world.groundPoint(this.pointerPosition.x,this.pointerPosition.y);if(!p)return;
    this.aimPoint={x:p.x,z:p.z};if(!this.swing&&!this.dodging){this.world.facing=Math.atan2(p.x-this.state.x,p.z-this.state.z);this.world.playerVisual.rotation.y=this.world.facing;}
  }
  dodge(){
    if(!this.started||this.ui.panel||this.build||this.fish||this.job||this.dodging||this.state.boat.aboard||this.swing&&!this.swing.resolved)return;
    let x=this.touchMovement.x,z=this.touchMovement.z;
    if(this.keys.has('KeyW')||this.keys.has('ArrowUp'))z--;if(this.keys.has('KeyS')||this.keys.has('ArrowDown'))z++;
    if(this.keys.has('KeyA')||this.keys.has('ArrowLeft'))x--;if(this.keys.has('KeyD')||this.keys.has('ArrowRight'))x++;
    const dx=x*.754+z*.657,dz=z*.754-x*.657,f=this.world.facing||0;
    const result=beginDodge(this.state,Math.hypot(dx,dz)>.08?dx:-Math.sin(f),Math.hypot(dx,dz)>.08?dz:-Math.cos(f));
    if(!result){this.ui.toast(this.state.stamina<24?'Для уклонения нужно 24 выносливости.':'Уклонение ещё восстанавливается.');return;}
    this.dodging=result;this.swing=null;this.path=[];this.target=null;this.motion.reset();this.world.clearWeaponEffect();this.audio.playSample('handle_small_leather',.2);this.changed();
  }
  ventWeapon(){
    const id=weapon(this.state).id;
    if(!this.started||!GUNS[id]||this.state.boat.aboard||this.ui.panel||this.build||this.fish||this.job||this.dodging||this.swing)return;
    if(this.state.gunHeat[id]<.05)return;
    this.path=[];this.target=null;this.motion.reset();this.job={type:'vent',weaponId:id,x:this.state.x,z:this.state.z,elapsed:0,duration:1.2,label:'Охлаждаем оружие…'};this.audio.playSample('metal_click',.25);
  }
  attack(target) {
    if(this.state.boat.aboard||this.ui.panel||this.build||this.job||this.swing||this.dodging||this.attackCooldown>0)return;
    const s=this.state,w=weapon(s),ranged=!!GUNS[w.id],manual=ranged&&this.aiming&&this.aimPoint;
    if(!manual)target ||= this.world.enemies.filter(e=>e.health>0&&Math.hypot(e.x-s.x,e.z-s.z)<=w.range&&this.world.canSee(s.x,s.z,e.x,e.z)).sort((a,b)=>Math.hypot(a.x-s.x,a.z-s.z)-Math.hypot(b.x-s.x,b.z-s.z))[0];
    if(!manual&&target?.health<=0)return;
    if(!manual&&target&&(Math.hypot(target.x-s.x,target.z-s.z)>w.range||!this.world.canSee(s.x,s.z,target.x,target.z))){this.ui.toast('Укрытие или расстояние мешает удару.');return;}
    if(ranged&&!target&&!manual){this.ui.toast('В пределах досягаемости нет противника.');return;}
    const point=manual?this.aimPoint:target,facing=point?Math.atan2(point.x-s.x,point.z-s.z):(this.world.facing||0);
    if(ranged){const result=fireCharge(s,w.id);if(!result.ok){this.ui.toast(result.reason);return;}}
    else {const cost=swingProfile(w.id).stamina;if(s.stamina<cost){this.ui.toast('Не хватает выносливости для удара.');return;}s.stamina-=cost;}
    this.attackCooldown=w.cooldown;this.world.facing=facing;this.world.playerVisual.rotation.y=facing;
    if(ranged){
      const shot=traceShot(s,facing,w.range,this.world.enemies,(x,z)=>this.world.canSee(s.x,s.z,x,z),shotSpread(w.id,this.world.moveSpeed>1,this.aiming),Math.random());
      this.world.shot(s.x,s.z,shot.x,shot.z,w.id==='stunner'?'#a5e5df':'#ffe0a1');this.world.weaponEffect(w.id,shot.angle);this.audio.shoot(w.id);
      if(shot.target){this.damageEnemy(shot.target,w);this.audio.weaponHit(w.id,shot.target.x,shot.target.z);}else this.world.weaponMiss();this.changed();
    }else{this.swing={elapsed:0,resolved:false,weapon:{...w},profile:swingProfile(w.id),facing};this.world.weaponEffect(w.id,facing);this.audio.swing(w.id);}
    this.world.playCharacterAction(ranged?'1h_ranged_shoot':['spear','knife'].includes(w.id)?'1h_melee_attack_stab':'1h_melee_attack_chop',ranged?null:swingProfile(w.id).duration);
    if(!ranged)this.changed();
  }
  updateSwing(dt) {
    const swing=this.swing;if(!swing)return;
    if(advanceSwing(swing,dt)){
      const e=selectMeleeTarget(swing,this.state,this.world.enemies,e=>this.world.canSee(this.state.x,this.state.z,e.x,e.z));
      if(e){this.damageEnemy(e,swing.weapon);this.audio.weaponHit(swing.weapon.id,e.x,e.z);}
      else this.world.weaponMiss();
    }
    if(swing.elapsed>=swing.profile.duration)this.swing=null;
  }
  damageEnemy(target,w) {
    const s=this.state;reactToHit(target,s,{power:GUNS[w.id]?(GUNS[w.id].power||1):swingProfile(w.id).power});target.health=Math.max(0,target.health-w.damage);this.world.floatingText(`−${w.damage}`,target.x,target.z,'#edbf87');this.world.enemyImpact(target,w.id);
    if(!GUNS[w.id]){
      const d=Math.hypot(target.x-s.x,target.z-s.z)||1,push=swingProfile(w.id).push,x=target.x+(target.x-s.x)/d*push,z=target.z+(target.z-s.z)/d*push;
      if(!this.world.blocked(x,z,.4)) {target.x=x;target.z=z;}
    }
    if(!target.health){target.deadAt=s.elapsed;s.droneDeaths[target.id]=s.elapsed;s.kills++;const result=collect(s,DRONE_TYPES[target.kind].loot||{metal:2,parts:1});this.showLoot(result.received,target.x,target.z);
      if(result.full){const drop={id:`drop-${Date.now()}-${s.kills}`,x:target.x,z:target.z,loot:result.remaining};s.drops.push(drop);this.world.addDrop(drop);this.ui.toast('Рюкзак полон. Обломки остались на месте — вернись за ними.');}this.audio.playSample('enemy_destroy',.45,1,{x:target.x,z:target.z});this.audio.collect();this.target=null;
    }
    this.ui.update();this.save(false);
  }
  enemyDamage(amount){this.ui.damage();this.audio.hit();if(takeDamage(this.state,amount)){this.die();return true;}return false;}
  updateEnemyBolts(dt){
    if(!this.enemyBolts?.length)return false;
    for(const bolt of this.enemyBolts||[]){
      const ox=bolt.x,oz=bolt.z,step=Math.min(bolt.remaining,12*dt),x=ox+bolt.dx*step,z=oz+bolt.dz*step;bolt.remaining-=step;
      if(!this.world.canSee(ox,oz,x,z)||this.world.blocked(x,z,.08))bolt.remaining=0;
      else if(segmentDistance(this.state.x,this.state.z,ox,oz,x,z)<.45){bolt.remaining=0;if(this.enemyDamage(bolt.damage))return true;}
      bolt.x=x;bolt.z=z;bolt.mesh.position.set(x,1.1,z);
    }
    this.enemyBolts=(this.enemyBolts||[]).filter(b=>{if(b.remaining>0)return true;this.world.scene.remove(b.mesh);return false;});return false;
  }
  updateEnemies(dt) {
    if(this.updateEnemyBolts(dt))return;
    const visibility=gearProfile(this.state,RECIPES).visibility;
    for(const e of this.world.enemies){
      const type=DRONE_TYPES[e.kind]||DRONE_TYPES.guardian;
      if(e.health<=0){e.windup=0;e.attack=null;if(this.state.elapsed-e.deadAt>180){e.health=e.maxHealth;e.x=e.originX;e.z=e.originZ;e.alert=0;e.suspicion=0;e.route=null;e.routeAt=-Infinity;e.courseAt=-Infinity;e.patrolIndex=0;e.stagger=0;e.cooldown=0;delete this.state.droneDeaths[e.id];}continue;}
      e.cooldown=Math.max(0,e.cooldown-dt);const distance=Math.hypot(e.x-this.state.x,e.z-this.state.z),leash=Math.hypot(e.x-e.originX,e.z-e.originZ);
      if(distance>30&&e.alert<=0&&!e.attack){e.suspicion=0;e.windup=0;continue;}
      const sight=distance<type.vision*visibility&&this.world.canSee(e.x,e.z,this.state.x,this.state.z),seen=leash<10&&droneSees(e,this.state,sight,visibility);
      updateAwareness(e,dt,seen,this.state,distance);
      if(e.stagger>0){e.stagger=Math.max(0,e.stagger-dt);e.windup=0;continue;}
      if(type.attack){
        if(beginEnemyAttack(e,this.state,sight&&leash<10))this.audio.playSample('enemy_attack',.35,e.kind==='warden'?.7:1,{x:e.x,z:e.z});
        const event=advanceEnemyAttack(e,dt,(x,z,r)=>this.world.blocked(x,z,r));
        if(event?.kind==='slam'){
          this.world.impact(event.x,.25,event.z,'#e8af7b',1.7);this.audio.resourceHit('quarry',event.x,event.z,true);
          if(Math.hypot(this.state.x-event.x,this.state.z-event.z)<=event.radius&&Math.hypot(e.x-this.state.x,e.z-this.state.z)<3.5&&this.world.canSee(e.x,e.z,this.state.x,this.state.z)&&this.enemyDamage(event.damage))return;
        }
        if(event?.kind==='dash'&&event.damage&&segmentDistance(this.state.x,this.state.z,event.ax,event.az,event.bx,event.bz)<.8&&this.world.canSee(e.x,e.z,this.state.x,this.state.z)){event.attack.hit=true;if(this.enemyDamage(event.damage))return;}
        if(event?.kind==='shot'){
          const dx=event.x-e.x,dz=event.z-e.z,d=Math.hypot(dx,dz)||1;
          const bolt={x:e.x,z:e.z,dx:dx/d,dz:dz/d,remaining:9,damage:event.damage};
          if((this.enemyBolts||[]).length<12){bolt.mesh=this.world.enemyBolt(bolt);(this.enemyBolts??=[]).push(bolt);this.audio.playSample('blaster',.3,1,{x:e.x,z:e.z});}
        }
        if(e.attack||event)continue;
      }else if(attackCharge(e,dt,distance<1.7,sight&&leash<10&&e.alert>0)&&this.enemyDamage(type.damage))return;
      let target;
      if(e.alert>0&&leash<10){
        if(e.kind==='gunner'&&sight&&distance>=3&&distance<6.5)continue;
        target=e.kind==='gunner'&&sight&&distance<3?{x:e.x+(e.x-this.state.x)/(distance||1)*2,z:e.z+(e.z-this.state.z)/(distance||1)*2}:e.lastSeen;
        if(Math.hypot(target.x-e.originX,target.z-e.originZ)>9.5)target={x:e.originX,z:e.originZ};
      }
      else target=idlePatrolTarget(e,(x,z,r)=>this.world.blocked(x,z,r));
      if(!target||e.windup>0)continue;
      const destination=this.world.enemyWaypoint(e,target,this.state.elapsed);if(!destination)continue;
      const dx=destination.x-e.x,dz=destination.z-e.z,length=Math.hypot(dx,dz);if(length<(e.alert>0&&destination===target?1.3:.12))continue;
      const speed=e.alert>0?type.speed:type.patrolSpeed,nx=e.x+dx/length*speed*dt,nz=e.z+dz/length*speed*dt,oldX=e.x,oldZ=e.z;
      if(!this.world.blocked(nx,e.z,.35))e.x=nx;if(!this.world.blocked(e.x,nz,.35))e.z=nz;
      e.facing=Math.atan2(dx,dz);e.group.rotation.y=e.facing;
      if(Math.hypot(e.x-oldX,e.z-oldZ)<.001){e.stuck=(e.stuck||0)+dt;if(e.stuck>.7){e.route=null;e.routeAt=-Infinity;if(e.alert<=0)e.patrolIndex=(e.patrolIndex+1)%e.patrolRoute.length;e.stuck=0;}}else e.stuck=0;
    }
  }
  die() {
    for(const b of this.enemyBolts||[])this.world.scene.remove(b.mesh);this.enemyBolts=[];
    for(const e of this.world.enemies){e.attack=null;e.windup=0;e.alert=0;e.suspicion=0;}
    this.aiming=false;this.aimPoint=null;this.dodging=null;this.swing=null;this.world.clearWeaponEffect();
    this.motion.reset(); this.keys.clear(); this.touchMovement = { x: 0, z: 0 };
    const wasAboard=this.state.boat.aboard;respawn(this.state); this.path = []; this.target = null; this.job = null; this.cancelFishing(); this.cancelBuild();
    this.world.move(this.state.x, this.state.z); this.ui.progress(null); this.world.destination.visible = false;
    for (const enemy of this.world.enemies) { enemy.x = enemy.originX; enemy.z = enemy.originZ;enemy.patrolIndex=0;enemy.route=null;enemy.routeAt=-Infinity;enemy.courseAt=-Infinity; }
    this.updateGrave(); this.ui.toast(wasAboard?'Ты очнулся дома. Лодка у берегового причала, рюкзак — у последнего места высадки.':'Ты очнулся дома. Рюкзак остался на месте — его можно вернуть.'); this.changed();
  }
  updateGrave() {
    if (this.graveGroup) { this.world.scene.remove(this.graveGroup); this.graveGroup = null; }
    if (this.state.grave) { this.graveGroup = this.world.crate(this.state.grave.x, this.state.grave.z, 0.75); }
  }
  startFishing() {
    if (!this.state.owned.includes('rod')) { this.ui.toast('Изготовь удочку на станции: дерево, ткань и провод.'); return; }
    if (bagWeight(this.state) > capacity(this.state) - 3) { this.ui.toast('Освободи хотя бы 3 места в рюкзаке для улова.'); return; }
    const spot=FISHING_SPOTS.find(p=>Math.hypot(this.state.x-p.x,this.state.z-p.z)<3);if(!spot)return;
    const bait=this.state.fishingBait;if(!consumeBait(this.state,bait)){this.ui.toast('Наживки нет в рюкзаке. Выбери другую.');this.ui.open('fishing');return;}this.save(false);
    this.path = []; this.target = null; this.keys.clear();
    this.fish = {spot:spot.id,bait,hour:gameHour(this.state.elapsed),phase: 'wait', timer: 0, biteAt: (2 + Math.random() * 3.5)*(bait==='none'?1:.7), upgraded: this.state.owned.includes('rod2'), hits: 0, misses: 0, needle: 0, target: 50, totalTime: 0 };
    this.audio.water(); this.ui.fishing(this.fish);
  }
  fishAction() {
    const f = this.fish; if (!f) return;
    if (f.phase === 'wait') return;
    if (f.phase === 'caught') { this.startFishing(); return; }
    if (f.phase === 'bite') { f.phase = 'reel'; f.timer = 0; f.totalTime = 0;f.tension=.25;f.mood='calm'; f.target = 35 + Math.random() * 30; this.ui.fishing(f); return; }
    if (f.phase === 'reel') {
      const result=reelInput(f,'pull');if(result==='hold')return;if(result==='escape'){this.ui.toast('Леска не выдержала рывок.');this.cancelFishing();return;}if(result==='hit')this.audio.water();else this.audio.hit();
      if (f.misses >= 2) { this.ui.toast('Леска ослабла — рыба ушла. Попробуй ещё раз.'); this.cancelFishing(); return; }
      if (f.hits >= 3) {
        f.result = catchFish(Math.random, f.upgraded,f); f.phase = 'caught';
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
      f.totalTime += delta;const mood=f.mood,lost=advanceReel(f,delta);if(mood!==f.mood)this.ui.fishing(f);this.ui.updateFishNeedle(f.needle,f.tension);
      if (lost) { this.ui.toast('Рыба сорвалась. В следующий раз получится.'); this.cancelFishing(); }
    }
  }
  cancelFishing() { this.fish = null; this.ui.fishing(null); }
  movement(dt) {
    if(this.dodging){const oldX=this.state.x,oldZ=this.state.z,alive=advanceDodge(this.dodging,dt,(dx,dz)=>this.world.move(this.state.x+dx,this.state.z+dz));if(!alive){this.dodging=null;this.motion.reset();}this.world.moveSpeed=Math.hypot(this.state.x-oldX,this.state.z-oldZ)/dt;this.world.running=false;return this.world.moveSpeed>.01;}
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
      while (this.path.length && Math.hypot(this.path[0].x - this.state.x, this.path[0].z - this.state.z) < 0.025) this.path.shift();
      if (this.path.length) { dx = this.path[0].x - this.state.x; dz = this.path[0].z - this.state.z; }
      else this.world.destination.visible = false;
    }
    if(this.state.boat.aboard){
      if(!manual&&this.path.length){const len=Math.hypot(dx,dz);if(len){dx/=len;dz/=len;}}
      const b=this.state.boat,oldX=b.x,oldZ=b.z,moved=rowBoat(b,dt,dx,dz,()=>false,this.state.restoredRoutes);this.state.x=b.x;this.state.z=b.z;this.state.stamina=Math.min(100,this.state.stamina+dt*8);this.world.running=false;this.world.moveSpeed=0;
      if(!manual&&this.path.length&&Math.hypot(this.path[0].x-b.x,this.path[0].z-b.z)<.25)this.path.shift();
      if(!moved&&this.path.length){this.path=[];this.world.destination.visible=false;}
      this.world.player.position.set(b.x,.33,b.z);return Math.hypot(b.x-oldX,b.z-oldZ)>.0001;
    }
    const distance = Math.hypot(dx, dz);
    if (!manual && distance > 0) { dx /= distance; dz /= distance; }
    if (distance > 0.08 && this.job) { this.job = null; this.ui.progress(null); }
    const result = this.motion.update(dt, dx, dz, this.state.stamina,
      this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'), this.state.equipment.boots === 'boots',activeFood(this.state));
    const profile=gearProfile(this.state,RECIPES);const mobility=(this.swing&&!this.swing.resolved?swingProfile(this.swing.weapon.id).mobility:1)*(this.aiming&&GUNS[weapon(this.state).id]?.65:1);result.x*=profile.speed*mobility;result.z*=profile.speed*mobility;
    this.state.stamina = result.stamina; this.world.running = result.running;
    // Follow the checked segment precisely; velocity easing must not cut a corner into a wall.
    if (!manual && this.path.length) {
      const travel=Math.min(distance,Math.hypot(result.x,result.z));
      result.x=dx*travel;result.z=dz*travel;
    }
    const oldX = this.state.x, oldZ = this.state.z;
    this.world.move(oldX + result.x, oldZ + result.z);
    const moved = Math.hypot(this.state.x - oldX, this.state.z - oldZ) > 0.0001;
    this.world.moveSpeed = Math.hypot(this.state.x - oldX, this.state.z - oldZ) / dt;
    if (moved) {
      this.world.facing = Math.atan2(this.state.x - oldX, this.state.z - oldZ); this.stepTimer += dt;
      if (this.stepTimer > (result.running ? 0.22 : 0.34)) { this.audio.step(this.world.surfaceAt(this.state.x,this.state.z)); this.stepTimer = 0; }
      this.blockedTime = 0;
    } else if (this.path.length) {
      this.blockedTime = (this.blockedTime || 0) + dt;
      if (this.blockedTime > 0.4) { this.path = []; this.motion.reset(); this.world.destination.visible = false; }
    }
    return moved;
  }
  landBoat(){
    if(!this.state.boat.aboard)return;const d=dockNearBoat(this.state.boat);if(!d||this.world.blocked(d.foot.x,d.foot.z)){this.ui.toast('Подойди ближе к свободному причалу.');return;}
    const b=this.state.boat;Object.assign(b,{...d.boat,heading:d.heading,aboard:false,lastDock:d.id,vx:0,vz:0});this.state.x=d.foot.x;this.state.z=d.foot.z;this.world.player.position.set(this.state.x,.18,this.state.z);this.motion.reset();this.keys.clear();this.touchMovement={x:0,z:0};this.path=[];this.target=null;this.world.destination.visible=false;this.world.flood.update(true);this.world.renderDirty=true;this.audio.water();this.changed();
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
      this.state.elapsed += dt;coolWeapons(this.state,dt);if(this.state.boat.aboard||!GUNS[weapon(this.state).id]){this.aiming=false;this.aimPoint=null;}this.updateAim();this.ui.aiming=this.aiming;updateRainCrops(this.state,dt,(x,z)=>this.world.sheltered(x,z));
      this.audio.rain(weatherAt(this.state.elapsed).rain,this.world.sheltered(this.state.x,this.state.z));this.audio.environment(this.world.ambience(),this.world.sheltered(this.state.x,this.state.z),this.state.elapsed);
      if (updateHelper(this.state)) this.ui.update(); this.attackCooldown = Math.max(0, this.attackCooldown - dt);
      this.audio.setListener(this.state.x,this.state.z);moving = this.movement(dt);this.updateSwing(dt); this.updateEnemies(dt); this.audio.tick(this.state.elapsed);const music=this.state.placed.filter(p=>p.id==='recordplayer'&&p.enabled).map(p=>Math.hypot(p.x-this.state.x,p.z-this.state.z));this.audio.record(this.state.elapsed,music.length?Math.min(...music):Infinity);const radios=this.state.placed.filter(p=>p.id==='homeradio'&&p.enabled).map(p=>Math.hypot(p.x-this.state.x,p.z-this.state.z));this.audio.radio(this.state.elapsed,radios.length?Math.min(...radios):Infinity);
      if (this.target) {
        const target = this.target, range = target.type === 'enemy' ? weapon(this.state).range : 2;
        if (Math.hypot(target.entity.x - this.state.x, target.entity.z - this.state.z) <= range&&(target.type!=='node'||this.world.canSee(this.state.x,this.state.z,target.entity.x,target.entity.z,target.entity.collider,true))) {
          this.path = []; this.world.destination.visible = false;
          if (target.type === 'node') { this.beginNode(target.entity); this.target = null; }
          else if (target.type === 'station') { this.target = null; this.ui.open('craft'); }
          else this.attack(target.entity);
        }
      }
      if (this.job) {
        this.job.elapsed += dt;if(this.job.resourceWork){this.harvestBeat(this.job);
        }else if(this.job.type==='process-salvage'){const j=this.job;j.nextTap??=.2;if(j.elapsed>=j.nextTap){this.audio.variant('impact_metal_medium',2,.18,{x:-21,z:13});j.nextTap+=.6;}
        }else if(this.job.type==='harvest'&&['appliance','motor'].includes(this.job.node.machine)){const j=this.job;j.nextTap??=.4;if(j.elapsed>=j.nextTap){this.audio.variant('impact_metal_medium',2,.24,{x:j.node.x,z:j.node.z});this.world.resourceStrike(j.node);j.nextTap+=.8;}} this.ui.progress(this.job.label, this.job.elapsed / this.job.duration);
        if (this.job.elapsed+1e-9 >= this.job.duration) this.finishJob();
      }
      this.uiTimer += dt; this.saveTimer += dt;
      if (this.uiTimer > 0.2) {
        this.uiTimer = 0;if(discover(this.state,this.world.nodes))this.save(false);this.ui.update(); this.world.syncNodes();
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
      this.world.freezeBuildCamera=!!this.build;
      this.world.setHarvestTool(this.job?.resourceWork?this.job.node.requires:null);
      // A paused scene needs one frame, then only redraws for equipment, lighting or resize changes.
      if (!this.ui.panel || !this.panelRendered || this.world.renderDirty) this.world.update(this.ui.panel ? 0 : elapsed, moving, this.started);
      this.panelRendered = !!this.ui.panel;
      this.ui.floating(this.world.floating, this.world);
    }
    const reticle=document.getElementById('combat-reticle');reticle.hidden=!this.aiming||!this.aimPoint||!!this.ui.panel||!GUNS[weapon(this.state).id];if(!reticle.hidden){reticle.style.left=this.pointerPosition.x+'px';reticle.style.top=this.pointerPosition.y+'px';reticle.classList.toggle('moving',this.world.moveSpeed>1);}
    requestAnimationFrame(this.frame);
  }
}

const game = new QuietDistrict();
// Expose only in the development server for integration tests and inspection.
if (import.meta.env.DEV) window.__quietDistrict = game;
