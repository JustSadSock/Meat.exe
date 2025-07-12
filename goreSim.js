import { getRules } from './metaMutate.js';
let blood=[];
let playerRef=null;

export function bindPlayer(obj){
  playerRef=obj;
}

export function spawnBlood(x,y,state='normal',amount=10){
  for(let i=0;i<amount;i++)
    blood.push({x,y,life:1,state,dx:(Math.random()-0.5)*0.01,dy:(Math.random()-0.5)*0.01});
  const limit=getRules().bloodLimit||500;
  if(blood.length>limit){
    const excess=blood.length-limit;
    for(let i=0;i<excess;i++){
      blood[i].life*=0.5;
      if(playerRef){
        const regen=getRules().regen||0;
        playerRef.hp=Math.min(100,playerRef.hp+0.1*regen);
      }
    }
    blood.splice(0,excess);
  }
}

export function updateBlood(dt){
  blood.forEach(p=>{
    p.x+=p.dx*dt; p.y+=p.dy*dt; p.life-=dt;
    if(p.state==='burning') p.life-=dt*0.5;
    if(p.state==='frozen') p.life-=dt*0.2;
    if(p.state==='acidic') p.life-=dt*0.3;
  });
  blood=blood.filter(p=>p.life>0);
}

export function getBlood(){
  return blood;
}

export function applyBloodEffects(enemies, player, dt){
  const r2 = 0.0025; // radius^2 for effect area
  for(const b of blood){
    if(b.state==='normal') continue;
    for(const e of enemies){
      const dx=e.x-b.x, dy=e.y-b.y;
      if(dx*dx+dy*dy<r2){
        if(b.state==='burning') e.hp-=dt*5;
        else if(b.state==='acidic') e.hp-=dt*3;
        else if(b.state==='frozen') e.speed*=0.9;
      }
    }
    if(player){
      const dx=player.x-b.x, dy=player.y-b.y;
      if(dx*dx+dy*dy<r2){
        if(b.state==='burning' || b.state==='acidic') player.hp-=dt*2;
      }
    }
  }
}
