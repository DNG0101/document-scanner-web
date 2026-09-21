export const BACKUP_LIMITS = Object.freeze({
  maxDocuments: 500,
  maxPagesPerDocument: 500,
  maxTotalPages: 2000,
  maxImageBytes: 32 * 1024 * 1024,
  maxTotalImageBytes: 120 * 1024 * 1024,
  maxOcrTextCharsPerPage: 1_000_000,
  maxTotalOcrTextChars: 10_000_000,
  maxOcrWordsPerPage: 50_000,
  maxTotalOcrWords: 500_000,
  maxWordChars: 500,
  maxInkStrokesPerPage: 2_000,
  maxInkPointsPerStroke: 10_000,
  maxInkPointsPerPage: 100_000,
  maxTotalInkPoints: 500_000,
  maxTagsPerDocument: 100,
  maxTagChars: 100,
  maxFolderChars: 200,
  maxWatermarkChars: 200
});

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

function base64ByteLength(value) {
  if(!value || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error('Backup contains malformed base64 image data.');
  const padding=value.endsWith('==')?2:value.endsWith('=')?1:0;
  return value.length / 4 * 3 - padding;
}
function base64Prefix(value, count=12) {
  try {
    const binary=atob(value.slice(0,Math.ceil(count/3)*4));
    return Uint8Array.from(binary,c=>c.charCodeAt(0));
  } catch {
    throw new Error('Backup contains malformed base64 image data.');
  }
}
function matches(bytes, expected, offset=0) {return expected.every((value,index)=>bytes[offset+index]===value);}
export function imageDataUrlInfo(src) {
  if(typeof src!=='string') throw new Error('Backup contains an invalid image.');
  const match=src.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  if(!match) throw new Error('Backup contains an invalid or unsupported image.');
  const [,mime,payload]=match,bytes=base64ByteLength(payload);
  if(bytes>BACKUP_LIMITS.maxImageBytes) throw new Error(`A backup image exceeds ${Math.round(BACKUP_LIMITS.maxImageBytes/1024/1024)} MB.`);
  const head=base64Prefix(payload,12);
  const signatureOk=mime==='png' ? matches(head,[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])
    : mime==='jpeg' ? matches(head,[0xff,0xd8,0xff])
    : matches(head,[0x52,0x49,0x46,0x46])&&matches(head,[0x57,0x45,0x42,0x50],8);
  if(!signatureOk) throw new Error(`Backup image bytes do not match image/${mime}.`);
  return {mime,bytes};
}

export function validateBackup(value) {
  if(value?.format!=='papertrail-backup-v1'||!Array.isArray(value.documents)||value.documents.length>BACKUP_LIMITS.maxDocuments) throw new Error('Invalid Papertrail backup.');
  let totalPages=0,totalImageBytes=0,totalOcrTextChars=0,totalOcrWords=0,totalInkPoints=0;
  return value.documents.map(doc=>{
    if(typeof doc.name!=='string'||!Array.isArray(doc.pages)||!doc.pages.length||doc.pages.length>BACKUP_LIMITS.maxPagesPerDocument) throw new Error('Invalid document in backup.');
    totalPages+=doc.pages.length;
    if(totalPages>BACKUP_LIMITS.maxTotalPages) throw new Error(`Backup contains more than ${BACKUP_LIMITS.maxTotalPages} pages.`);
    const pages=doc.pages.map(p=>{
      const image=imageDataUrlInfo(p.src);totalImageBytes+=image.bytes;
      if(totalImageBytes>BACKUP_LIMITS.maxTotalImageBytes) throw new Error(`Backup image data exceeds ${Math.round(BACKUP_LIMITS.maxTotalImageBytes/1024/1024)} MB.`);
      if(!validCrop(p.crop)) throw new Error('Backup contains an invalid image crop.');
      let ocrText;
      if(typeof p.ocrText==='string') {
        if(p.ocrText.length>BACKUP_LIMITS.maxOcrTextCharsPerPage) throw new Error('A page contains too much OCR text.');
        totalOcrTextChars+=p.ocrText.length;
        if(totalOcrTextChars>BACKUP_LIMITS.maxTotalOcrTextChars) throw new Error('Backup contains too much OCR text.');
        ocrText=p.ocrText;
      }
      let ocrWords;
      if(Array.isArray(p.ocrWords)) {
        if(p.ocrWords.length>BACKUP_LIMITS.maxOcrWordsPerPage) throw new Error('A page contains too many OCR words.');
        totalOcrWords+=p.ocrWords.length;
        if(totalOcrWords>BACKUP_LIMITS.maxTotalOcrWords) throw new Error('Backup contains too many OCR words.');
        ocrWords=p.ocrWords.filter(w=>typeof w.text==='string'&&w.text.length<=BACKUP_LIMITS.maxWordChars&&['x','y','w','h'].every(k=>Number.isFinite(w[k]))&&w.x>=0&&w.y>=0&&w.w>0&&w.h>0&&w.x+w.w<=1&&w.y+w.h<=1).map(({text,x,y,w,h})=>({text,x,y,w,h}));
      }
      let ink=[];
      if(Array.isArray(p.ink)) {
        if(p.ink.length>BACKUP_LIMITS.maxInkStrokesPerPage) throw new Error('A page contains too many annotation strokes.');
        if(p.ink.some(s=>Array.isArray(s?.points)&&s.points.length>BACKUP_LIMITS.maxInkPointsPerStroke)) throw new Error('An annotation stroke contains too many points.');
        let pagePoints=0;
        ink=p.ink.filter(s=>typeof s.color==='string'&&s.color.length<=64&&Number.isFinite(s.width)&&s.width>0&&s.width<=50&&Array.isArray(s.points)&&s.points.length<=BACKUP_LIMITS.maxInkPointsPerStroke&&s.points.every(pt=>Array.isArray(pt)&&pt.length===2&&pt.every(n=>Number.isFinite(n)&&n>=0&&n<=100))).map(s=>{pagePoints+=s.points.length;return {color:s.color,width:s.width,points:s.points.map(point=>[...point])};});
        if(pagePoints>BACKUP_LIMITS.maxInkPointsPerPage) throw new Error('A page contains too many annotation points.');
        totalInkPoints+=pagePoints;
        if(totalInkPoints>BACKUP_LIMITS.maxTotalInkPoints) throw new Error('Backup contains too many annotation points.');
      }
      return {name:String(p.name||'Page').slice(0,200),src:p.src,crop:structuredClone(p.crop),rotation:[0,90,180,270].includes(p.rotation)?p.rotation:0,filter:['original','clean','warm','mono'].includes(p.filter)?p.filter:'original',brightness:Math.max(70,Math.min(135,Number(p.brightness)||100)),contrast:Math.max(70,Math.min(140,Number(p.contrast)||100)),ocrText,ocrWords,ink};
    });
    const opts=doc.pdfOptions||{};
    const tags=Array.isArray(doc.tags)?doc.tags.filter(t=>typeof t==='string').slice(0,BACKUP_LIMITS.maxTagsPerDocument).map(t=>t.slice(0,BACKUP_LIMITS.maxTagChars)):[];
    return {name:doc.name.slice(0,200),pages,mode:'document',tags,folder:typeof doc.folder==='string'?doc.folder.slice(0,BACKUP_LIMITS.maxFolderChars):undefined,watermark:typeof doc.watermark==='string'?doc.watermark.slice(0,BACKUP_LIMITS.maxWatermarkChars):undefined,
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
