export function AABB(x,y,w,h){
  return {x,y,w,h};
}

export function circleVsCircle(a,b){
  const dx=a.x-b.x, dy=a.y-b.y;
  const r=a.r+b.r;
  return dx*dx+dy*dy<r*r;
}

export function circleVsAABB(c,a){
  const cx=Math.max(a.x,Math.min(c.x,a.x+a.w));
  const cy=Math.max(a.y,Math.min(c.y,a.y+a.h));
  const dx=c.x-cx, dy=c.y-cy;
  return dx*dx+dy*dy<c.r*c.r;
}

export function circleInsideAABB(c,a){
  return c.x-c.r>=a.x && c.x+c.r<=a.x+a.w &&
         c.y-c.r>=a.y && c.y+c.r<=a.y+a.h;
}

export function clampCircleToAABB(c,a){
  c.x=Math.max(a.x+c.r,Math.min(a.x+a.w-c.r,c.x));
  c.y=Math.max(a.y+c.r,Math.min(a.y+a.h-c.r,c.y));
}
