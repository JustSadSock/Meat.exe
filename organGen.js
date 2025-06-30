// Встроенный simplex noise
function noise(x,y){
  return Math.sin(x*12.9898+y*78.233)*43758.5453%1;
}

export function generateOrgan(cx,cy){
  const templates=[
    [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:2,y:1}],
    [{x:0,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1}],
    [{x:1,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1}],
    [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:1,y:2}]
  ];
  const seed=Math.floor(noise(cx,cy)*templates.length);
  return templates[seed].map(r=>({x:cx+r.x,y:cy+r.y}));
}
