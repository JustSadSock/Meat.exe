// Simplified WebGL engine. Zayebis'.
import { getRules } from './metaMutate.js';
let gl, canvas, devMode;
let glitch = false, glitchTime=0;
let time = 0;
let program, buf, locPos, locColor, locSize;
let enemyProgram, enemyLocPos, enemyLocColor, enemyLocSize;
let camFov = 1, targetFov = 1, baseFov = 1;

export function initEngine(g,c,dev){
  gl=g;canvas=c;devMode=dev;
  resize();
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const vs=`#version 300 es\nprecision mediump float;\nin vec2 a_pos;\nuniform float u_size;\nvoid main(){gl_Position=vec4(a_pos*2.0-1.0,0.0,1.0);gl_PointSize=u_size;}`;
  const fs=`#version 300 es\nprecision mediump float;\nuniform vec3 u_color;\nout vec4 outColor;\nvoid main(){outColor=vec4(u_color,1.0);}`;
  program=makeProgram(vs,fs);
  locPos=gl.getAttribLocation(program,'a_pos');
  locColor=gl.getUniformLocation(program,'u_color');
  locSize=gl.getUniformLocation(program,'u_size');

  const fsEnemy=`#version 300 es\nprecision mediump float;\nuniform vec3 u_color;\nout vec4 outColor;\nvoid main(){\n    vec2 c=gl_PointCoord*2.0-1.0;\n    float v=step(abs(c.x),0.25);\n    float h=step(abs(c.y),0.25);\n    float a=max(v,h);\n    if(a<0.5) discard;\n    outColor=vec4(u_color,1.0);\n  }`;
  enemyProgram=makeProgram(vs,fsEnemy);
  enemyLocPos=gl.getAttribLocation(enemyProgram,'a_pos');
  enemyLocColor=gl.getUniformLocation(enemyProgram,'u_color');
  enemyLocSize=gl.getUniformLocation(enemyProgram,'u_size');
  buf=gl.createBuffer();
  gl.clearColor(0,0,0,1);
}

export function kickFov(amount){
  targetFov = 1 + amount;
}

function resize(){
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  gl.viewport(0,0,canvas.width,canvas.height);
}

function makeProgram(vsSrc,fsSrc){
  const vs=gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs,vsSrc);gl.compileShader(vs);
  const vsOk = gl.getShaderParameter(vs, gl.COMPILE_STATUS);
  if(devMode && !vsOk){
    console.error(gl.getShaderInfoLog(vs));
  }
  const fs=gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs,fsSrc);gl.compileShader(fs);
  const fsOk = gl.getShaderParameter(fs, gl.COMPILE_STATUS);
  if(devMode && !fsOk){
    console.error(gl.getShaderInfoLog(fs));
  }
  const p=gl.createProgram();
  gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);
  const linkOk = gl.getProgramParameter(p, gl.LINK_STATUS);
  if(devMode && !linkOk){
    console.error(gl.getProgramInfoLog(p));
  }
  return p;
}

window.addEventListener('resize', resize);

function drawPoints(arr,color,size){
  if(arr.length===0)return;
  const verts=new Float32Array(arr.length*2);
  for(let i=0;i<arr.length;i++){
    const sx=(arr[i].x-0.5)/camFov+0.5;
    const sy=(arr[i].y-0.5)/camFov+0.5;
    verts[i*2]=sx*2-1;
    verts[i*2+1]=1-sy*2;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,verts,gl.STREAM_DRAW);
  gl.enableVertexAttribArray(locPos);
  gl.vertexAttribPointer(locPos,2,gl.FLOAT,false,0,0);
  gl.uniform3fv(locColor,color);
  gl.uniform1f(locSize,size);
  gl.drawArrays(gl.POINTS,0,arr.length);
}

function drawEnemies(arr,color,size){
  if(arr.length===0)return;
  const verts=new Float32Array(arr.length*2);
  for(let i=0;i<arr.length;i++){
    const sx=(arr[i].x-0.5)/camFov+0.5;
    const sy=(arr[i].y-0.5)/camFov+0.5;
    verts[i*2]=sx*2-1;
    verts[i*2+1]=1-sy*2;
  }
  gl.useProgram(enemyProgram);
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);
  gl.bufferData(gl.ARRAY_BUFFER,verts,gl.STREAM_DRAW);
  gl.enableVertexAttribArray(enemyLocPos);
  gl.vertexAttribPointer(enemyLocPos,2,gl.FLOAT,false,0,0);
  gl.uniform3fv(enemyLocColor,color);
  gl.uniform1f(enemyLocSize,size);
  gl.drawArrays(gl.POINTS,0,arr.length);
}

// enemyGroups: array of {color:[r,g,b], points:[{x,y},...]}
export function renderFrame(dt,bullets,enemyGroups,blood,items,map,bulletSize,mapCellSize,flashes=[]){
  time += dt;
  baseFov=getRules().FOV||1;
  const pulse = 0.5 + Math.sin(time*3.0)*0.5;
  if(glitch){
    glitchTime-=dt;
    if(glitchTime<=0) glitch=false;
    gl.clearColor(Math.random(),0,0.1,1);
  } else {
    gl.clearColor(0.02*pulse,0.02,0.02*pulse,1);
  }
  camFov += (targetFov*baseFov - camFov) * dt * 8.0;
  targetFov += (baseFov - targetFov) * dt * 2.0;
  gl.clear(gl.COLOR_BUFFER_BIT);
  const cellPixels = mapCellSize/camFov*canvas.height;
  drawPoints(map,[0.3,0.3,0.3],cellPixels);
  (enemyGroups||[]).forEach(g=>{
    const col=g.color||[0.6,0,0];
    drawEnemies(g.points,col,18.0);
  });
  drawPoints(bullets,[1,0,0.3],bulletSize);
  drawPoints(flashes,[1,0.8,0],bulletSize*2.0);
  drawPoints(items,[0,0.8,1.0],8.0);
  drawPoints(blood,[0.8*pulse,0,0],4.0);
}

export function setGlitch(state){
  glitch=state;glitchTime=1.5;
}
