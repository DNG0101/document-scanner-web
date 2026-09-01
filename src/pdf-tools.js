import * as PDFKit from 'pdfkit';
import Helvetica from 'pdfkit/standard-fonts/Helvetica';
import {PDFDocument,degrees,rgb,StandardFonts} from 'pdf-lib';
import {pageSelection} from './document-tools.js';
const Writer=PDFKit.PDFDocument;
PDFKit.registerStdFonts?.(Helvetica);
const sizes={A4:[595.28,841.89],Letter:[612,792],Legal:[612,1008]};
export function pdfSettings(options={}) {
  let [width,height]=sizes[options.size]||sizes.A4;
  if(options.orientation==='Landscape')[width,height]=[height,width];
  const margin=Number(options.margin??18),quality=Number(options.quality??.88);
  if(!Number.isFinite(margin)||margin<0||margin>100)throw Error('PDF margin must be between 0 and 100 points.');
  if(!Number.isFinite(quality)||quality<.3||quality>1)throw Error('JPEG quality must be between 0.3 and 1.');
  if(options.password&&(typeof options.password!=='string'||new TextEncoder().encode(options.password).length>127))throw Error('Password must be at most 127 UTF-8 bytes.');
  return {...options,width,height,margin,quality};
}
let fontsPromise;
async function fonts(){return fontsPromise??=(Promise.all(['NotoSans','NotoSansDevanagari'].map(async name=>{const response=await fetch(new URL(`./fonts/${name}.ttf`,import.meta.url));if(!response.ok)throw Error('Could not load local OCR fonts.');return new Uint8Array(await response.arrayBuffer());})).catch(error=>{fontsPromise=null;throw error;}));}
export function ocrTokens(data,width,height){
  const words=(data.blocks||[]).flatMap(b=>(b.paragraphs||[]).flatMap(p=>(p.lines||[]).flatMap(l=>l.words||[])));
  return {ocrText:data.text.trim(),ocrWords:words.filter(w=>w.text?.trim()&&w.bbox).map(w=>({text:w.text,x:w.bbox.x0/width,y:w.bbox.y0/height,w:(w.bbox.x1-w.bbox.x0)/width,h:(w.bbox.y1-w.bbox.y0)/height}))};
}
export async function createScanPdf(document,render,options={}) {
  if(!document.pages?.length)throw Error('Add a page before exporting.');
  const settings=pdfSettings({...document.pdfOptions,...options});
  if(settings.searchable&&document.pages.some(p=>!p.ocrText?.trim()))throw Error('Run OCR for every selected page before searchable PDF export.');
  if(settings.idSheet&&(document.pages.length>2||settings.searchable))throw Error('ID sheet requires one or two pages and searchable PDF switched off.');
  const fontData=settings.searchable?(options.fonts||await fonts()):null;
  const pdf=new Writer({autoFirstPage:false,font:'Helvetica',pdfVersion:'1.7ext3',userPassword:settings.password||undefined,info:{Title:document.name||'Scan',Creator:'Papertrail'},compress:true});
  const chunks=[];const output=new Promise((resolve,reject)=>{pdf.on('data',chunk=>chunks.push(chunk));pdf.on('end',()=>resolve(new Blob(chunks,{type:'application/pdf'})));pdf.on('error',reject);});
  // Observe stream errors even if an image/render operation throws before awaiting output.
  output.catch(()=>{});
  if(fontData){pdf.registerFont('Noto',fontData[0]);pdf.registerFont('Devanagari',fontData[1]);}
  if(settings.idSheet)pdf.addPage({size:sizes.A4,margin:0});
  try{
    for(let i=0;i<document.pages.length;i++){
      if(settings.signal?.aborted)throw new DOMException('Export cancelled.','AbortError');
      const page=document.pages[i],image=await render(page,{watermark:document.watermark,quality:settings.quality});
      if(!settings.idSheet)pdf.addPage({size:[settings.width,settings.height],margin:0});
      const box=settings.idSheet?{x:(sizes.A4[0]-85.6*72/25.4)/2,y:120+i*210,w:85.6*72/25.4,h:54*72/25.4}:{x:settings.margin,y:settings.margin,w:settings.width-2*settings.margin,h:settings.height-2*settings.margin-(settings.pageNumbers?16:0)};
      const scale=Math.min(box.w/image.width,box.h/image.height),w=image.width*scale,h=image.height*scale,x=box.x+(box.w-w)/2,y=box.y+(box.h-h)/2;
      pdf.image(image.bytes,x,y,{width:w,height:h});
      if(settings.searchable){
        const tokens=page.ocrWords?.length?page.ocrWords:page.ocrText.split(/\r?\n/).filter(Boolean).map((text,n,lines)=>({text,x:0,y:n/Math.max(lines.length,1),w:1,h:Math.min(.04,1/lines.length)}));
        for(const token of tokens){
          if(![token.x,token.y,token.w,token.h].every(Number.isFinite)||token.w<=0||token.h<=0)continue;
          pdf.save().fillOpacity(0).font(/[\u0900-\u097f]/.test(token.text)?'Devanagari':'Noto').fontSize(Math.max(1,token.h*h*.85));
          const textWidth=pdf.widthOfString(token.text)||1;
          pdf.text(token.text,x+token.x*w,y+token.y*h,{lineBreak:false,horizontalScaling:token.w*w/textWidth*100});pdf.restore();
        }
      }
      if(settings.pageNumbers&&!settings.idSheet)pdf.font('Helvetica').fontSize(9).fillOpacity(1).fillColor('#344740').text(`${i+1} / ${document.pages.length}`,settings.width/2-25,settings.height-16,{lineBreak:false});
      settings.onProgress?.(i+1,document.pages.length);
    }
    pdf.end();return await output;
  }catch(error){pdf.end();throw error;}
}

// Copies original PDF page objects: text and graphics are not converted into scans.
export async function organizePdfs(inputs,{rotation=0,stamp='',pageNumbers=false}={}){
  if(!inputs.length)throw Error('Choose at least one PDF.');
  if(![0,90,180,270].includes(Number(rotation)))throw Error('Choose a quarter-turn rotation.');
  const output=await PDFDocument.create();
  for(const input of inputs){
    let source;try{source=await PDFDocument.load(input.bytes);}catch(error){if(/encrypt/i.test(error.message))throw Error('This PDF is encrypted. Use password import, then export an unlocked scan copy.');throw Error('Could not read PDF: '+error.message);}
    const indices=pageSelection(input.selection||'',source.getPageCount());
    if(output.getPageCount()+indices.length>200)throw Error('Limit the result to 200 pages.');
    for(const page of await output.copyPages(source,indices)){page.setRotation(degrees((page.getRotation().angle+Number(rotation))%360));output.addPage(page);}
  }
  if(stamp&&/[^\x20-\x7e]/.test(stamp))throw Error('PDF overlay text currently supports printable English characters.');
  const font=await output.embedFont(StandardFonts.Helvetica);
  output.getPages().forEach((page,i)=>{const {width,height}=page.getSize();if(stamp)page.drawText(stamp.slice(0,100),{x:20,y:height/2,size:Math.min(22,(width-40)/Math.max(stamp.length,1)*1.5),font,color:rgb(.15,.3,.25),opacity:.22});if(pageNumbers)page.drawText(`${i+1} / ${output.getPageCount()}`,{x:20,y:16,size:9,font});});
  return new Blob([await output.save()],{type:'application/pdf'});
}

export function askPdfPassword(name,retry=false){
  return new Promise(resolve=>{const dialog=document.createElement('dialog');dialog.className='pt-password';const title=document.createElement('h2');title.textContent=retry?'Incorrect password — try again':'Open password-protected PDF';const detail=document.createElement('p');detail.textContent=name;const form=document.createElement('form');const label=document.createElement('label');label.textContent='PDF password';const input=document.createElement('input');input.type='password';input.autocomplete='off';input.required=true;label.append(input);const submit=document.createElement('button');submit.textContent='Unlock';const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';form.append(label,submit,cancel);dialog.append(title,detail,form);document.body.append(dialog);const finish=value=>{dialog.close();dialog.remove();resolve(value);};form.onsubmit=e=>{e.preventDefault();finish(input.value);};cancel.onclick=()=>finish(null);dialog.oncancel=e=>{e.preventDefault();finish(null);};dialog.showModal();input.focus();});
}
export async function openPdf(pdfjs,data,name='PDF',requestPassword=askPdfPassword){
  const task=pdfjs.getDocument({data});let rejectCancel;const cancelled=new Promise((_,reject)=>{rejectCancel=reject;});
  task.onPassword=async(update,reason)=>{try{const password=await requestPassword(name,reason===2);if(password===null){rejectCancel(new Error('PDF import cancelled.'));return;}update(password);}catch(error){rejectCancel(error);}};
  try{return {task,pdf:await Promise.race([task.promise,cancelled])};}catch(error){await task.destroy();throw error;}
}
