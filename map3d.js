import * as THREE from './three.module.js';
import { PointerLockControls } from './PointerLockControls.js';
import { generateTunnelMesh, setSeed } from './organGen.js';

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
let chunkX=0,chunkZ=0;

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

  level = generateTunnelMesh(0,0,THREE);
  organMat = level.userData.materials.floor;
  level.traverse(obj=>{if(obj.isMesh) obj.material=organMat;});
  scene.add(level);
  loadedChunks['0,0']=level;

  const boxGeo = new THREE.BoxGeometry(0.5,0.5,0.5);
  const boxMat = new THREE.MeshNormalMaterial();
  for(let i=0;i<5;i++){
    const box = new THREE.Mesh(boxGeo, boxMat.clone());
    box.position.set(Math.random()*6-3,0.25,Math.random()*-6);
    scene.add(box);
    enemies.push(box);
  }

  window.addEventListener('resize', onResize);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);
}

function onResize(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
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
  const cxi=Math.floor(camera.position.x/CHUNK_SIZE);
  const czi=Math.floor(camera.position.z/CHUNK_SIZE);
  if(cxi!==chunkX||czi!==chunkZ){
    chunkX=cxi;chunkZ=czi;
    const key=cxi+','+czi;
    if(!loadedChunks[key]){
      const mesh=generateTunnelMesh(cxi,czi,THREE);
      mesh.traverse(obj=>{if(obj.isMesh) obj.material=organMat;});
      scene.add(mesh);
      loadedChunks[key]=mesh;
    }
  }
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
  const hits = raycaster.intersectObjects(enemies);
  if(hits.length>0){
    crosshair.style.color='#ff0040';
    const now=performance.now();
    if(now-lastShot>500){
      const enemy=hits[0].object;
      scene.remove(enemy);
      enemies.splice(enemies.indexOf(enemy),1);
      lastShot=now;
    }
  }else{
    crosshair.style.color='';
  }
  renderer.render(scene, camera);
}
