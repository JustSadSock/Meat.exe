let gl;

// collected GLSL fragments stored in inventory slots
export let fragmentInventory = [];

function loadFragments(){
  const saved = localStorage.getItem('glslFragments');
  if(saved) fragmentInventory = JSON.parse(saved);
}

function saveFragments(){
  localStorage.setItem('glslFragments', JSON.stringify(fragmentInventory));
}

export function addFragment(code){
  let f = fragmentInventory.find(fr=>fr.code===code);
  if(f) f.lvl++;
  else fragmentInventory.push({code,lvl:1});
  saveFragments();
}

export function getBestFragment(){
  if(fragmentInventory.length===0) return null;
  return fragmentInventory.slice().sort((a,b)=>b.lvl-a.lvl)[0];
}

export function applyFragment(fragment,index=0){
  if(!fragment) return;
  const gun=guns[index];
  const src=gun.baseSrc.replace(/}\s*$/m,`\n${fragment.code}\n}`);
  gun.lvl=fragment.lvl;
  reloadShader(src,index);
}

export let guns=[
  {
    name:'Pew',
    fragSrc:`precision highp float;
out vec4 outColor;
void main(){
  float d=length(gl_PointCoord-0.5);
  if(d>0.5) discard;
  outColor=vec4(1.0,0.0,0.25,1.0); // neon red bullet
}`,
    cooldown:0.2,
    energyCost:1,
    lvl:1,
    damage:1,
    size:8
  },
  {
    name:'Blaster',
    fragSrc:`precision highp float;
out vec4 outColor;
void main(){
  float d=length(gl_PointCoord-0.5);
  if(d>0.5) discard;
  outColor=vec4(0.0,1.0,0.4,1.0); // greenish bullet
}`,
    cooldown:0.15,
    energyCost:2,
    lvl:1,
    damage:1,
    size:10
  },
  {
    name:'Laser',
    fragSrc:`precision highp float;
out vec4 outColor;
void main(){
  float d=abs(gl_PointCoord.x-0.5);
  if(d>0.25) discard;
  outColor=vec4(0.3,0.7,1.0,1.0); // blue beam
}`,
    cooldown:0.05,
    energyCost:3,
    lvl:1,
    damage:1,
    size:6
  }
];

export function initGuns(glCtx){
  gl=glCtx;
  guns.forEach(g=>{g.baseSrc=g.fragSrc;compileGun(g);});
  loadFragments();
}

function compileGun(g){
  if(!gl) return;
  if(g.prog) gl.deleteProgram(g.prog);
  const vs=`#version 300 es
precision mediump float;
in vec2 a_pos;
void main(){gl_Position=vec4(a_pos,0.0,1.0);} `;
  const fs=`#version 300 es
precision highp float;
out vec4 outColor;
${g.fragSrc}`;
  const vsObj=gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vsObj,vs);gl.compileShader(vsObj);
  const fsObj=gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fsObj,fs);gl.compileShader(fsObj);
  const prog=gl.createProgram();
  gl.attachShader(prog,vsObj);gl.attachShader(prog,fsObj);gl.linkProgram(prog);
  g.prog=prog;
}

export function reloadShader(src,index=0){
  guns[index].fragSrc=src;
  compileGun(guns[index]);
}

export function addGun(newGun){
  const existing=guns.find(g=>g.name===newGun.name);
  if(existing){
    existing.lvl++;
    existing.damage++;
    existing.size+=2;
    compileGun(existing);
    return existing;
  }
  guns.push(newGun);
  compileGun(newGun);
  return newGun;
}
