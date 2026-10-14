import {AUDIO_FILES} from './audio-assets.js';
export class DistrictAudio {
  constructor() { this.enabled = true; this.context = null; this.nextBird = 0;this.nextRecord=0;this.recordStep=0;this.buffers=new Map();this.voices=new Set();this.musicEnabled=true;this.musicVolume=.5; }
  start(enabled = true) {
    this.enabled = enabled;
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext(); this.master = this.context.createGain(); this.master.gain.value = enabled ? 0.22 : 0; this.master.connect(this.context.destination);
      this.musicGain=this.context.createGain();this.musicGain.gain.value=0;this.musicGain.connect(this.master);
      const buffer = this.context.createBuffer(1, this.context.sampleRate * 3, this.context.sampleRate), data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < data.length; i++) { last = (last + (Math.random() * 2 - 1) * 0.025) / 1.025; data[i] = last * 2.8; }
      const rainBuffer=this.context.createBuffer(1,this.context.sampleRate*2,this.context.sampleRate),rainData=rainBuffer.getChannelData(0);for(let i=0;i<rainData.length;i++)rainData[i]=Math.random()*2-1;
      const rainSource=this.context.createBufferSource();rainSource.buffer=rainBuffer;rainSource.loop=true;const rainFilter=this.context.createBiquadFilter();rainFilter.type='lowpass';rainFilter.frequency.value=1800;this.rainGain=this.context.createGain();this.rainGain.gain.value=0;rainSource.connect(rainFilter).connect(this.rainGain).connect(this.master);rainSource.start();
      const noise = this.context.createBufferSource(); noise.buffer = buffer; noise.loop = true;
      const filter = this.context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 360;
      const gain = this.context.createGain(); gain.gain.value = 0.33;this.windGain=gain; noise.connect(filter).connect(gain).connect(this.master); noise.start();
    }
    this.context.resume().catch(() => {});
    if(enabled)this.loadSamples();
  }
  loadSamples(){
    if(this.loading)return this.loading;
    this.loading=Promise.all(AUDIO_FILES.map(async id=>{try{const response=await fetch(globalThis.__quietAudio?.[id]||`/assets/audio/${id}.ogg`);if(!response.ok)throw Error(id);const buffer=await this.context.decodeAudioData(await response.arrayBuffer());this.buffers.set(id,buffer);}catch{(this.failed??=[]).push(id);}})).then(()=>{if(this.buffers.has('house-forest')&&!this.musicSource){this.musicSource=this.context.createBufferSource();this.musicSource.buffer=this.buffers.get('house-forest');this.musicSource.loop=true;this.musicSource.connect(this.musicGain);this.musicSource.start();this.updateMusic();}});
    return this.loading;
  }
  playSample(id,volume=.35,rate=1){
    if(!this.context||!this.enabled||this.context.state!=='running'||!this.buffers.has(id)||this.voices.size>=16)return false;
    const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=this.buffers.get(id);source.playbackRate.value=rate;gain.gain.value=volume;source.connect(gain).connect(this.master);this.voices.add(source);source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect();};source.start();return true;
  }
  variant(prefix,count=2,volume=.35){return this.playSample(`${prefix}_${String(Math.floor(Math.random()*count)).padStart(3,'0')}`,volume,.96+Math.random()*.08);}
  updateMusic(){this.musicTarget=this.musicEnabled?this.musicVolume*(this.recordDistance<9?.22:.09):0;if(this.musicGain)this.musicGain.gain.setTargetAtTime(this.musicTarget,this.context.currentTime,.8);}
  setMusic(enabled,volume=this.musicVolume){this.musicEnabled=enabled;this.musicVolume=Math.max(0,Math.min(1,volume));this.updateMusic();}
  toggle(enabled) { this.enabled = enabled;if(enabled)this.start(true);if (this.context) this.master.gain.setTargetAtTime(enabled ? 0.22 : 0, this.context.currentTime, 0.15); }
  tone(freq = 440, duration = 0.15, volume = 0.15, type = 'sine', end = freq) {
    if (!this.context || !this.enabled || this.context.state !== 'running') return;
    const now = this.context.currentTime, oscillator = this.context.createOscillator(), gain = this.context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(freq, now); oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), now + duration);
    gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(this.master); oscillator.start(); oscillator.stop(now + duration);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  collect() { this.playSample('handle_small_leather',.32); }
  craft() { this.playSample('weapon_change',.4); }
  hit() { this.playSample('enemy_hurt',.5); }
  swing(id){this.playSample(id==='axe'?'chop':id==='spear'?'knife_slice_2':'knife_slice',.2);}
  weaponHit(id){this.variant(id==='unarmed'?'impact_wood_medium':'impact_metal_medium',2,.5);}
  resourceHit(kind){this.variant(kind==='quarry'?'impact_mining':'impact_wood_medium',2,.48);}
  shoot(id='pistol') { this.playSample(id==='carbine'?'blaster_repeater':'blaster',.45); }
  step(surface='grass') { this.variant(`footstep_${surface}`,3,.24); }
  bite() { this.playSample('metal_click',.42); }
  water() { this.playSample('handle_small_leather',.2); }
  tick(time) {
    if (time > this.nextBird) { this.nextBird = time + 15 + Math.random() * 25; this.tone(1500, 0.19, 0.018, 'sine', 2200); setTimeout(() => this.tone(1900, 0.16, 0.015, 'sine', 1250), 220); }
  }
  rain(strength,sheltered) {const value=strength*(sheltered?.035:.13);if(!this.rainGain||Math.abs((this.rainLevel||0)-value)<.005)return;this.rainLevel=value;this.rainGain.gain.setTargetAtTime(value,this.context.currentTime,.4);}
  environment(kind,sheltered,time){
    if(!this.context||!this.enabled||this.context.state!=='running')return;
    const roomKey=kind+':'+sheltered;if(roomKey!==this.roomKind){this.roomKind=roomKey;this.nextRoom=time+2;this.windGain?.gain.setTargetAtTime(sheltered?.13:.33,this.context.currentTime,.6);}
    if(time<(this.nextRoom||0))return;this.nextRoom=time+7+(kind==='room'?7:0);
    if(kind==='water')this.tone(510,.12,.035,'sine',170);
    if(kind==='metal')this.tone(115,.65,.018,'triangle',92);
    if(kind==='room')this.tone(190,.18,.009,'triangle',135);
  }
  record(time,distance) {
    const near=distance<9;if(near!==(this.recordDistance<9)){this.recordDistance=distance;this.updateMusic();}
  }
  radio(time,distance){if(distance>=7||time<(this.nextRadio||0)||!this.enabled)return;this.playSample('metal_click',.04*(1-distance/7));this.nextRadio=time+4;}
  pause() { this.context?.suspend().catch(() => {}); }
  resume() { this.context?.resume().catch(() => {}); }
}
