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
    p.x+=p.dx; p.y+=p.dy; p.life-=dt;
    if(p.state==='burning') p.life-=dt*0.5;
    if(p.state==='frozen') p.life-=dt*0.2;
    if(p.state==='acidic') p.life-=dt*0.3;
  });
  blood=blood.filter(p=>p.life>0);
}

export function getBlood(){
  return blood;
}
