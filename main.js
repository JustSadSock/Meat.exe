import { initEngine, renderFrame, setGlitch } from './engine.js';
import { generateOrgan } from './organGen.js';
import { guns, reloadShader } from './shaderGuns.js';
import { updateBlood } from './goreSim.js';
import { initMeta, mutateRules } from './metaMutate.js';

const dev = new URLSearchParams(location.search).get('dev') === '1';
const canvas = document.getElementById('gl');
const gl = canvas.getContext('webgl2');

initEngine(gl, canvas, dev);
initMeta();

document.getElementById('glitchBtn').onclick = () => setGlitch(true);

if(dev){
  document.getElementById('glitchBtn').style.display='block';
  const edit = document.getElementById('shaderEdit');
  edit.style.display='block';
  edit.addEventListener('input', () => reloadShader(edit.value));
  edit.value = guns[0].fragSrc;
}

let last = 0;
function loop(ts){
  const dt = (ts - last)/1000;
  last = ts;
  renderFrame(dt);
  updateBlood(dt);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

window.addEventListener('resize', ()=>initEngine(gl, canvas, dev));
window.addEventListener('keydown', e=>{
  if(e.key==='m') mutateRules();
});
