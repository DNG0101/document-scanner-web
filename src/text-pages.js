import {canvasBlob,fullCrop} from './document-tools.js';

export function wrapNotes(text,measure,maxWidth=1060,linesPerPage=37){
  if(!text.trim())throw Error('Enter some text.');
  const lines=[];
  for(const paragraph of text.replace(/\r\n?/g,'\n').split('\n')){
    let line='';
    for(const char of paragraph){
      if(line&&measure(line+char)>maxWidth){lines.push(line);line='';}
      line+=char;
    }
    lines.push(line);
  }
  const pages=[];for(let i=0;i<lines.length;i+=linesPerPage)pages.push(lines.slice(i,i+linesPerPage));
  return pages;
}

export async function notePages(text,readImage){
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1700;
  const ctx=canvas.getContext('2d');ctx.font='28px sans-serif';
  const groups=wrapNotes(text,s=>ctx.measureText(s).width),pages=[];
  for(const [i,lines] of groups.entries()){
    ctx.fillStyle='white';ctx.fillRect(0,0,1200,1700);ctx.fillStyle='#17363a';ctx.font='28px sans-serif';
    lines.forEach((line,n)=>ctx.fillText(line,60,70+n*42));
    const src=await readImage(new File([await canvasBlob(canvas)],`Notes ${i+1}.png`,{type:'image/png'}));
    pages.push({name:`Notes ${i+1}`,src,crop:fullCrop(),rotation:0,filter:'original',brightness:100,contrast:100,ink:[],ocrText:lines.join('\n'),ocrWords:lines.flatMap((text,n)=>text?[{text,x:.05,y:(43+n*42)/1700,w:ctx.measureText(text).width/1200,h:28/1700}]:[])});
  }
  return pages;
}

export function dragRegion(start,end){
  const clamp=v=>Math.max(0,Math.min(100,v));
  const [a,b]=start.map(clamp),[x,y]=end.map(clamp);
  return {x:Math.min(a,x),y:Math.min(b,y),w:Math.abs(x-a),h:Math.abs(y-b)};
}
