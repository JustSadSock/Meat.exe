// Встроенный simplex noise
function noise(x,y){
  return Math.sin(x*12.9898+y*78.233)*43758.5453%1;
}

export function generateOrgan(cx,cy){
  // Placeholder: возвращает массив комнат
  const seed = noise(cx,cy)*1000;
  let rooms=[];
  for(let i=0;i<8;i++){
    rooms.push({x:cx+i*4+noise(seed,i)*2,y:cy+i*3});
  }
  return rooms;
}
