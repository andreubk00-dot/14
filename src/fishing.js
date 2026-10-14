// Keep reel movement inside the visible input window on slow devices.
// Waiting and the bite use real time; only reeling slows when frames are rare.
export function fishingFrameDelta(dt, phase) {
  const elapsed = Number.isFinite(dt) ? Math.max(0, dt) : 0;
  return phase === 'reel' ? Math.min(elapsed, 0.05) : elapsed;
}

export function reelMood(timer){const t=((timer%6)+6)%6;return t<3.2?'calm':t<4.5?'surge':t<5.5?'slack':'calm';}
export function advanceReel(f,dt){
 const mood=reelMood(f.timer);f.mood=mood;f.tension=Math.max(0,Math.min(1,(f.tension??.25)+dt*(mood==='surge'?.12:mood==='slack'?-.1:-.045)));
 f.needlePhase=(f.needlePhase||0)+dt*(mood==='surge'?3.6:2.6);f.needle=50+Math.sin(f.needlePhase)*46;
 return f.tension>=1||f.totalTime>22;
}
export function reelInput(f,action){
 if(f.phase!=='reel')return 'ignore';
 if(action==='relax'){f.tension=Math.max(.08,(f.tension??.25)-.4);f.relaxedUntil=f.timer+.75;return 'relax';}
 if(f.timer<(f.relaxedUntil||0)||f.timer-(f.lastPull??-1)<.22)return 'hold';
 f.lastPull=f.timer;const hit=Math.abs(f.needle-f.target)<=(f.upgraded?13:10);
 f.tension=Math.min(1,(f.tension??.25)+(reelMood(f.timer)==='surge'?.42:hit?.18:.22));
 if(f.tension>=1)return 'escape';
 if(hit)f.hits++;else f.misses++;
 return hit?'hit':'miss';
}
