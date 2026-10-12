import {neighbors} from '../sources/sound4/models/echo.js';
// A simple shortest corridor route to the most distant reachable cell.
export function forwardRoute(maze,start){
  const queue=[start.slice()],previous=new Map([[String(start),null]]);let far=start;
  for(let i=0;i<queue.length;i++){
    const cell=queue[i];far=cell;
    for(const next of neighbors(maze,cell))if(!previous.has(String(next))){previous.set(String(next),cell);queue.push(next);}
  }
  const path=[];for(let c=far;c;c=previous.get(String(c)))path.push(c.slice());
  return path.reverse();
}
