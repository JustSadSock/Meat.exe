import * as THREE from './three.module.js';
import { PointerLockControls } from './PointerLockControls.js';

let camera, scene, renderer, controls;
init();
animate();

function init(){
  const canvas = document.getElementById('gl');
  renderer = new THREE.WebGLRenderer({canvas});
  renderer.setSize(window.innerWidth, window.innerHeight);

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

  const boxGeo = new THREE.BoxGeometry(1,1,1);
  const boxMat = new THREE.MeshNormalMaterial();
  const box = new THREE.Mesh(boxGeo, boxMat);
  box.position.set(0.0,0.5,-3.0);
  scene.add(box);

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
  renderer.render(scene, camera);
}
