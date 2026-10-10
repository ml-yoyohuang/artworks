// Eye anchors retain their original centres; size changes around those anchors.
function drawJellyCollisionFace(ctx,{eyeScale=.85,eyeGap=30,eyeY=0,mouthY=-4,mouthWidth=14,strokeWidth=3}={}){
 ctx.save();ctx.strokeStyle='#303d36';ctx.lineWidth=strokeWidth;ctx.lineCap='round';ctx.lineJoin='round';
 const left=104.5-eyeGap/2,right=104.5+eyeGap/2;
 for(const [cx,direction] of [[left,1],[right,-1]]){
  ctx.beginPath();ctx.moveTo(cx-direction*6.5*eyeScale,4+eyeY-7*eyeScale);
  ctx.lineTo(cx+direction*6.5*eyeScale,4+eyeY);
  ctx.lineTo(cx-direction*6.5*eyeScale,4+eyeY+7*eyeScale);ctx.stroke();
 }
 ctx.beginPath();ctx.moveTo(104-mouthWidth/2,22+mouthY);ctx.lineTo(104+mouthWidth/2,22+mouthY);ctx.stroke();ctx.restore();
}
