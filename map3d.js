import * as THREE from './three.module.js';
import { PointerLockControls } from './PointerLockControls.js';

let camera, scene, renderer, controls;
let enemies = [];
let raycaster;
let crosshair;
let lastShot = 0;

init();
animate();

function init(){
  const canvas = document.getElementById('gl');
  renderer = new THREE.WebGLRenderer({canvas});
  renderer.setSize(window.innerWidth, window.innerHeight);
  crosshair = document.getElementById('crosshair');
  raycaster = new THREE.Raycaster();

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x050505);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 100);
  camera.position.y = 1.6;

  controls = new PointerLockControls(camera, canvas);
  canvas.addEventListener('click', () => controls.lock());

  const floorGeo = new THREE.PlaneGeometry(10, 10);
  const floorMat = new THREE.MeshBasicMaterial({color:0x222222});
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI/2;
  scene.add(floor);

  const boxGeo = new THREE.BoxGeometry(0.5,0.5,0.5);
  const boxMat = new THREE.MeshNormalMaterial();
  for(let i=0;i<5;i++){
    const box = new THREE.Mesh(boxGeo, boxMat.clone());
    box.position.set(Math.random()*6-3,0.25,Math.random()*-6);
    scene.add(box);
    enemies.push(box);
  }

  window.addEventListener('resize', onResize);
}

function onResize(){
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(){
  requestAnimationFrame(animate);
  controls.update();
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
