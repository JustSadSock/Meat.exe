// 2D Simplex noise with deterministic seed. Based on Stefan Gustavson's algo
class SimplexNoise{
  constructor(seed=0){
    this.p=new Uint8Array(256);
    for(let i=0;i<256;i++)this.p[i]=i;
    let n=seed>>>0;
    for(let i=255;i>0;i--){
      n=(n*1664525+1013904223)>>>0;
      const r=n%(i+1);
      const t=this.p[i];this.p[i]=this.p[r];this.p[r]=t;
    }
  }
  noise2D(xin,yin){
    const grad3=[1,1,-1,1,1,-1,-1,-1,1,0,-1,0,0,1,0,-1];
    const F2=0.366025403,G2=0.211324865;
    let n0=0,n1=0,n2=0;
    const s=(xin+yin)*F2;
    let i=Math.floor(xin+s);let j=Math.floor(yin+s);
    const t=(i+j)*G2;
    const X0=i-t,Y0=j-t;
    const x0=xin-X0,y0=yin-Y0;
    let i1,j1;
    if(x0>y0){i1=1;j1=0;}else{i1=0;j1=1;}
    const x1=x0-i1+G2,y1=y0-j1+G2;
    const x2=x0-1+2*G2,y2=y0-1+2*G2;
    i&=255;j&=255;
    const gi0=this.p[i+this.p[j]]%8*2;
    const gi1=this.p[i+i1+this.p[j+j1]]%8*2;
    const gi2=this.p[i+1+this.p[j+1]]%8*2;
    let t0=0.5-x0*x0-y0*y0;
    if(t0>0){t0*=t0;n0=t0*t0*(grad3[gi0]*x0+grad3[gi0+1]*y0);} 
    let t1=0.5-x1*x1-y1*y1;
    if(t1>0){t1*=t1;n1=t1*t1*(grad3[gi1]*x1+grad3[gi1+1]*y1);} 
    let t2=0.5-x2*x2-y2*y2;
    if(t2>0){t2*=t2;n2=t2*t2*(grad3[gi2]*x2+grad3[gi2+1]*y2);} 
    return 70*(n0+n1+n2);
  }
}

let simplex=new SimplexNoise(0);
let worldSeed=0;
export function setSeed(s){
  simplex=new SimplexNoise(s);
  worldSeed=s>>>0;
}

function mulberry32(a){
  return function(){
    let t=a+=0x6D2B79F5;
    t=Math.imul(t^t>>>15,t|1);
    t^=t+Math.imul(t^t>>>7,t|61);
    return ((t^t>>>14)>>>0)/4294967296;
  };
}

function edgeOpen(cx,cy,dir){
  // dir:0=N,1=E,2=S,3=W
  let ax=cx,ay=cy,bx=cx,by=cy;
  if(dir===0) ay--;
  else if(dir===1) bx++;
  else if(dir===2) by++;
  else if(dir===3) ax--;
  let h=ax*73856093^ay*19349663^bx*83492791^by*1640531513^worldSeed;
  h=Math.imul(h^h>>>13,1274126177);
  return (h>>>15)&1;
}

function listFirst(set){
  for(const v of set) return v;
  return null;
}

export function generateOrgan(cx,cy){
  const cells=[];
  const cellSet=new Set();
  const SIZE=8; // cells per chunk side
  const baseX=cx*SIZE;
  const baseY=cy*SIZE;
  const rnd=mulberry32((cx*73856093^cy*19349663^worldSeed)>>>0);
  const roomCount=1+Math.floor(rnd()*2);
  const dig=(lx,ly)=>{const key=lx+','+ly;if(!cellSet.has(key)){cellSet.add(key);cells.push({x:baseX+lx,y:baseY+ly});}};
  const centers=[];
  let prevCenter=null;
  const connect=(a,b)=>{
    let x=a.x,y=a.y;
    while(x!==b.x){x+=Math.sign(b.x-x);dig(x,y);}
    while(y!==b.y){y+=Math.sign(b.y-y);dig(x,y);}
  };
  for(let i=0;i<roomCount;i++){
    const w=3+Math.floor(rnd()*3);
    const h=3+Math.floor(rnd()*3);
    const rx=Math.floor(rnd()*(SIZE-w));
    const ry=Math.floor(rnd()*(SIZE-h));
    for(let y=0;y<h;y++)for(let x=0;x<w;x++)dig(rx+x,ry+y);
    const center={x:rx+(w>>1),y:ry+(h>>1)};
    centers.push(center);
    if(prevCenter) connect(prevCenter,center);
    prevCenter=center;
  }
  // connect to edges
  const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
  const room=listFirst(cellSet);
  const [cxr,cyr]=room?room.split(',').map(Number):[Math.floor(SIZE/2),Math.floor(SIZE/2)];
  for(let i=0;i<4;i++){
    if(edgeOpen(cx,cy,i)){
      let x=cxr,y=cyr;
      while(x>=0&&x<SIZE&&y>=0&&y<SIZE){
        dig(x,y);
        x+=dirs[i][0];
        y+=dirs[i][1];
      }
    }
  }
  return cells;
}

// Helper for the Three.js renderer. Builds a tunnel mesh for a chunk.
export function generateTunnelMesh(cx,cy,THREE){
  const cells=generateOrgan(cx,cy);
  const group=new THREE.Group();
  const floorGeo=new THREE.PlaneGeometry(1,1);
  floorGeo.rotateX(-Math.PI/2);
  const wallGeo=new THREE.PlaneGeometry(1,2);
  const floorMat=new THREE.MeshStandardMaterial({color:0x772222, roughness:0.8, metalness:0.1, emissive:0x330000});
  const wallMat=new THREE.MeshStandardMaterial({color:0x773333, roughness:0.9, metalness:0.1, emissive:0x220000});
  const cellSet=new Set(cells.map(c=>c.x+','+c.y));
  for(const c of cells){
    const fx=c.x;
    const fz=c.y;
    const floor=new THREE.Mesh(floorGeo,floorMat);
    floor.position.set(fx,0,fz);
    group.add(floor);
    const dirs=[[1,0],[0,1],[-1,0],[0,-1]];
    for(let i=0;i<4;i++){
      const dx=dirs[i][0],dy=dirs[i][1];
      if(!cellSet.has((c.x+dx)+','+(c.y+dy))){
        const wall=new THREE.Mesh(wallGeo,wallMat);
        wall.position.set(fx+dx*0.5,1,fz+dy*0.5);
        wall.rotation.y=i===0?-Math.PI/2:i===2?Math.PI/2:i===1?Math.PI:0;
        group.add(wall);
      }
    }
  }
  group.userData.materials={floor:floorMat,wall:wallMat};
  return group;
}
