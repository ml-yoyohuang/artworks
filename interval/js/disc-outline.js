import * as T from '../../showroom/vendor/three/build/three.module.js';
// Apply after the original surface deformation. The opening remains anchored.
export function deformOutline(film,time){
 const {mesh,segments,rows}=film,points=mesh.geometry.attributes.position;
 for(let i=0;i<points.count;i++){
  const u=Math.floor(i/(segments+1))/rows,a=(i%(segments+1))/segments*Math.PI*2;
  const strength=u*u*(3-2*u);
  const scale=1+strength*(.105*Math.sin(a*2+time*.31)+.055*Math.sin(a*3-time*.23+1.2));
  points.setXY(i,points.getX(i)*scale,points.getY(i)*scale);
 }
 points.needsUpdate=true;mesh.geometry.computeVertexNormals();
 const normals=mesh.geometry.attributes.normal,n=new T.Vector3();
 for(let row=0;row<=rows;row++){const first=row*(segments+1),last=first+segments;n.set(normals.getX(first)+normals.getX(last),normals.getY(first)+normals.getY(last),normals.getZ(first)+normals.getZ(last)).normalize();normals.setXYZ(first,n.x,n.y,n.z);normals.setXYZ(last,n.x,n.y,n.z);}normals.needsUpdate=true;
}
