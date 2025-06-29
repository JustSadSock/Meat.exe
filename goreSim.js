let blood=[];

export function spawnBlood(x,y){
  for(let i=0;i<10;i++)
    blood.push({x,y,life:1,dx:(Math.random()-0.5)*0.01,dy:(Math.random()-0.5)*0.01});
}

export function updateBlood(dt){
  const ctx=document.getElementById('gl').getContext('2d');
  ctx.fillStyle='rgba(255,0,0,0.8)';
  blood.forEach(p=>{
    p.x+=p.dx; p.y+=p.dy; p.life-=dt;
    ctx.globalAlpha=p.life;
    ctx.fillRect(p.x*window.innerWidth,p.y*window.innerHeight,2,2);
  });
  blood=blood.filter(p=>p.life>0);
}
