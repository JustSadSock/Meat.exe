import * as THREE from './three.module.js';
import { PointerLockControls } from './PointerLockControls.js';
import { generateTunnelMesh, generateOrgan, setSeed, CELLS_PER_CHUNK, edgeOpen, edgeCoord } from './organGen.js';
import { AABB, circleVsAABB } from './geom.js';

const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints>0;
// access joystick objects lazily to avoid capturing stale references
function getMoveJoy(){
  return window.moveJoy || {x:0,y:0};
}
function getAimJoy(){
  return window.aimJoy || {x:0,y:0};
}

let camera, scene, renderer, controls;
let enemies = [];
let enemyBullets = [];
let playerHp = 100;
const PLAYER_MAX_HP = 100;
let playerHpBar;
let enemyMat;
let bulletGeo;
let light;
let organMat;
let raycaster;
let crosshair;
let lastShot = 0;
let level;
let moveForward=false, moveBackward=false, moveLeft=false, moveRight=false;
// Base walking speed (increased for faster movement)
let velocity=4.5;
const baseCameraY = 1.6; // lowered to more natural eye height
let bobTime = 0;
let prevPos = new THREE.Vector3();
const CHUNK_SIZE=8;
const loadedChunks={};
const loadedCells={};
const loadedWalls={};
const PRELOAD_RADIUS=1;
const PLAYER_R=0.2;
let chunkX=0,chunkZ=0;
const SPAWN_INTERVAL=5;
let spawnTimer=SPAWN_INTERVAL;



export function init3D(){
  let canvas = document.getElementById('gl3d');
  if(!canvas){
    canvas = document.createElement('canvas');
    canvas.id = 'gl3d';
    document.body.appendChild(canvas);
  }
  renderer = new THREE.WebGLRenderer({canvas});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  crosshair = document.getElementById('crosshair');
  const hpEl = document.getElementById('playerHealth');
  if(hpEl) playerHpBar = hpEl.querySelector('.bar');
  raycaster = new THREE.Raycaster();
  bulletGeo = new THREE.SphereGeometry(0.05,8,8);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  light = new THREE.PointLight(0xff4444, 2, 10);
  light.position.set(0,2,0);
  scene.add(light);
  scene.add(new THREE.AmbientLight(0x330000, 0.3));
  setSeed(0);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
  // raise spawn slightly to avoid clipping through the floor
  camera.position.y = baseCameraY;

  controls = new PointerLockControls(camera, canvas);
  canvas.addEventListener('click', () => controls.lock());

  loadChunk(0,0);
  level = loadedChunks['0,0'];
  organMat = level.userData.materials.floor;
  preloadAround(0,0);
  cleanupChunks(0,0);

  // spawn player at the center cell to ensure corridor connectivity
  const cx = CELLS_PER_CHUNK/2;
  const cy = CELLS_PER_CHUNK/2;
  const hasCenter = loadedCells['0,0'].some(c => c.x===cx && c.y===cy);
  if(hasCenter){
    camera.position.x = cx + 0.5;
    camera.position.z = cy + 0.5;
  }else if(loadedCells['0,0'][0]){
    const first = loadedCells['0,0'][0];
    camera.position.x = first.x + 0.5;
    camera.position.z = first.y + 0.5;
  }
  // remember starting position for bobbing calculations
  prevPos.copy(camera.position);

  spawnTimer = SPAWN_INTERVAL;

  window.addEventListener('resize', onResize);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
}

function onResize(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(e){
  switch(e.code){
    case 'KeyW':
    case 'ArrowUp': moveForward=true; break;
    case 'KeyS':
    case 'ArrowDown': moveBackward=true; break;
    case 'KeyA':
    case 'ArrowLeft': moveLeft=true; break;
    case 'KeyD':
    case 'ArrowRight': moveRight=true; break;
  }
}

function onKeyUp(e){
  switch(e.code){
    case 'KeyW':
    case 'ArrowUp': moveForward=false; break;
    case 'KeyS':
    case 'ArrowDown': moveBackward=false; break;
    case 'KeyA':
    case 'ArrowLeft': moveLeft=false; break;
    case 'KeyD':
    case 'ArrowRight': moveRight=false; break;
  }
}

export function computeWalls(cells,cx,cy){
  const set=new Set(cells.map(c=>c.x+','+c.y));
  const WALL=0.1;
  const walls=[];
  const SIZE=CELLS_PER_CHUNK;
  const edgeCoords=[edgeCoord(cx,cy,0),edgeCoord(cx,cy,1),edgeCoord(cx,cy,2),edgeCoord(cx,cy,3)];
  const edgeOpenings=[edgeOpen(cx,cy,0),edgeOpen(cx,cy,1),edgeOpen(cx,cy,2),edgeOpen(cx,cy,3)];
  for(const c of cells){
    const x=c.x, y=c.y;
    const lx=x-cx*SIZE;
    const ly=y-cy*SIZE;
    const cx0=x-0.5;
    const cy0=y-0.5;
    if(!set.has(x+','+(y-1))){
      const skip=ly===0 && edgeOpenings[0] && lx===edgeCoords[0];
      if(!skip) walls.push(AABB(cx0, cy0-WALL, 1, WALL));
    }
    if(!set.has(x+','+(y+1))){
      const skip=ly===SIZE-1 && edgeOpenings[2] && lx===edgeCoords[2];
      if(!skip) walls.push(AABB(cx0, cy0+1, 1, WALL));
    }
    if(!set.has((x-1)+','+y)){
      const skip=lx===0 && edgeOpenings[3] && ly===edgeCoords[3];
      if(!skip) walls.push(AABB(cx0-WALL, cy0, WALL, 1));
    }
    if(!set.has((x+1)+','+y)){
      const skip=lx===SIZE-1 && edgeOpenings[1] && ly===edgeCoords[1];
      if(!skip) walls.push(AABB(cx0+1, cy0, WALL, 1));
    }
  }
  return walls;
}

function loadChunk(cx,cz){
  const key=cx+','+cz;
  if(!loadedChunks[key]){
    const mesh=generateTunnelMesh(cx,cz,THREE);
    if(!organMat) organMat=mesh.userData.materials.floor;
    mesh.traverse(obj=>{if(obj.isMesh) obj.material=organMat;});
    scene.add(mesh);
    loadedChunks[key]=mesh;
    loadedCells[key]=generateOrgan(cx,cz);
    let newWalls=computeWalls(loadedCells[key],cx,cz);
    // remove duplicates that may occur when neighbouring chunks generate the
    // same wall geometry
    for(const oKey in loadedWalls){
      const other=loadedWalls[oKey];
      for(let i=newWalls.length-1;i>=0;i--){
        const w=newWalls[i];
        for(let j=other.length-1;j>=0;j--){
          const ow=other[j];
          if(w.x===ow.x&&w.y===ow.y&&w.w===ow.w&&w.h===ow.h){
            other.splice(j,1);
            newWalls.splice(i,1);
            break;
          }
        }
      }
    }
    loadedWalls[key]=newWalls;
  }
}

function preloadAround(cx,cz){
  for(let dz=-PRELOAD_RADIUS;dz<=PRELOAD_RADIUS;dz++){
    for(let dx=-PRELOAD_RADIUS;dx<=PRELOAD_RADIUS;dx++){
      loadChunk(cx+dx,cz+dz);
    }
  }
}

function cleanupChunks(cx,cz){
  const maxDist = PRELOAD_RADIUS + 1;
  for(const key in loadedChunks){
    const parts = key.split(',');
    const x = parseInt(parts[0]);
    const z = parseInt(parts[1]);
    const dx = Math.abs(x - cx);
    const dz = Math.abs(z - cz);
    if(Math.max(dx, dz) > maxDist){
      scene.remove(loadedChunks[key]);
      delete loadedChunks[key];
      delete loadedCells[key];
      delete loadedWalls[key];
    }
  }
}

function spawnEnemy(x,z){
  const types = [
    { color: 0xff0000, hp: 3, speed: 1 },                // normal
    { color: 0x00ff00, hp: 2, speed: 2, shooter: true }, // shooter
    { color: 0x888888, hp: 6, speed: 0.6 }               // tank
  ];
  const t = types[Math.floor(Math.random()*types.length)];
  const geo=new THREE.SphereGeometry(0.3,16,16);
  const mat=new THREE.MeshStandardMaterial({color:t.color});
  const mesh=new THREE.Mesh(geo,mat);
  mesh.position.set(x,0.3,z);
  const barBg = new THREE.Sprite(new THREE.SpriteMaterial({ color:0x550000 }));
  barBg.scale.set(0.5,0.05,1);
  barBg.position.set(0,0.8,0);
  const bar = new THREE.Sprite(new THREE.SpriteMaterial({ color:0x00ff00 }));
  bar.scale.set(0.5,0.05,1);
  bar.position.set(0,0.8,0.001);
  const group=new THREE.Group();
  group.add(mesh);
  group.add(barBg);
  group.add(bar);
  group.position.y=0;
  group.userData = {
    hp: t.hp,
    maxHp: t.hp,
    speed: t.speed,
    shooter: !!t.shooter,
    nextShot: 1 + Math.random(),
    bar,
    barBg,
    mesh
  };
  group.position.set(x,0,z);
  scene.add(group);
  enemies.push(group);
  return group;
}

export function update3D(delta){
  const time=performance.now();
  enemies = enemies.filter(e=>{
    if(e.userData.hp<=0){
      scene.remove(e);
      return false;
    }
    return true;
  });
  if(hasTouch){
    const rotSpeed=2.5;
    const euler=new THREE.Euler(0,0,0,'YXZ');
    const aimJoy=getAimJoy();
    const moveJoy=getMoveJoy();
    euler.setFromQuaternion(camera.quaternion);
    euler.y-=aimJoy.x*rotSpeed*delta;
    euler.x-=aimJoy.y*rotSpeed*delta;
    euler.x=Math.max(-Math.PI/2,Math.min(Math.PI/2,euler.x));
    camera.quaternion.setFromEuler(euler);
    controls.moveForward(-moveJoy.y*velocity*delta);
    controls.moveRight(moveJoy.x*velocity*delta);
  }
  if(moveForward) controls.moveForward(velocity*delta);
  if(moveBackward) controls.moveForward(-velocity*delta);
  if(moveLeft) controls.moveRight(-velocity*delta);
  if(moveRight) controls.moveRight(velocity*delta);

  const dist = camera.position.clone().sub(prevPos).length();
  const speed = dist/delta;
  prevPos.copy(camera.position);
  const speedRatio = Math.min(speed/velocity, 1);
  if(speed>0.01) bobTime += speedRatio * delta * 8;
  else bobTime -= delta * 8;
  bobTime = Math.max(0, bobTime);
  camera.position.y = baseCameraY + Math.sin(bobTime) * 0.05 * speedRatio;

  // collision detection using wall geometry
  const player={x:camera.position.x,y:camera.position.z,r:PLAYER_R};
  for(const k in loadedWalls){
    for(const wall of loadedWalls[k]){
      if(circleVsAABB(player, wall)){
        const cx=Math.max(wall.x, Math.min(player.x, wall.x+wall.w));
        const cy=Math.max(wall.y, Math.min(player.y, wall.y+wall.h));
        let dx=player.x-cx, dy=player.y-cy;
        let dist=Math.hypot(dx,dy) || 1e-6;
        const overlap=player.r-dist;
        if(overlap>0){
          dx/=dist; dy/=dist;
          player.x+=dx*overlap;
          player.y+=dy*overlap;
        }
      }
    }
  }
  camera.position.x=player.x;
  camera.position.z=player.y;
  const cxi=Math.floor(camera.position.x/CHUNK_SIZE);
  const czi=Math.floor(camera.position.z/CHUNK_SIZE);
  if(cxi!==chunkX||czi!==chunkZ){
    chunkX=cxi;chunkZ=czi;
    preloadAround(cxi,czi);
    cleanupChunks(cxi,czi);
  }
  // also load chunk in view direction
  const dir=new THREE.Vector3();
  camera.getWorldDirection(dir);
  const lookX=Math.floor((camera.position.x+dir.x*CHUNK_SIZE*PRELOAD_RADIUS)/CHUNK_SIZE);
  const lookZ=Math.floor((camera.position.z+dir.z*CHUNK_SIZE*PRELOAD_RADIUS)/CHUNK_SIZE);
  loadChunk(lookX,lookZ);
  spawnTimer-=delta;
  if(spawnTimer<=0){
    spawnTimer=SPAWN_INTERVAL;
    const ang=Math.random()*Math.PI*2;
    const dist=CHUNK_SIZE*0.75;
    spawnEnemy(camera.position.x+Math.cos(ang)*dist,
               camera.position.z+Math.sin(ang)*dist);
  }
  enemies.forEach(e=>{
    const dx=camera.position.x-e.position.x;
    const dz=camera.position.z-e.position.z;
    const l=Math.hypot(dx,dz)||1e-6;
    e.position.x+=dx/l*e.userData.speed*delta;
    e.position.z+=dz/l*e.userData.speed*delta;
    if(l<PLAYER_R*2){
      playerHp = Math.max(0, playerHp-20*delta);
    }
    const ratio=e.userData.hp/e.userData.maxHp;
    e.userData.bar.scale.x = ratio*0.5;
    // anchor bar to the left side
    e.userData.bar.position.x = -(0.5 - e.userData.bar.scale.x)/2;
    e.userData.bar.lookAt(camera.position);
    if(e.userData.barBg) e.userData.barBg.lookAt(camera.position);
    if(e.userData.bar.material)
      e.userData.bar.material.color.setHSL(ratio*0.33,1,0.5);
    if(e.userData.shooter){
      e.userData.nextShot -= delta;
      if(e.userData.nextShot<=0){
        e.userData.nextShot=1+Math.random();
        const bullet=new THREE.Mesh(bulletGeo,new THREE.MeshBasicMaterial({color:0xffffff}));
        bullet.position.copy(e.position);
        const dir=new THREE.Vector3().subVectors(camera.position,e.position).normalize();
        bullet.userData={vel:dir.multiplyScalar(3),life:3};
        scene.add(bullet);
        enemyBullets.push(bullet);
      }
    }
  });
  const playerPos = camera.position.clone();
  enemyBullets=enemyBullets.filter(b=>{
    b.position.addScaledVector(b.userData.vel,delta);
    b.userData.life-=delta;
    if(b.position.distanceTo(playerPos)<PLAYER_R){
      playerHp = Math.max(0, playerHp-10);
      scene.remove(b);
      return false;
    }
    if(b.userData.life<=0){
      scene.remove(b);
      return false;
    }
    return true;
  });
  const t=time*0.001;
  const p=0.5+Math.sin(t*2)*0.5;
  if(organMat){
    organMat.emissiveIntensity=0.5+p*0.5;
    organMat.color.setHSL(0,1,0.3+0.2*p);
  }
  if(light){
    light.intensity=2+p;
    light.position.copy(camera.position);
  }
  raycaster.setFromCamera(new THREE.Vector2(0,0), camera);
  const enemyMeshes = enemies.map(e=>e.userData.mesh);
  const hits = raycaster.intersectObjects(enemyMeshes);
    if(hits.length>0){
      crosshair.style.color='#ff0040';
      const now=performance.now();
      if(now-lastShot>500){
        const mesh=hits[0].object;
        const enemy=enemies.find(en=>en.userData.mesh===mesh);
        if(enemy){
          enemy.userData.hp-=1;
          if(enemy.userData.hp<=0){
            scene.remove(enemy);
            enemies.splice(enemies.indexOf(enemy),1);
          }
        }
        const flash=new THREE.PointLight(0xffaa00,1,2);
        flash.position.copy(camera.position);
        scene.add(flash);
        setTimeout(()=>scene.remove(flash),100);
        lastShot=now;
      }
    }else{
      crosshair.style.color='';
    }
  if(playerHpBar){
    playerHpBar.style.width = (playerHp/PLAYER_MAX_HP*100)+'%';
  }
  renderer.render(scene, camera);
}
