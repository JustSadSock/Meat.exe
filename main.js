import { initEngine, renderFrame, setGlitch, kickFov } from './engine.js';
import { generateOrgan } from './organGen.js';
import { guns, reloadShader } from './shaderGuns.js';
import { updateBlood, spawnBlood, getBlood } from './goreSim.js';
import { initMeta, mutateRules } from './metaMutate.js';

const dev = new URLSearchParams(location.search).get('dev') === '1';
const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl2');

initEngine(gl, canvas, dev);
initMeta();

const cross=document.getElementById('crosshair');
let locked=false,cx=window.innerWidth/2,cy=window.innerHeight/2;
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

const CHUNK_SIZE=0.25;
let chunkX=0,chunkY=0;
const loadedChunks={};
loadedChunks['0,0']=generateOrgan(0,0);

const player={x:0.5,y:0.5,hp:100};
let bullets=[],enemies=[],wave=7,difficulty=1,kills=0;
let elapsed=0;
const keys={};
const hpVal=document.getElementById('hpVal');
const fpsEl=document.getElementById('fps');

function fire(){
  const dx=cx/window.innerWidth-0.5;
  const dy=cy/window.innerHeight-0.5;
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
  // simple player movement
  const speed=0.3;
  if(keys['w']) player.y-=speed*dt;
  if(keys['s']) player.y+=speed*dt;
  if(keys['a']) player.x-=speed*dt;
  if(keys['d']) player.x+=speed*dt;
  player.x=Math.max(0,Math.min(1,player.x));
  player.y=Math.max(0,Math.min(1,player.y));
  const cxx=Math.floor(player.x/CHUNK_SIZE);
  const cyy=Math.floor(player.y/CHUNK_SIZE);
  if(cxx!==chunkX||cyy!==chunkY){
    chunkX=cxx;chunkY=cyy;
    const key=cxx+','+cyy;
    if(!loadedChunks[key]){
      loadedChunks[key]=generateOrgan(cxx,cyy);
      console.log('generate',key,loadedChunks[key]);
    }
  }
  bullets.forEach(b=>{b.x+=b.dx*dt;b.y+=b.dy*dt;b.life-=dt;});
  bullets=bullets.filter(b=>b.life>0&&b.x>-0.1&&b.x<1.1&&b.y>-0.1&&b.y<1.1);
  enemies.forEach(e=>{const dx=player.x-e.x,dy=player.y-e.y,l=Math.hypot(dx,dy)||1;e.x+=dx/l*0.1*dt;e.y+=dy/l*0.1*dt;});
  for(let i=bullets.length-1;i>=0;i--)for(let j=enemies.length-1;j>=0;j--){
    const dx=bullets[i].x-enemies[j].x,dy=bullets[i].y-enemies[j].y;
    if(Math.hypot(dx,dy)<0.03){
      spawnBlood(enemies[j].x,enemies[j].y);
      if(!enemies[j].immortal){enemies.splice(j,1);kills++;}
      bullets.splice(i,1);
      break;
    }
  }
  for(let i=enemies.length-1;i>=0;i--){
    const dx=player.x-enemies[i].x,dy=player.y-enemies[i].y;
    if(Math.hypot(dx,dy)<0.03){
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
  renderFrame(dt,bullets,enemies,getBlood());
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.addEventListener('resize', ()=>initEngine(gl, canvas, dev));
window.addEventListener('keydown', e=>{
  keys[e.key]=true;
  if(e.key==='m') mutateRules();
});
window.addEventListener('keyup', e=>{keys[e.key]=false;});
