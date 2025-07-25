import { initEngine, renderFrame, setGlitch, kickFov } from './engine.js';
import { generateOrgan } from './organGen.js';
import { guns, reloadShader, initGuns, addFragment, getBestFragment, applyFragment, fragmentInventory } from './shaderGuns.js';
import { updateBlood, spawnBlood, getBlood, bindPlayer, applyBloodEffects } from './goreSim.js';
import { initMeta, mutateRules, getRules, setPerformanceSettings, formatRules } from './metaMutate.js';
import { AABB, circleVsCircle, circleInsideAABB, clampCircleToAABB } from './geom.js';
import { initAudio, triggerGlitch } from './audio.js';
import { init3D, update3D } from './map3d.js';

const dev = new URLSearchParams(location.search).get('dev') === '1';
const canvas = document.getElementById('gl');
const canvas3d = document.getElementById('gl3d');
const gl = canvas.getContext('webgl2');

initEngine(gl, canvas, dev);
initMeta();
initGuns(gl);

// Prevent text selection and system gestures
document.addEventListener('selectstart',e=>e.preventDefault());
document.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('dblclick',e=>e.preventDefault());

const cross=document.getElementById('crosshair');
const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints>0;
const joyL=document.getElementById('joyL');
const joyR=document.getElementById('joyR');
const joyLInner=joyL.querySelector('.inner');
const joyRInner=joyR.querySelector('.inner');
let moveJoy={x:0,y:0},aimJoy={x:0,y:0};
window.moveJoy = moveJoy;
window.aimJoy = aimJoy;
const JOY_CROSS_RANGE=60;
if(hasTouch){
  cross.style.display='block';
  cross.style.left='50%';
  cross.style.top='50%';
}else{
  joyL.style.display='none';
  joyR.style.display='none';
}
init3D();
let locked=false,cx=window.innerWidth/2,cy=window.innerHeight/2;
if(!hasTouch){
  canvas3d.addEventListener('click',()=>{
    if(!locked){
      canvas3d.requestPointerLock();
      initAudio();
    }
    else fire();
  });
  document.addEventListener('pointerlockchange',()=>{
    locked=document.pointerLockElement===canvas3d;
    if(locked){
      cx=window.innerWidth/2;
      cy=window.innerHeight/2;
      cross.style.left='50%';
      cross.style.top='50%';
    }
  });
  // keep crosshair centered while locked
  document.addEventListener('mousemove',e=>{
    if(!locked)return;
    // prevent crosshair drift
    cx=window.innerWidth/2;
    cy=window.innerHeight/2;
    cross.style.left='50%';
    cross.style.top='50%';
  });
} 
else {
  const joyUpdate=(el,inner,vec,isAim)=>e=>{
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
    if(isAim){
      cx=window.innerWidth/2+vec.x*JOY_CROSS_RANGE;
      cy=window.innerHeight/2+vec.y*JOY_CROSS_RANGE;
      cross.style.left=cx+'px';
      cross.style.top=cy+'px';
    }
  };
  let lActive=false,rActive=false;
  joyL.addEventListener('pointerdown',e=>{lActive=true;joyUpdate(joyL,joyLInner,moveJoy,false)(e);});
  joyL.addEventListener('pointermove',e=>{if(lActive)joyUpdate(joyL,joyLInner,moveJoy,false)(e);});
  joyL.addEventListener('pointerup',()=>{lActive=false;moveJoy.x=moveJoy.y=0;joyLInner.style.left='50%';joyLInner.style.top='50%';});
  joyL.addEventListener('pointercancel',()=>{lActive=false;moveJoy.x=moveJoy.y=0;joyLInner.style.left='50%';joyLInner.style.top='50%';});
  joyR.addEventListener('pointerdown',e=>{rActive=true;joyUpdate(joyR,joyRInner,aimJoy,true)(e);});
  joyR.addEventListener('pointermove',e=>{if(rActive)joyUpdate(joyR,joyRInner,aimJoy,true)(e);});
  joyR.addEventListener('pointerup',()=>{rActive=false;aimJoy.x=aimJoy.y=0;joyRInner.style.left='50%';joyRInner.style.top='50%';cx=window.innerWidth/2;cy=window.innerHeight/2;cross.style.left=cx+'px';cross.style.top=cy+'px';fire();});
  joyR.addEventListener('pointercancel',()=>{rActive=false;aimJoy.x=aimJoy.y=0;joyRInner.style.left='50%';joyRInner.style.top='50%';cx=window.innerWidth/2;cy=window.innerHeight/2;cross.style.left=cx+'px';cross.style.top=cy+'px';});
}

const CHUNK_SIZE=0.25;
const CELLS_PER_CHUNK=8;
const PLAYER_R=0.03;
const ENEMY_R=0.03;
const BULLET_R=0.015;
let chunkX=0,chunkY=0;
const loadedChunks={};
const firstCells=generateOrgan(0,0);
loadedChunks['0,0']=firstCells.map(t=>
  AABB(t.x*CHUNK_SIZE-PLAYER_R,
       t.y*CHUNK_SIZE-PLAYER_R,
       CHUNK_SIZE+PLAYER_R*2,
       CHUNK_SIZE+PLAYER_R*2));

const enemyTypes={
  normal:{speed:0.1,hp:10,color:[0.8,0,0]},
  fast:{speed:0.15,hp:5,color:[1,0,0.8]},
  tank:{speed:0.07,hp:20,color:[0.8,0.4,0]},
  phantom:{speed:0.12,hp:1,phantom:true,life:5,color:[0.3,0.3,1]},
  mini:{speed:0.08,hp:50,boss:true,color:[0,1,0]},
  hashHeart:{speed:0.05,hp:100,boss:true,color:[1,0,0.4]}
};

let spawn={x:(CELLS_PER_CHUNK/2+0.5)*CHUNK_SIZE,y:(CELLS_PER_CHUNK/2+0.5)*CHUNK_SIZE};
if(firstCells.length>0){
  const centralX=CELLS_PER_CHUNK/2;
  const centralY=CELLS_PER_CHUNK/2;
  const key=centralX+','+centralY;
  if(firstCells.some(c=>c.x===centralX&&c.y===centralY)){
    spawn={x:(centralX+0.5)*CHUNK_SIZE,y:(centralY+0.5)*CHUNK_SIZE};
  }else{
    const c=firstCells[0];
    spawn={x:(c.x+0.5)*CHUNK_SIZE,y:(c.y+0.5)*CHUNK_SIZE};
  }
}
const player={x:spawn.x,y:spawn.y,vx:0,vy:0,hp:100};
bindPlayer(player);
let sprint=false;
let slideTimer=0;
let hook=null;
let bullets=[],enemies=[],wave=7,difficulty=1,kills=0;
let flashes=[];
let damageDealt=0,dpsTime=0;
let gameTime=0,bossTimer=90,finalBoss=false;
let fragItems=[];
const fragmentPool=[
  'outColor.rgb*=vec3(gl_PointCoord.x,gl_PointCoord.y,1.0);',
  'outColor=mix(outColor,vec4(1.0,0.5,0.0,1.0),gl_PointCoord.x);',
  'outColor.a*=step(0.25,gl_PointCoord.x)*step(0.25,gl_PointCoord.y);'
];
let elapsed=0;
let currentGun=0;
let shootTimer=0;
const keys={};
const fpsEl=document.getElementById('fps');
const metaEl=document.getElementById('meta');
const reportEl=document.getElementById('report');

function updateMeta(){
  metaEl.textContent = 'Rules:\n'+formatRules();
}

updateMeta();

function showReport(m){
  const txt = `You died!\nChanged: ${m.key} -> ${typeof m.value==='number'?m.value.toFixed(2):m.value}\n\n`+formatRules();
  reportEl.textContent=txt;
  reportEl.style.display='block';
  setTimeout(()=>{reportEl.style.display='none';},2000);
}

function fire(){
  if(shootTimer>0) return;
  let dx,dy;
  if(hasTouch){
    dx=aimJoy.x;dy=aimJoy.y;
  }else{
    dx=cx/window.innerWidth-0.5;
    dy=cy/window.innerHeight-0.5;
  }
  const l=Math.hypot(dx,dy)||1;
  const gun=guns[currentGun];
  bullets.push({x:player.x,y:player.y,dx:dx/l*0.6,dy:dy/l*0.6,life:2,size:gun.size,r:BULLET_R*gun.lvl,damage:gun.damage,effect:gun.effect});
  flashes.push({x:player.x,y:player.y,life:0.1});
  shootTimer=gun.cooldown;
  setGlitch(true);
  kickFov(0.2);
}

function makeEnemy(type,x,y,immortal=false){
  const base=enemyTypes[type]||enemyTypes.normal;
  const mult=getRules().enemySpeed||1;
  const partR=ENEMY_R*0.5;
  const parts=[
    {name:'head',dx:0,dy:-ENEMY_R*1.2,r:partR,hp:2,alive:true,phase:Math.random()*Math.PI*2},
    {name:'lArm',dx:-ENEMY_R*1.2,dy:0,r:partR,hp:3,alive:true,phase:Math.random()*Math.PI*2},
    {name:'rArm',dx:ENEMY_R*1.2,dy:0,r:partR,hp:3,alive:true,phase:Math.random()*Math.PI*2},
    {name:'lLeg',dx:-ENEMY_R*0.6,dy:ENEMY_R*1.2,r:partR,hp:3,alive:true,phase:Math.random()*Math.PI*2},
    {name:'rLeg',dx:ENEMY_R*0.6,dy:ENEMY_R*1.2,r:partR,hp:3,alive:true,phase:Math.random()*Math.PI*2}
  ];
  return {x,y,immortal,type,speed:base.speed*mult,hp:base.hp,phase:1,phantom:base.phantom,boss:base.boss,life:base.life||Infinity,wobble:Math.random()*Math.PI*2,parts,color:base.color||[0.6,0,0]};
}

function spawnWave(d,type="normal",immortal=false){
  for(let i=0;i<3*d;i++){
    const s=Math.floor(Math.random()*4);
    let x,y;
    if(s===0){x=Math.random();y=-0.05;}else if(s===1){x=Math.random();y=1.05;}
    else if(s===2){x=-0.05;y=Math.random();}else{x=1.05;y=Math.random();}
    const t=type==="mix"?['normal','fast','tank'][Math.floor(Math.random()*3)]:type;
    enemies.push(makeEnemy(t,x,y,immortal));
  }
}

function rocketKnockback(x,y){
  const dx=player.x-x;
  const dy=player.y-y;
  const dist=Math.hypot(dx,dy);
  if(dist<0.1){
    const k=0.4/dist;
    player.vx+=dx*k;
    player.vy+=dy*k;
  }
}

function spawnMiniBoss(){
  const x=Math.random()<0.5?-0.05:1.05;
  const y=Math.random();
  enemies.push(makeEnemy('mini',x,y));
}

function spawnHashHeart(){
  enemies.push(makeEnemy('hashHeart',0.5,-0.2));
  finalBoss=true;
}

spawnWave(difficulty,"mix");

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
  update3D(dt);
  elapsed += dt;
  shootTimer=Math.max(0,shootTimer-dt);
  if(dev) fpsEl.textContent = Math.round(1/dt)+" FPS";
  // movement with friction + gravity
  const rules=getRules();
  let ax=(keys['d']?1:0)-(keys['a']?1:0)+moveJoy.x;
  let ay=(keys['s']?1:0)-(keys['w']?1:0)+moveJoy.y;
  // Increase player acceleration for faster movement
  let accel=0.9*(sprint?1.8:1);
  if(ax||ay && slideTimer<=0){
    const l=Math.hypot(ax,ay);ax/=l;ay/=l;
    player.vx+=ax*accel*dt;
    player.vy+=ay*accel*dt;
  }
  if(hook){
    player.vx+=hook.dx*3*dt;
    player.vy+=hook.dy*3*dt;
    hook.time-=dt; if(hook.time<=0) hook=null;
  }
  player.vy+=0.4*rules.gravity*dt;
  const fr=slideTimer>0?Math.pow(rules.friction,0.5):rules.friction;
  player.vx*=fr;
  player.vy*=fr;
  if(slideTimer>0) slideTimer-=dt;
  player.x+=player.vx*dt;
  player.y+=player.vy*dt;
  const cxx=Math.floor(player.x/CHUNK_SIZE);
  const cyy=Math.floor(player.y/CHUNK_SIZE);
  if(cxx!==chunkX||cyy!==chunkY){
    chunkX=cxx;chunkY=cyy;
    const key=cxx+','+cyy;
    if(!loadedChunks[key]){
      const cells=generateOrgan(cxx,cyy).map(t=>
        AABB(t.x*CHUNK_SIZE-PLAYER_R,
             t.y*CHUNK_SIZE-PLAYER_R,
             CHUNK_SIZE+PLAYER_R*2,
             CHUNK_SIZE+PLAYER_R*2));
      loadedChunks[key]=cells;
      console.log('generate',key,cells);
    }
  }
  for(let i=bullets.length-1;i>=0;i--){
    const b=bullets[i];
    b.x+=b.dx*dt;
    b.y+=b.dy*dt;
    b.life-=dt;
    if(b.life<=0){
      rocketKnockback(b.x,b.y);
      bullets.splice(i,1);
      continue;
    }
    if(Math.abs(b.x-player.x)>=1||Math.abs(b.y-player.y)>=1){
      bullets.splice(i,1);
    }
  }
  for(let i=flashes.length-1;i>=0;i--){
    flashes[i].life-=dt;
    if(flashes[i].life<=0) flashes.splice(i,1);
  }
  const allBoxes=[];
  for(const k in loadedChunks) allBoxes.push(...loadedChunks[k]);
  const playerCirc={x:player.x,y:player.y,r:PLAYER_R};
  let insideP=false;
  for(const b of allBoxes){if(circleInsideAABB(playerCirc,b)){insideP=true;break;}}
  if(!insideP){
    let near=null,best=1e9;
    for(const box of allBoxes){
      const cx=Math.max(box.x,Math.min(player.x,box.x+box.w));
      const cy=Math.max(box.y,Math.min(player.y,box.y+box.h));
      const d=(player.x-cx)*(player.x-cx)+(player.y-cy)*(player.y-cy);
      if(d<best){best=d;near=box;}
    }
    if(near){
      clampCircleToAABB(playerCirc,near);
      player.x=playerCirc.x;player.y=playerCirc.y;
    }
  }
  enemies.forEach(e=>{
    const dx=player.x-e.x,dy=player.y-e.y,l=Math.hypot(dx,dy)||1;
    e.wobble+=dt;
    const ang=Math.atan2(dy,dx)+Math.PI/2;
    const off=Math.sin(e.wobble*3.0)*0.05;
    e.x+=(dx/l+Math.cos(ang)*off)*e.speed*dt;
    e.y+=(dy/l+Math.sin(ang)*off)*e.speed*dt;
    e.life-=dt;
    e.parts.forEach(p=>{if(p.alive)p.phase+=dt*5;});
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
  enemies=enemies.filter(e=>e.life>0);
  for(let i=bullets.length-1;i>=0;i--){
    let hit=false;
    for(let j=enemies.length-1;j>=0 && !hit;j--){
      const e=enemies[j];
      for(const p of e.parts){
        if(!p.alive) continue;
        const px=e.x+p.dx+Math.cos(p.phase)*0.01;
        const py=e.y+p.dy+Math.sin(p.phase)*0.01;
        if(circleVsCircle({x:bullets[i].x,y:bullets[i].y,r:bullets[i].r},{x:px,y:py,r:p.r})){
          spawnBlood(px,py,bullets[i].effect);
          rocketKnockback(bullets[i].x,bullets[i].y);
          p.hp-=bullets[i].damage;
          e.hp-=bullets[i].damage;
          damageDealt+=bullets[i].damage;
          if(p.hp<=0) p.alive=false;
          if(e.hp<=0 && !e.immortal){
            if(e.type==='hashHeart' && e.phase<3){
              e.phase++;e.hp=enemyTypes.hashHeart.hp;e.speed+=0.02;
            } else {
              if(!e.phantom && Math.random()<0.3){
                const code=fragmentPool[Math.floor(Math.random()*fragmentPool.length)];
                fragItems.push({x:e.x,y:e.y,code});
              }
              if(!e.phantom) kills++; 
              enemies.splice(j,1);
            }
          }
          bullets.splice(i,1);
          hit=true;
          break;
        }
      }
    }
  }
  for(let i=enemies.length-1;i>=0;i--){
    const e=enemies[i];
    let hitBody=circleVsCircle({x:player.x,y:player.y,r:PLAYER_R},{x:e.x,y:e.y,r:ENEMY_R});
    if(!hitBody){
      for(const p of e.parts){
        if(!p.alive) continue;
        const px=e.x+p.dx+Math.cos(p.phase)*0.01;
        const py=e.y+p.dy+Math.sin(p.phase)*0.01;
        if(circleVsCircle({x:player.x,y:player.y,r:PLAYER_R},{x:px,y:py,r:p.r})){hitBody=true;break;}
      }
    }
    if(hitBody){
      player.hp-=10;
      spawnBlood(player.x,player.y,'normal');
      enemies.splice(i,1);
    }
  }
  for(let i=fragItems.length-1;i>=0;i--){
    if(circleVsCircle({x:player.x,y:player.y,r:PLAYER_R},{x:fragItems[i].x,y:fragItems[i].y,r:0.02})){
      addFragment(fragItems[i].code);
      fragItems.splice(i,1);
    }
  }
  if(player.hp<=0){
    const m=mutateRules();
    updateMeta();
    showReport(m);
    player.hp=100;difficulty=1;kills=0;
  }
  if(elapsed>=60){
    const kps=kills/elapsed;
    const expected=difficulty;
    difficulty=Math.min(3.5,Math.max(0.7,0.8+(kps/expected-1)*0.6-(player.hp<50?0.1:0)+(elapsed/60)*0.05));
    if(kps/expected>1.4){
      setGlitch(true);
      spawnWave(Math.ceil(difficulty),"phantom",true); // anti-cheat mobs
    }
    kills=0;elapsed=0;
  }

  dpsTime+=dt;gameTime+=dt;bossTimer-=dt;
  if(dpsTime>=30){
    const dps=damageDealt/dpsTime;
    if(dps>difficulty*15){
      spawnWave(Math.ceil(difficulty),"phantom");
    }
    damageDealt=0;dpsTime=0;
  }
  if(!finalBoss){
    if(gameTime>=360){
      spawnHashHeart();
    }else if(bossTimer<=0){
      spawnMiniBoss();
      bossTimer=90;
    }
  }
  wave-=dt; if(wave<=0){spawnWave(difficulty,"mix");wave=7;}
  updateBlood(dt);
  applyBloodEffects(enemies,player,dt);
  const offX=player.x-0.5,offY=player.y-0.5;
  const rb=bullets.map(b=>({x:b.x-offX,y:b.y-offY}));
  const groups={};
  enemies.forEach(e=>{
    if(e.phantom && Math.sin(e.life*10)>0) return; // flicker
    const key=e.color.join(',');
    if(!groups[key]) groups[key]={color:e.color,points:[]};
    groups[key].points.push({x:e.x-offX,y:e.y-offY});
    e.parts.forEach(p=>{
      if(p.alive) groups[key].points.push({x:e.x+p.dx+Math.cos(p.phase)*0.01-offX,y:e.y+p.dy+Math.sin(p.phase)*0.01-offY});
    });
  });
  const re=Object.values(groups);
  const fl=flashes.map(f=>({x:f.x-offX,y:f.y-offY}));
  const bl=getBlood().map(b=>({x:b.x-offX,y:b.y-offY}));
  const fi=fragItems.map(f=>({x:f.x-offX,y:f.y-offY}));
  const mapCells=[];
  for(const k in loadedChunks){
    for(const c of loadedChunks[k]){
      mapCells.push({x:c.x+c.w*0.5-offX,y:c.y+c.h*0.5-offY});
    }
  }
  renderFrame(dt,rb,re,bl,fi,mapCells,guns[currentGun].size,CHUNK_SIZE,fl);
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
  if(k==='Shift') sprint=true;
  if(k==='Control') slideTimer=0.3;
  if(k===' ') player.vy-=0.3;
  if(k==='g'){
    let dx,dy;
    if(hasTouch){dx=aimJoy.x;dy=aimJoy.y;}else{dx=cx/window.innerWidth-0.5;dy=cy/window.innerHeight-0.5;}
    const l=Math.hypot(dx,dy)||1;
    hook={dx:dx/l,dy:dy/l,time:0.4};
  }
  if(k==='e'){
    const best=getBestFragment();
    if(best) applyFragment(best,0);
  }
});
window.addEventListener('keyup', e=>{
  const k=e.key;
  if(k==='ArrowUp') keys['w']=false;
  else if(k==='ArrowDown') keys['s']=false;
  else if(k==='ArrowLeft') keys['a']=false;
  else if(k==='ArrowRight') keys['d']=false;
  keys[k]=false;
  if(k==='Shift') sprint=false;
});
