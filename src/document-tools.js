import {validateLayout} from './layout.js';
export const fullCrop = () => ({tl:[0,0],tr:[100,0],br:[100,100],bl:[0,100]});
export function pageSelection(text, count) {
  if(!text.trim()) return Array.from({length:count},(_,i)=>i);
  const pages=[];
  for(const part of text.split(',')) {
    const match=part.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if(!match) throw new Error('Use page numbers such as 1,3-5.');
    const start=Number(match[1]),end=Number(match[2]||match[1]);
    if(start<1||end>count||start>end) throw new Error(`Choose pages between 1 and ${count}, in ascending ranges.`);
    for(let n=start;n<=end;n++) if(!pages.includes(n-1)) pages.push(n-1);
  }
  return pages;
}
export function validCrop(crop) {
  if(!crop) return false;
  const points=['tl','tr','br','bl'].map(k=>crop[k]);
  if(points.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||v<0||v>100))) return false;
  return points.every((p,i)=>{
    const q=points[(i+1)%4],r=points[(i+2)%4];
    return (q[0]-p[0])*(r[1]-q[1])-(q[1]-p[1])*(r[0]-q[0])>0.1;
  });
}
export function csvFromText(text) {
  return text.split(/\r?\n/).map(row=>row.split(/\t| {2,}/).map(cell=>{
    const safe=/^[=+@\-]/.test(cell.trimStart()) ? "'"+cell : cell;
    return '"'+safe.replaceAll('"','""')+'"';
  }).join(',')).join('\r\n');
}
export function validateBackup(value) {
  if(value?.format!=='papertrail-backup-v1'||!Array.isArray(value.documents)||value.documents.length>500) throw new Error('Invalid Papertrail backup.');
  return value.documents.map(doc=>{
    if(typeof doc.name!=='string'||!Array.isArray(doc.pages)||!doc.pages.length||doc.pages.length>500) throw new Error('Invalid document in backup.');
    const pages=doc.pages.map(p=>{
      if(typeof p.src!=='string'||!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p.src)||!validCrop(p.crop)) throw new Error('Backup contains an invalid image or crop.');
      return {name:String(p.name||'Page').slice(0,200),src:p.src,crop:p.crop,rotation:[0,90,180,270].includes(p.rotation)?p.rotation:0,filter:['original','clean','warm','mono'].includes(p.filter)?p.filter:'original',brightness:Math.max(70,Math.min(135,Number(p.brightness)||100)),contrast:Math.max(70,Math.min(140,Number(p.contrast)||100)),ocrText:typeof p.ocrText==='string'?p.ocrText:undefined,
      ocrWords:Array.isArray(p.ocrWords)?p.ocrWords.filter(w=>typeof w.text==='string'&&['x','y','w','h'].every(k=>Number.isFinite(w[k])&&w[k]>=0&&w[k]<=1)).map(({text,x,y,w,h})=>({text,x,y,w,h})):undefined,
      ...(p.composition?{composition:validateLayout(p.composition)}:{}),
      ink:Array.isArray(p.ink)?p.ink.filter(s=>typeof s.color==='string'&&Number.isFinite(s.width)&&Array.isArray(s.points)&&s.points.every(pt=>Array.isArray(pt)&&pt.length===2&&pt.every(n=>Number.isFinite(n)&&n>=0&&n<=100))):[]};
    });
    const opts=doc.pdfOptions||{};
    return {name:doc.name.slice(0,200),pages,mode:'document',tags:Array.isArray(doc.tags)?doc.tags.filter(t=>typeof t==='string'):[],folder:typeof doc.folder==='string'?doc.folder:undefined,watermark:typeof doc.watermark==='string'?doc.watermark:undefined,
      pdfOptions:{searchable:opts.searchable===true,pageNumbers:opts.pageNumbers===true,idSheet:opts.idSheet===true,margin:Number.isFinite(opts.margin)?Math.max(0,Math.min(100,opts.margin)):18,size:['A4','Letter','Legal'].includes(opts.size)?opts.size:'A4',orientation:opts.orientation==='Landscape'?'Landscape':'Portrait'}};
  });
}
export function download(blob,name) {
  const url=URL.createObjectURL(blob),a=document.createElement('a'); a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export async function canvasBlob(canvas,type='image/png',quality=.92) {
  return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Image encoding failed.')),type,quality));
}
export async function imageFromBytes(bytes) {return createImageBitmap(new Blob([bytes],{type:'image/jpeg'}));}
export function regionPixels(region,width,height){
  if(['x','y','w','h'].some(k=>!Number.isFinite(region[k])||region[k]<0)||region.w<=0||region.h<=0||region.x+region.w>100||region.y+region.h>100)throw Error('The rectangle must fit inside the page.');
  const x=Math.floor(region.x*width/100),y=Math.floor(region.y*height/100);
  return {x,y,w:Math.ceil((region.x+region.w)*width/100)-x,h:Math.ceil((region.y+region.h)*height/100)-y};
}
