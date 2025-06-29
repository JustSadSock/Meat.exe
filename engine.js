// Simplified WebGL engine. Zayebis'.
let gl, canvas, devMode;
let glitch = false, glitchTime=0;

export function initEngine(g,c,dev){
  gl=g;canvas=c;devMode=dev;
  resize();
  gl.clearColor(0,0,0,1);
}

function resize(){
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  gl.viewport(0,0,canvas.width,canvas.height);
}

window.addEventListener('resize', resize);

export function renderFrame(dt){
  if(glitch){
    glitchTime-=dt;
    if(glitchTime<=0) glitch=false;
    gl.clearColor(Math.random(),0,0.1,1);
  } else {
    gl.clearColor(0.02,0.02,0.02,1);
  }
  gl.clear(gl.COLOR_BUFFER_BIT);
  // тут бы рисовать мобов/уровень, но пока тишина
}

export function setGlitch(state){
  glitch=state;glitchTime=1.5;
}
