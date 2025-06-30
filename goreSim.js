let blood=[];

export function spawnBlood(x,y){
  for(let i=0;i<10;i++)
    blood.push({x,y,life:1,dx:(Math.random()-0.5)*0.01,dy:(Math.random()-0.5)*0.01});
}

export function updateBlood(dt){
  blood.forEach(p=>{
    p.x+=p.dx; p.y+=p.dy; p.life-=dt;
  });
  blood=blood.filter(p=>p.life>0);
}

export function getBlood(){
  return blood;
}
