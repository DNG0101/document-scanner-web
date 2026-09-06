// All coordinates are percentages of the page. The same canvas draws editor and saved output.
export function clampLayer(layer) {
  const bounded=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
  const w=bounded(layer.w,1,100),h=bounded(layer.h,1,100);
  return {...layer,w,h,x:bounded(layer.x,0,100-w),y:bounded(layer.y,0,100-h),size:bounded(layer.size??3,0.5,20),opacity:bounded(layer.opacity??1,0,1)};
}
export function validateLayout(value) {
  const image=s=>typeof s==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s);
  if(!value||!Number.isInteger(value.width)||!Number.isInteger(value.height)||value.width<1||value.height<1||value.width*value.height>24000000||!Array.isArray(value.layers)||value.layers.length>100)throw Error('Invalid page layout.');
  return {width:value.width,height:value.height,layers:value.layers.map(l=>{
    if(!['image','text','cover'].includes(l.type)||['x','y','w','h'].some(k=>!Number.isFinite(l[k])))throw Error('Invalid layout object.');
    if(l.type==='image'&&!image(l.src))throw Error('Invalid layout image.');
    return clampLayer({id:String(l.id),type:l.type,...(l.type==='image'?{src:l.src}:{}),text:String(l.text||'').slice(0,10000),x:l.x,y:l.y,w:l.w,h:l.h,size:l.size,opacity:l.opacity,font:['sans-serif','serif','monospace'].includes(l.font)?l.font:'sans-serif',bold:!!l.bold,italic:!!l.italic,underline:!!l.underline,align:['left','center','right'].includes(l.align)?l.align:'left',color:/^#[a-f0-9]{6}$/i.test(l.color)?l.color:'#172f32',background:/^#[a-f0-9]{6}$/i.test(l.background)?l.background:'#ffffff'});
  })};
}
export function textLines(ctx,text,width) {
  const lines=[];
  for(const paragraph of text.split('\n')) {
    let line='';for(const char of paragraph){if(line&&ctx.measureText(line+char).width>width){lines.push(line);line='';}line+=char;}lines.push(line);
  }return lines;
}
export async function drawLayout(canvas,layout) {
  canvas.width=layout.width;canvas.height=layout.height;
  const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
  const overflow=[];
  for(const raw of layout.layers){const l=clampLayer(raw),x=l.x*canvas.width/100,y=l.y*canvas.height/100,w=l.w*canvas.width/100,h=l.h*canvas.height/100;
    ctx.save();ctx.globalAlpha=l.opacity;
    if(l.type==='image'){const img=new Image();img.src=l.src;await img.decode();ctx.drawImage(img,x,y,w,h);}
    else if(l.type==='cover'){ctx.fillStyle=l.background||'#ffffff';ctx.fillRect(x,y,w,h);}
    else {const size=l.size*canvas.width/100;ctx.font=`${l.italic?'italic ':''}${l.bold?'bold ':''}${size}px ${l.font||'sans-serif'}`;ctx.textBaseline='top';ctx.fillStyle=l.color||'#172f32';ctx.textAlign=l.align||'left';
      const lines=textLines(ctx,l.text||'',w),lineHeight=size*1.25;if(lines.length*lineHeight>h+0.1)overflow.push(l.id);
      ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
      lines.forEach((line,i)=>{const px=x+(l.align==='center'?w/2:l.align==='right'?w:0),py=y+i*lineHeight;ctx.fillText(line,px,py);if(l.underline){const tw=ctx.measureText(line).width;ctx.fillRect(px-(l.align==='center'?tw/2:l.align==='right'?tw:0),py+size,tw,Math.max(1,size/18));}});
    }ctx.restore();
  }return overflow;
}
