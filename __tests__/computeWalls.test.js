import { generateOrgan, edgeOpen, edgeCoord, CELLS_PER_CHUNK } from '../organGen.js';
import { computeWalls } from '../map3d.js';

function findWall(walls, target){
  return walls.some(w => w.x===target.x && w.y===target.y && w.w===target.w && w.h===target.h);
}

describe('computeWalls', () => {
  test('limits walls per cell', () => {
    const cx=0, cy=0;
    const cells=generateOrgan(cx,cy);
    const walls=computeWalls(cells,cx,cy);
    expect(walls.length).toBeLessThanOrEqual(cells.length*4);
  });

  test('respects edge openings', () => {
    const cx=0, cy=0;
    const cells=generateOrgan(cx,cy);
    const walls=computeWalls(cells,cx,cy);
    const SIZE=CELLS_PER_CHUNK;
    const edgeCoords=[edgeCoord(cx,cy,0),edgeCoord(cx,cy,1),edgeCoord(cx,cy,2),edgeCoord(cx,cy,3)];
    const edgeOpenings=[edgeOpen(cx,cy,0),edgeOpen(cx,cy,1),edgeOpen(cx,cy,2),edgeOpen(cx,cy,3)];
    const W=0.1;
    if(edgeOpenings[0]){
      const x=edgeCoords[0]+cx*SIZE;
      const y=cy*SIZE;
      const expected={x:x-0.5,y:y-0.5-W,w:1,h:W};
      expect(findWall(walls, expected)).toBe(false);
    }
    if(edgeOpenings[1]){
      const x=cx*SIZE+SIZE-1;
      const y=edgeCoords[1]+cy*SIZE;
      const expected={x:x-0.5+1,y:y-0.5,w:W,h:1};
      expect(findWall(walls, expected)).toBe(false);
    }
    if(edgeOpenings[2]){
      const x=edgeCoords[2]+cx*SIZE;
      const y=cy*SIZE+SIZE-1;
      const expected={x:x-0.5,y:y-0.5+1,w:1,h:W};
      expect(findWall(walls, expected)).toBe(false);
    }
    if(edgeOpenings[3]){
      const x=cx*SIZE;
      const y=edgeCoords[3]+cy*SIZE;
      const expected={x:x-0.5-W,y:y-0.5,w:W,h:1};
      expect(findWall(walls, expected)).toBe(false);
    }
  });
});
