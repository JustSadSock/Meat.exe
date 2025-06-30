// Simplified WebGL engine. Zayebis'.
let gl, canvas, devMode;
let glitch = false, glitchTime=0;
let program, buf, locPos, locColor, locSize;

export function initEngine(g,c,dev){
  gl=g;canvas=c;devMode=dev;
  resize();
  const vs=`#version 300 es\nprecision mediump float;\nin vec2 a_pos;\nuniform float u_size;\nvoid main(){gl_Position=vec4(a_pos*2.0-1.0,0.0,1.0);gl_PointSize=u_size;}`;
  const fs=`#version 300 es\nprecision mediump float;\nuniform vec3 u_color;\nout vec4 outColor;\nvoid main(){outColor=vec4(u_color,1.0);}`;
  program=makeProgram(vs,fs);
  locPos=gl.getAttribLocation(program,'a_pos');
  locColor=gl.getUniformLocation(program,'u_color');
  locSize=gl.getUniformLocation(program,'u_size');
  buf=gl.createBuffer();
  gl.clearColor(0,0,0,1);
}

function resize(){
  canvas.width = window.innerWidth * devicePixelRatio;
  canvas.height = window.innerHeight * devicePixelRatio;
  gl.viewport(0,0,canvas.width,canvas.height);
}

function makeProgram(vsSrc,fsSrc){
  const vs=gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs,vsSrc);gl.compileShader(vs);
  const fs=gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs,fsSrc);gl.compileShader(fs);
  const p=gl.createProgram();
  gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);
  return p;
}

window.addEventListener('resize', resize);

function drawPoints(arr,color,size){
  if(arr.length===0)return;
  const verts=new Float32Array(arr.length*2);
  for(let i=0;i<arr.length;i++){
    verts[i*2]=arr[i].x*2-1;
    verts[i*2+1]=1-arr[i].y*2;
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

export function renderFrame(dt,bullets,enemies,blood){
  if(glitch){
    glitchTime-=dt;
    if(glitchTime<=0) glitch=false;
    gl.clearColor(Math.random(),0,0.1,1);
  } else {
    gl.clearColor(0.02,0.02,0.02,1);
  }
  gl.clear(gl.COLOR_BUFFER_BIT);
  drawPoints(enemies,[0,1,0],16.0);
  drawPoints(bullets,[1,0,0.3],8.0);
  drawPoints(blood,[0.8,0,0],4.0);
}

export function setGlitch(state){
  glitch=state;glitchTime=1.5;
}
