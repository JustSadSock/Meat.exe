let ctx, beatGain, glitchGain;

export function initAudio(){
  if(ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  // base sawtooth beat
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 170; // fast tempo
  beatGain = ctx.createGain();
  beatGain.gain.value = 0.2;
  osc.connect(beatGain).connect(ctx.destination);
  osc.start();

  // noise buffer for glitch bursts
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for(let i=0;i<data.length;i++) data[i] = Math.random()*2-1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  glitchGain = ctx.createGain();
  glitchGain.gain.value = 0;
  noise.connect(glitchGain).connect(ctx.destination);
  noise.start();
}

export function triggerGlitch(){
  if(!ctx) return;
  const now = ctx.currentTime;
  glitchGain.gain.cancelScheduledValues(now);
  glitchGain.gain.setValueAtTime(0.6, now);
  glitchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
}
