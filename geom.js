export function AABB(x,y,w,h){
  return {x,y,w,h};
}

export function circleVsCircle(a,b){
  const dx=a.x-b.x, dy=a.y-b.y;
  return dx*dx+dy*dy <= (a.r+b.r)**2;
}

export function circleVsAABB(c,a){
  const nx=Math.max(a.x,Math.min(c.x,a.x+a.w));
  const ny=Math.max(a.y,Math.min(c.y,a.y+a.h));
  return (c.x-nx)**2 + (c.y-ny)**2 <= c.r**2;
}

export function circleInsideAABB(c,a){
  return c.x-c.r>=a.x && c.x+c.r<=a.x+a.w &&
         c.y-c.r>=a.y && c.y+c.r<=a.y+a.h;
}

export function clampCircleToAABB(c,a){
  c.x=Math.max(a.x+c.r,Math.min(c.x,a.x+a.w-c.r));
  c.y=Math.max(a.y+c.r,Math.min(c.y,a.y+a.h-c.r));
}
