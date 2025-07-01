import * as THREE from './three.module.js';
import { PointerLockControls } from './PointerLockControls.js';
import { generateTunnelMesh, generateOrgan, setSeed, CELLS_PER_CHUNK, edgeOpen, edgeCoord } from './organGen.js';
import { AABB, circleVsAABB } from './geom.js';

const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints>0;
const moveJoy = window.moveJoy || {x:0,y:0};
const aimJoy = window.aimJoy || {x:0,y:0};

let camera, scene, renderer, controls;
let enemies = [];
let light;
let organMat;
let raycaster;
let crosshair;
let lastShot = 0;
let level;
let moveForward=false, moveBackward=false, moveLeft=false, moveRight=false;
let velocity=3;
let prevTime=performance.now();
const CHUNK_SIZE=8;
const loadedChunks={};
const loadedCells={};
const loadedWalls={};
const PRELOAD_RADIUS=1;
const PLAYER_R=0.2;
let chunkX=0,chunkZ=0;
const SPAWN_INTERVAL=5;
let spawnTimer=SPAWN_INTERVAL;

init();
animate();

function init(){
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
  raycaster = new THREE.Raycaster();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);
  light = new THREE.PointLight(0xff4444, 2, 10);
  light.position.set(0,2,0);
  scene.add(light);
  setSeed(0);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
  camera.position.y = 1.6;

  controls = new PointerLockControls(camera, canvas);
  canvas.addEventListener('click', () => controls.lock());

  loadChunk(0,0);
  level = loadedChunks['0,0'];
  organMat = level.userData.materials.floor;
  preloadAround(0,0);

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

function computeWalls(cells,cx,cy){
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
    loadedWalls[key]=computeWalls(loadedCells[key],cx,cz);
  }
}

function preloadAround(cx,cz){
  for(let dz=-PRELOAD_RADIUS;dz<=PRELOAD_RADIUS;dz++){
    for(let dx=-PRELOAD_RADIUS;dx<=PRELOAD_RADIUS;dx++){
      loadChunk(cx+dx,cz+dz);
    }
  }
}

function spawnEnemy(x,z){
  const geo=new THREE.SphereGeometry(0.3,16,16);
  const mat=new THREE.MeshNormalMaterial();
  const mesh=new THREE.Mesh(geo,mat);
  mesh.position.set(x,0.3,z);
  scene.add(mesh);
  const enemy={mesh,hp:3,speed:1};
  enemies.push(enemy);
  return mesh;
}

function animate(){
  requestAnimationFrame(animate);
  const time=performance.now();
  const delta=(time-prevTime)/1000;
  prevTime=time;
  if(hasTouch){
    const rotSpeed=2.5;
    const euler=new THREE.Euler(0,0,0,'YXZ');
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
  }
  spawnTimer-=delta;
  if(spawnTimer<=0){
    spawnTimer=SPAWN_INTERVAL;
    const ang=Math.random()*Math.PI*2;
    const dist=CHUNK_SIZE*0.75;
    spawnEnemy(camera.position.x+Math.cos(ang)*dist,
               camera.position.z+Math.sin(ang)*dist);
  }
  enemies.forEach(e=>{
    const dx=camera.position.x-e.mesh.position.x;
    const dz=camera.position.z-e.mesh.position.z;
    const l=Math.hypot(dx,dz)||1e-6;
    e.mesh.position.x+=dx/l*e.speed*delta;
    e.mesh.position.z+=dz/l*e.speed*delta;
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
  const hits = raycaster.intersectObjects(enemies.map(e=>e.mesh));
    if(hits.length>0){
      crosshair.style.color='#ff0040';
      const now=performance.now();
      if(now-lastShot>500){
        const mesh=hits[0].object;
        const enemy=enemies.find(e=>e.mesh===mesh);
        if(enemy){
          enemy.hp-=1;
          if(enemy.hp<=0){
            scene.remove(enemy.mesh);
            enemies.splice(enemies.indexOf(enemy),1);
          }
        }
        lastShot=now;
      }
    }else{
      crosshair.style.color='';
    }
  renderer.render(scene, camera);
}
