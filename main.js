import { initEngine, renderFrame, setGlitch, kickFov } from './engine.js';
import { generateOrgan } from './organGen.js';
import { guns, reloadShader } from './shaderGuns.js';
import { updateBlood, spawnBlood, getBlood } from './goreSim.js';
import { initMeta, mutateRules, getRules } from './metaMutate.js';
import { AABB, circleVsCircle, circleInsideAABB, clampCircleToAABB } from './geom.js';

const dev = new URLSearchParams(location.search).get('dev') === '1';
const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl2');

initEngine(gl, canvas, dev);
initMeta();

const cross=document.getElementById('crosshair');
const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints>0;
const joyL=document.getElementById('joyL');
const joyR=document.getElementById('joyR');
const joyLInner=joyL.querySelector('.inner');
const joyRInner=joyR.querySelector('.inner');
let moveJoy={x:0,y:0},aimJoy={x:0,y:0};
if(hasTouch){
  cross.style.display='none';
}else{
  joyL.style.display='none';
  joyR.style.display='none';
}
let locked=false,cx=window.innerWidth/2,cy=window.innerHeight/2;
if(!hasTouch){
  canvas.addEventListener('click',()=>{
    if(!locked) canvas.requestPointerLock();
    else fire();
  });
  document.addEventListener('pointerlockchange',()=>{
    locked=document.pointerLockElement===canvas;
  });
  document.addEventListener('mousemove',e=>{
    if(!locked)return;
    cx=Math.min(window.innerWidth,Math.max(0,cx+e.movementX));
    cy=Math.min(window.innerHeight,Math.max(0,cy+e.movementY));
    cross.style.left=cx+'px';
    cross.style.top=cy+'px';
  });
} 
else {
  const joyUpdate=(el,inner,vec)=>e=>{
    const r=el.clientWidth/2;
    const rect=el.getBoundingClientRect();
    const x=e.touches?e.touches[0].clientX:e.clientX;
    const y=e.touches?e.touches[0].clientY:e.clientY;
    const dx=x-(rect.left+r);
    const dy=y-(rect.top+r);
    const nx=Math.max(-r,Math.min(r,dx));
    const ny=Math.max(-r,Math.min(r,dy));
    inner.style.left=r+nx+'px';
    inner.style.top=r+ny+'px';
    vec.x=nx/r;vec.y=ny/r;
  };
  let lActive=false,rActive=false;
  joyL.addEventListener('pointerdown',e=>{lActive=true;joyUpdate(joyL,joyLInner,moveJoy)(e);});
  joyL.addEventListener('pointermove',e=>{if(lActive)joyUpdate(joyL,joyLInner,moveJoy)(e);});
  joyL.addEventListener('pointerup',()=>{lActive=false;moveJoy.x=moveJoy.y=0;joyLInner.style.left='50%';joyLInner.style.top='50%';});
  joyL.addEventListener('pointercancel',()=>{lActive=false;moveJoy.x=moveJoy.y=0;joyLInner.style.left='50%';joyLInner.style.top='50%';});
  joyR.addEventListener('pointerdown',e=>{rActive=true;joyUpdate(joyR,joyRInner,aimJoy)(e);});
  joyR.addEventListener('pointermove',e=>{if(rActive)joyUpdate(joyR,joyRInner,aimJoy)(e);});
  joyR.addEventListener('pointerup',()=>{rActive=false;aimJoy.x=aimJoy.y=0;joyRInner.style.left='50%';joyRInner.style.top='50%';fire();});
  joyR.addEventListener('pointercancel',()=>{rActive=false;aimJoy.x=aimJoy.y=0;joyRInner.style.left='50%';joyRInner.style.top='50%';});
}

const CHUNK_SIZE=0.25;
const PLAYER_R=0.03;
const ENEMY_R=0.03;
const BULLET_R=0.015;
let chunkX=0,chunkY=0;
const loadedChunks={};
loadedChunks['0,0']=generateOrgan(0,0).map(t=>AABB(t.x*CHUNK_SIZE,t.y*CHUNK_SIZE,CHUNK_SIZE,CHUNK_SIZE));

const player={x:0.5,y:0.5,vx:0,vy:0,hp:100};
let bullets=[],enemies=[],wave=7,difficulty=1,kills=0;
let elapsed=0;
const keys={};
const hpVal=document.getElementById('hpVal');
const fpsEl=document.getElementById('fps');

function fire(){
  let dx,dy;
  if(hasTouch){
    dx=aimJoy.x;dy=aimJoy.y;
  }else{
    dx=cx/window.innerWidth-0.5;
    dy=cy/window.innerHeight-0.5;
  }
  const l=Math.hypot(dx,dy)||1;
  bullets.push({x:player.x,y:player.y,dx:dx/l*0.6,dy:dy/l*0.6,life:2});
  setGlitch(true);
  kickFov(0.2);
}

function spawnWave(d,immortal=false){
  for(let i=0;i<3*d;i++){
    const s=Math.floor(Math.random()*4);
    let x,y;
    if(s===0){x=Math.random();y=-0.05;}else if(s===1){x=Math.random();y=1.05;}
    else if(s===2){x=-0.05;y=Math.random();}else{x=1.05;y=Math.random();}
    enemies.push({x,y,immortal});
  }
}

spawnWave(difficulty);

document.getElementById('glitchBtn').onclick = () => setGlitch(true);

if(dev){
  document.getElementById('glitchBtn').style.display='block';
  const edit = document.getElementById('shaderEdit');
  edit.style.display='block';
  edit.addEventListener('input', () => reloadShader(edit.value));
  edit.value = guns[0].fragSrc;
  fpsEl.style.display='block';
}

let last = 0;
function loop(ts){
  const dt = (ts - last)/1000;
  last = ts;
  elapsed += dt;
  if(dev) fpsEl.textContent = Math.round(1/dt)+" FPS";
  // movement with friction + gravity
  const rules=getRules();
  let ax=(keys['d']?1:0)-(keys['a']?1:0)+moveJoy.x;
  let ay=(keys['s']?1:0)-(keys['w']?1:0)+moveJoy.y;
  if(ax||ay){
    const l=Math.hypot(ax,ay);ax/=l;ay/=l;
    const accel=0.6;
    player.vx+=ax*accel*dt;
    player.vy+=ay*accel*dt;
  }
  player.vy+=0.4*rules.gravity*dt;
  player.vx*=rules.friction;
  player.vy*=rules.friction;
  player.x+=player.vx*dt;
  player.y+=player.vy*dt;
  const cxx=Math.floor(player.x/CHUNK_SIZE);
  const cyy=Math.floor(player.y/CHUNK_SIZE);
  if(cxx!==chunkX||cyy!==chunkY){
    chunkX=cxx;chunkY=cyy;
    const key=cxx+','+cyy;
    if(!loadedChunks[key]){
      const cells=generateOrgan(cxx,cyy).map(t=>AABB(t.x*CHUNK_SIZE,t.y*CHUNK_SIZE,CHUNK_SIZE,CHUNK_SIZE));
      loadedChunks[key]=cells;
      console.log('generate',key,cells);
    }
  }
  bullets.forEach(b=>{b.x+=b.dx*dt;b.y+=b.dy*dt;b.life-=dt;});
  bullets=bullets.filter(b=>b.life>0&&Math.abs(b.x-player.x)<1&&Math.abs(b.y-player.y)<1);
  const allBoxes=[];
  for(const k in loadedChunks) allBoxes.push(...loadedChunks[k]);
  enemies.forEach(e=>{const dx=player.x-e.x,dy=player.y-e.y,l=Math.hypot(dx,dy)||1;e.x+=dx/l*0.1*dt;e.y+=dy/l*0.1*dt;
    const circ={x:e.x,y:e.y,r:ENEMY_R};
    let inside=false;
    for(const box of allBoxes){if(circleInsideAABB(circ,box)){inside=true;break;}}
    if(!inside){
      let near=null,best=1e9;
      for(const box of allBoxes){
        const cx=Math.max(box.x,Math.min(e.x,box.x+box.w));
        const cy=Math.max(box.y,Math.min(e.y,box.y+box.h));
        const d=(e.x-cx)*(e.x-cx)+(e.y-cy)*(e.y-cy);
        if(d<best){best=d;near=box;}
      }
      if(near){
        clampCircleToAABB(circ,near);
        e.x=circ.x;e.y=circ.y;
      }
    }
  });
  for(let i=bullets.length-1;i>=0;i--)for(let j=enemies.length-1;j>=0;j--){
    if(circleVsCircle({x:bullets[i].x,y:bullets[i].y,r:BULLET_R},{x:enemies[j].x,y:enemies[j].y,r:ENEMY_R})){
      spawnBlood(enemies[j].x,enemies[j].y);
      if(!enemies[j].immortal){enemies.splice(j,1);kills++;}
      bullets.splice(i,1);
      break;
    }
  }
  for(let i=enemies.length-1;i>=0;i--){
    if(circleVsCircle({x:player.x,y:player.y,r:PLAYER_R},{x:enemies[i].x,y:enemies[i].y,r:ENEMY_R})){
      player.hp-=10;spawnBlood(player.x,player.y);enemies.splice(i,1);
    }
  }
  hpVal.textContent=Math.max(0,player.hp);
  if(player.hp<=0){
    mutateRules();
    player.hp=100;difficulty=1;kills=0;
  }
  if(elapsed>=60){
    const dps=kills/elapsed;
    const expected=difficulty;
    difficulty=Math.min(3.5,Math.max(0.7,0.8+(dps/expected-1)*0.6-(player.hp<50?0.1:0)+(elapsed/60)*0.05));
    if(dps/expected>1.4){
      setGlitch(true);
      spawnWave(Math.ceil(difficulty),true); // anti-cheat mobs
    }
    kills=0;elapsed=0;
  }
  wave-=dt; if(wave<=0){spawnWave(difficulty);wave=7;}
  updateBlood(dt);
  const offX=player.x-0.5,offY=player.y-0.5;
  const rb=bullets.map(b=>({x:b.x-offX,y:b.y-offY}));
  const re=enemies.map(e=>({x:e.x-offX,y:e.y-offY}));
  const bl=getBlood().map(b=>({x:b.x-offX,y:b.y-offY}));
  renderFrame(dt,rb,re,bl);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.addEventListener('resize', ()=>initEngine(gl, canvas, dev));
window.addEventListener('keydown', e=>{
  const k=e.key;
  if(k==='ArrowUp') keys['w']=true;
  else if(k==='ArrowDown') keys['s']=true;
  else if(k==='ArrowLeft') keys['a']=true;
  else if(k==='ArrowRight') keys['d']=true;
  keys[k]=true;
  if(k==='m') mutateRules();
});
window.addEventListener('keyup', e=>{
  const k=e.key;
  if(k==='ArrowUp') keys['w']=false;
  else if(k==='ArrowDown') keys['s']=false;
  else if(k==='ArrowLeft') keys['a']=false;
  else if(k==='ArrowRight') keys['d']=false;
  keys[k]=false;
});
