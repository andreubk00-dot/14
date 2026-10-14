export class DistrictAudio {
  constructor() { this.enabled = true; this.context = null; this.nextBird = 0;this.nextRecord=0;this.recordStep=0; }
  start(enabled = true) {
    this.enabled = enabled;
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.context = new AudioContext(); this.master = this.context.createGain(); this.master.gain.value = enabled ? 0.22 : 0; this.master.connect(this.context.destination);
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
  }
  toggle(enabled) { this.enabled = enabled; if (this.context) this.master.gain.setTargetAtTime(enabled ? 0.22 : 0, this.context.currentTime, 0.15); }
  tone(freq = 440, duration = 0.15, volume = 0.15, type = 'sine', end = freq) {
    if (!this.context || !this.enabled || this.context.state !== 'running') return;
    const now = this.context.currentTime, oscillator = this.context.createOscillator(), gain = this.context.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(freq, now); oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, end), now + duration);
    gain.gain.setValueAtTime(volume, now); gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain).connect(this.master); oscillator.start(); oscillator.stop(now + duration);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  collect() { this.tone(620, 0.16, 0.15, 'sine', 950); setTimeout(() => this.tone(980, 0.24, 0.1), 100); }
  craft() { [390, 490, 590].forEach((freq, i) => setTimeout(() => this.tone(freq, 0.4, 0.15), i * 90)); }
  hit() { this.tone(100, 0.12, 0.35, 'triangle', 40); }
  shoot() { this.tone(480, 0.13, 0.2, 'sawtooth', 90); }
  step() { this.tone(80 + Math.random() * 30, 0.055, 0.06, 'triangle', 35); }
  bite() { this.tone(720, 0.17, 0.25); setTimeout(() => this.tone(960, 0.23, 0.2), 160); }
  water() { this.tone(230, 0.4, 0.1, 'sine', 60); }
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
    if(distance>=9||time<this.nextRecord||!this.enabled||this.context?.state!=='running') return;
    const melody=[261.63,329.63,392,329.63,293.66,349.23,440,349.23,261.63,392,523.25,392,246.94,293.66,392,293.66];
    this.tone(melody[this.recordStep++%melody.length],.8,.07*(1-distance/9),'triangle');this.nextRecord=time+.65;
  }
  pause() { this.context?.suspend().catch(() => {}); }
  resume() { this.context?.resume().catch(() => {}); }
}
