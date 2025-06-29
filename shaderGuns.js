export let guns=[{
  name:'Pew',
  fragSrc:`precision highp float;
  void main(){
    gl_FragColor=vec4(1.0,0.0,0.25,1.0); // neon red bullet
  }`,
  cooldown:0.2,
  energyCost:1,
  lvl:1
}];

export function reloadShader(src){
  guns[0].fragSrc=src;
  // Реальный hot-reload шейдера для демки не реализован
}
