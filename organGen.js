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
export function setSeed(s){
  simplex=new SimplexNoise(s);
}

export function generateOrgan(cx,cy){
  const t=[
    // простые кишки и развилки
    [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0}],
    [{x:0,y:0},{x:0,y:1},{x:0,y:2},{x:1,y:2}],
    [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:2,y:1}],
    [{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:2,y:0}],
    [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:1,y:1}],
    [{x:1,y:0},{x:2,y:0},{x:2,y:1},{x:3,y:1}],
    [{x:0,y:0},{x:0,y:1},{x:1,y:1},{x:1,y:2}],
    [{x:0,y:1},{x:1,y:1},{x:1,y:0},{x:2,y:0}],
    [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:1,y:2},{x:2,y:2}],
    [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:2,y:1},{x:3,y:1}],
    [{x:0,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:2,y:2}],
    [{x:1,y:0},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:3,y:2}],
    [{x:0,y:2},{x:1,y:2},{x:1,y:1},{x:2,y:1},{x:3,y:1}],
    [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:1,y:1},{x:2,y:1}],
    [{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:1,y:0},{x:2,y:0}],
    [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:1,y:2},{x:2,y:1}],
    [{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:2,y:0},{x:2,y:2}],
    [{x:0,y:0},{x:0,y:1},{x:0,y:2},{x:1,y:1},{x:2,y:1}],
    [{x:1,y:0},{x:2,y:0},{x:1,y:1},{x:0,y:1},{x:2,y:1}],
    [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:1,y:1},{x:1,y:2}],
    [{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:1,y:0},{x:1,y:2}],
    [{x:0,y:0},{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:1,y:2}],
    [{x:1,y:0},{x:2,y:0},{x:2,y:1},{x:2,y:2},{x:1,y:1}],
    [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:2,y:1},{x:2,y:2}],
    [{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:2,y:1},{x:3,y:1}],
    [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:1,y:1},{x:0,y:1}],
    [{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:1,y:0},{x:2,y:0}],
    [{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:1,y:1},{x:2,y:1}],
    [{x:0,y:0},{x:0,y:1},{x:0,y:2},{x:1,y:2},{x:2,y:2}],
    [{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:2,y:1},{x:3,y:1}],
    [{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:2,y:1}],
    [{x:0,y:1},{x:1,y:1},{x:2,y:1},{x:3,y:1},{x:1,y:0}]
  ];
  const idx=Math.floor((simplex.noise2D(cx*0.1,cy*0.1)+1)/2*t.length)%t.length;
  return t[idx].map(r=>({x:cx+r.x,y:cy+r.y}));
}
