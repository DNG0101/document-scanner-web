import {createPdfTransfer} from './pdf-transfer-ui.js';
import {zipSync,strToU8} from 'fflate';
import {Document,Packer,Paragraph,TextRun} from 'docx';
import jsQR from 'jsqr';
import {createAdvancedTools} from './advanced-ui.js';
import {createLayoutEditor} from './layout-ui.js';
import {pageSelection,fullCrop,csvFromText,validateBackup,download,canvasBlob,imageFromBytes} from './document-tools.js';

const xml=text=>strToU8(text);
export function slidesPptx(images){
  if(!images.length)throw Error('Choose at least one page.');
  const files={
    '[Content_Types].xml':xml(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>${images.map((_,i)=>`<Override PartName="/ppt/slides/slide${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}</Types>`),
    '_rels/.rels':xml('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/></Relationships>'),
    'ppt/presentation.xml':xml(`<?xml version="1.0" encoding="UTF-8"?><p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:sldIdLst>${images.map((_,i)=>`<p:sldId id="${256+i}" r:id="rId${i+1}"/>`).join('')}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000" type="screen16x9"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`),
    'ppt/_rels/presentation.xml.rels':xml(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${images.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i+1}.xml"/>`).join('')}</Relationships>`)
  };
  images.forEach((image,i)=>{
    const maxW=12192000,maxH=6858000,scale=Math.min(maxW/image.width,maxH/image.height),w=Math.round(image.width*scale),h=Math.round(image.height*scale),x=Math.round((maxW-w)/2),y=Math.round((maxH-h)/2),n=i+1;
    files[`ppt/media/image${n}.jpeg`]=image.bytes;
    files[`ppt/slides/slide${n}.xml`]=xml(`<?xml version="1.0" encoding="UTF-8"?><p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr/><p:pic><p:nvPicPr><p:cNvPr id="2" name="Page ${n}"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`);
    files[`ppt/slides/_rels/slide${n}.xml.rels`]=xml(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${n}.jpeg"/></Relationships>`);
  });
  return new Blob([zipSync(files,{level:0})],{type:'application/vnd.openxmlformats-officedocument.presentationml.presentation'});
}

export async function decodeQR(file) {
  const image=await createImageBitmap(file);
  try {
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
    const data=context.getImageData(0,0,canvas.width,canvas.height);
    return jsQR(data.data,data.width,data.height)?.data || null;
  } finally {image.close();}
}

export function createEnhancements({React:R,useScanner,renderPage,makePdf,pdfjs,safeName,readImage,expandImports,recognizeRegion}) {
  const h=R.createElement;
  const PdfTransfer=createPdfTransfer(R);
  const LayoutEditor=createLayoutEditor({React:R,useScanner,renderPage,readImage});
  const {Convenience,PdfOrganizer,DropImport}=createAdvancedTools({React:R,useScanner,renderPage,makePdf,safeName,readImage,decodeQR,expandImports,recognizeRegion,RenderedPage,pdfjs});
  const button=(name,action,disabled=false,extra={})=>h('button',{type:'button',onClick:action,disabled,...extra},name);
  function RenderedPage({page,watermark,alt,...props}) {
    const [url,setUrl]=R.useState(''),[error,setError]=R.useState('');
    const pageKey=JSON.stringify(page);
    R.useEffect(()=>{
      let cancelled=false,objectURL;
      setUrl('');setError('');
      renderPage(page,{watermark}).then(result=>{
        if(cancelled)return; objectURL=URL.createObjectURL(new Blob([result.bytes],{type:'image/jpeg'}));setUrl(objectURL);
      }).catch(e=>!cancelled&&setError(e.message));
      return ()=>{cancelled=true;if(objectURL)URL.revokeObjectURL(objectURL);};
    },[pageKey,watermark]);
    return url?h('img',{...props,src:url,alt}):h('span',{role:'status'},error||'Preparing page…');
  }
  function SignatureCanvas({active,strokes,onChange}) {
    const canvasRef=R.useRef(null),points=R.useRef([]),paint=R.useRef(()=>{});
    paint.current=()=>{
      const canvas=canvasRef.current;if(!canvas)return;
      const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
      canvas.width=Math.max(1,Math.round(rect.width*dpr));canvas.height=Math.max(1,Math.round(rect.height*dpr));
      const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
      for(const stroke of [...strokes,...(points.current.length?[{color:'#17363a',width:3,points:points.current}]:[])]){
        ctx.strokeStyle=stroke.color;ctx.lineWidth=stroke.width*Math.max(rect.width,rect.height)/1000;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
        stroke.points.forEach(([x,y],i)=>i?ctx.lineTo(x/100*rect.width,y/100*rect.height):ctx.moveTo(x/100*rect.width,y/100*rect.height));ctx.stroke();
      }
    };
    R.useEffect(()=>{const observer=new ResizeObserver(()=>paint.current());observer.observe(canvasRef.current);paint.current();return()=>observer.disconnect();},[]);
    R.useEffect(()=>paint.current(),[strokes,active]);
    const position=e=>{const rect=e.currentTarget.getBoundingClientRect();return [Math.max(0,Math.min(100,(e.clientX-rect.left)/rect.width*100)),Math.max(0,Math.min(100,(e.clientY-rect.top)/rect.height*100))];};
    return h('canvas',{ref:canvasRef,'data-testid':'canvas-ink-overlay','aria-label':'Draw signature on corrected page',className:`absolute inset-0 z-20 h-full w-full touch-none ${active?'cursor-crosshair':'pointer-events-none'}`,
      onPointerDown:e=>{if(active){e.currentTarget.setPointerCapture(e.pointerId);points.current=[position(e)];}},
      onPointerMove:e=>{if(active&&points.current.length){points.current.push(position(e));paint.current();}},
      onPointerUp:e=>{if(points.current.length){e.currentTarget.releasePointerCapture(e.pointerId);const stroke={color:'#17363a',width:3,points:[...points.current]};points.current=[];onChange([...strokes,stroke]);}},
      onPointerCancel:()=>{points.current=[];paint.current();}});
  }
  function Preview({doc,options={},partial=false,onClose}) {
    const [index,setIndex]=R.useState(0),[zoom,setZoom]=R.useState(100),[url,setUrl]=R.useState(''),[error,setError]=R.useState(''),[ready,setReady]=R.useState(false),[count,setCount]=R.useState(0),[visited,setVisited]=R.useState([]);
    const handle=R.useRef(null),pdf=R.useRef(null),blob=R.useRef(null),renderJob=R.useRef(null);
    const {updateDocument}=useScanner();
    R.useEffect(()=>{
      handle.current.showModal();
      let disposed=false,task;
      (async()=>{
        blob.current=await makePdf(doc,options); if(disposed)return;
        task=pdfjs.getDocument({data:await blob.current.arrayBuffer(),password:options.password||undefined});
        const loaded=await task.promise;if(disposed){await task.destroy();return;}
        pdf.current=loaded;setCount(loaded.numPages);setReady(true);
      })().catch(e=>!disposed&&setError(e.message));
      return ()=>{disposed=true;renderJob.current?.cancel();task?.destroy();};
    },[]);
    R.useEffect(()=>{
      if(!ready)return;
      let disposed=false,objectURL;
      setUrl('');
      (async()=>{
        const page=await pdf.current.getPage(index+1);if(disposed)return;
        const viewport=page.getViewport({scale:1.5}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
        const task=page.render({canvas,canvasContext:canvas.getContext('2d'),viewport});renderJob.current=task;await task.promise;
        const image=await canvasBlob(canvas);if(disposed)return;
        objectURL=URL.createObjectURL(image);setUrl(objectURL);setVisited(pages=>[...new Set([...pages,index])]);
      })().catch(e=>{if(!disposed&&e.name!=='RenderingCancelledException')setError(e.message);});
      return ()=>{disposed=true;renderJob.current?.cancel();if(objectURL)URL.revokeObjectURL(objectURL);};
    },[index,ready]);
    return h('dialog',{ref:handle,className:'pt-preview','aria-label':'PDF preview and review',onCancel:onClose,onKeyDown:e=>{
      if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
      if(e.key==='ArrowRight'&&ready)setIndex(i=>Math.min(count-1,i+1));
      if(e.key==='ArrowLeft')setIndex(i=>Math.max(0,i-1));
    }},
      h('header',null,h('h2',null,'PDF preview & review'),button('Close preview',onClose)),
      h('p',null,`${doc.name} · Page ${index+1} of ${count||'…'} · Actual exported PDF, including crop, ink, watermark and paper size.`),
      h('p',null,`Review progress: ${visited.length} of ${count||'…'} pages viewed. View every page before marking reviewed.`),
      h('label',null,'Jump to page',h('select',{'aria-label':'Jump to PDF page',disabled:!ready,value:index,onChange:e=>setIndex(Number(e.target.value))},Array.from({length:count},(_,i)=>h('option',{key:i,value:i},String(i+1))))),
      h('nav',{'aria-label':'Preview controls'},button('Previous',()=>setIndex(i=>i-1),!ready||index===0),button('Next',()=>setIndex(i=>i+1),!ready||index>=count-1),
        button('Zoom out',()=>setZoom(z=>Math.max(50,z-25)),zoom===50),h('output',null,`${zoom}%`),button('Zoom in',()=>setZoom(z=>Math.min(200,z+25)),zoom===200),button('Fit',()=>setZoom(100)),
        button('Download reviewed PDF',()=>download(blob.current,safeName(doc.name,'scan')+'.pdf'),!ready),
        !partial&&button('Mark document reviewed',async()=>{try {await updateDocument(doc.id,{reviewedAt:new Date().toISOString()});onClose();}catch(e){setError(e.message);}},!ready||!!error||visited.length!==count)),
      error?h('p',{role:'alert'},error):h('div',{className:'pt-preview-sheet'},url?h('img',{src:url,alt:`PDF preview page ${index+1}`,style:{height:zoom*.65+'vh',width:'auto',maxWidth:zoom===100?'100%':'none',objectFit:'contain'}}):h('p',{role:'status'},'Rendering PDF…')));
  }
  function EditorTools({doc,page,onSelect}) {
    const [layoutOpen,setLayoutOpen]=R.useState(false),[destination,setDestination]=R.useState(''),[insertAt,setInsertAt]=R.useState('');
    const api=useScanner(),[busy,setBusy]=R.useState(false),[notice,setNotice]=R.useState(''),[selection,setSelection]=R.useState(''),[preview,setPreview]=R.useState(null),[text,setText]=R.useState('');
    const current=doc.pages.findIndex(p=>p.id===page.id);
    const run=async fn=>{setBusy(true);setNotice('');try {await api.flush();await fn();}catch(e){setNotice(e.message||'Operation failed.');}finally{setBusy(false);}};
    const selected=()=>pageSelection(selection,doc.pages.length).map(i=>doc.pages[i]);
    const rendered=async()=>{const result=[];for(const p of selected())result.push(await renderPage(p,{watermark:doc.watermark}));return result;};
    const saveImageDocument=async(canvas,name)=>{
      const file=new File([await canvasBlob(canvas)],name+'.png',{type:'image/png'});
      const created=await api.createDocument([file],name);
      await api.updatePage(created.id,created.pages[0].id,{crop:fullCrop(),filter:'original'});
      setNotice(`Created “${name}” in your library. Original pages are unchanged.`);
    };
    const compose=async layout=>{
      const images=await rendered();if(!images.length)throw new Error('Choose at least one page.');
      const width=1200,gap=24,cell=layout==='long'?width:(width-gap*3)/2;
      const heights=images.map(p=>Math.round(cell*p.height/p.width));
      const row=layout==='long'?0:Math.max(...heights);
      const height=layout==='long'?heights.reduce((a,b)=>a+b,0)+gap*(images.length+1):Math.ceil(images.length/2)*(row+gap)+gap;
      if(height>16000||width*height>24000000)throw new Error('Too many pages for one image. Select fewer pages.');
      const canvas=document.createElement('canvas');canvas.width=layout==='long'?width+gap*2:width;canvas.height=height;
      const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
      let y=gap;
      for(let i=0;i<images.length;i++) {const image=await imageFromBytes(images[i].bytes);ctx.drawImage(image,layout==='long'?gap:gap+(i%2)*(cell+gap),layout==='long'?y:gap+Math.floor(i/2)*(row+gap),cell,heights[i]);image.close();y+=heights[i]+gap;}
      await saveImageDocument(canvas,doc.name+(layout==='long'?' long image':' collage'));
    };
    const exportText=()=>selected().map(p=>p.ocrText||'').join('\n\n');
    return h('section',{className:'pt-tools','aria-label':'Document tools'},h('h2',null,'Review & document tools'),
      h('div',{className:'pt-actions'},button('Preview & review PDF',()=>run(async()=>{setPreview({doc:await api.getDocument(doc.id),options:{}});}),busy),h('span',null,doc.reviewedAt?'Reviewed':'Not yet reviewed')),
      h(Convenience,{doc,page,onSelect,onPreview:(doc,options)=>setPreview({doc,options})}),
      button('Edit page layout / text',()=>setLayoutOpen(true),busy),
      layoutOpen&&h(LayoutEditor,{key:page.id,doc,page,onClose:()=>setLayoutOpen(false)}),
      h('details',null,h('summary',null,'Pages, exports & conversion'),
        h('label',null,'Page selection',h('input',{'aria-label':'Page selection',placeholder:'All pages, or 1,3-5',value:selection,onChange:e=>setSelection(e.target.value)})),
        h('label',null,'Destination document',h('select',{'aria-label':'Destination document',value:destination,onChange:e=>setDestination(e.target.value),disabled:busy},h('option',{value:''},'Choose another library document'),api.documents.filter(d=>d.id!==doc.id&&!d.trashedAt).map(d=>h('option',{key:d.id,value:d.id},d.name)))),
        h('label',null,'Insert before page (blank appends)',h('input',{type:'number',min:1,value:insertAt,onChange:e=>setInsertAt(e.target.value),disabled:busy})),
        ...['Copy','Move'].map(action=>button(action+' selected pages to document',()=>run(async()=>{const fresh=await api.getDocument(doc.id),ids=pageSelection(selection,fresh.pages.length).map(i=>fresh.pages[i].id);await api.transferPages(doc.id,destination,ids,action==='Move',insertAt===''?null:Number(insertAt)-1);onSelect(0);setNotice(action==='Move'?'Pages moved. Export the source and destination PDFs separately.':'Pages copied. Open the destination document to review and export its PDF.');}),busy||!destination)),
        h('div',{className:'pt-actions'},
          button('Preview selected PDF',()=>run(async()=>{const fresh=await api.getDocument(doc.id);const pages=pageSelection(selection,fresh.pages.length).map(i=>fresh.pages[i]);setPreview({doc:{...fresh,pages},options:{},partial:true});}),busy),button('Download selected PDF',()=>run(async()=>{const fresh=await api.getDocument(doc.id),pages=pageSelection(selection,fresh.pages.length).map(i=>fresh.pages[i]);download(await makePdf({...fresh,pages}),safeName(fresh.name,'scan')+'-selected.pdf');}),busy),
          button('Extract selected pages',()=>run(async()=>{const pages=selected();await api.insert({...doc,name:doc.name+' extracted',pages,reviewedAt:undefined});setNotice('Selected pages copied to a new document in your library.');}),busy),
          button('Move page earlier',()=>run(async()=>{await api.reorderPages(doc.id,current,current-1);onSelect(current-1);}),busy||current<1),
          button('Move page later',()=>run(async()=>{await api.reorderPages(doc.id,current,current+1);onSelect(current+1);}),busy||current===doc.pages.length-1),
          button('Split book page',()=>run(async()=>{
            const result=await renderPage(page),image=await imageFromBytes(result.bytes),files=[];
            try {for(let i=0;i<2;i++){const start=Math.floor(image.width*i/2),end=Math.floor(image.width*(i+1)/2),canvas=document.createElement('canvas');canvas.width=end-start;canvas.height=image.height;canvas.getContext('2d').drawImage(image,start,0,canvas.width,image.height,0,0,canvas.width,image.height);files.push(new File([await canvasBlob(canvas)],`${page.name}-${i+1}.png`,{type:'image/png'}));}}finally{image.close();}
            const created=await api.createDocument(files,doc.name+' book split','book');for(const p of created.pages)await api.updatePage(created.id,p.id,{crop:fullCrop(),filter:'original'});setNotice('Two facing pages saved as a new document.');
          }),busy),
          button('Create collage / ID sheet',()=>run(()=>compose('collage')),busy),button('Create long image',()=>run(()=>compose('long')),busy),
          button('Export images ZIP',()=>run(async()=>{const files={};const images=await rendered();images.forEach((p,i)=>files[`page-${String(i+1).padStart(3,'0')}.jpg`]=p.bytes);download(new Blob([zipSync(files,{level:0})]),safeName(doc.name,'scan')+'.zip');setNotice('Images ZIP downloaded.');}),busy),
          button('Export text TXT',()=>run(async()=>{const value=exportText();if(!value.trim())throw new Error('Run text extraction first.');download(new Blob([value],{type:'text/plain;charset=utf-8'}),safeName(doc.name,'scan')+'.txt');}),busy),
          button('Export spreadsheet CSV',()=>run(async()=>{const value=exportText();if(!value.trim())throw new Error('Run text extraction first.');download(new Blob(['\uFEFF'+csvFromText(value)],{type:'text/csv;charset=utf-8'}),safeName(doc.name,'scan')+'.csv');setNotice('CSV exported. Review OCR and column alignment before use.');}),busy),
          button('Export Word DOCX',()=>run(async()=>{const value=exportText();if(!value.trim())throw new Error('Run text extraction first.');const word=new Document({sections:[{children:value.split('\n').map(line=>new Paragraph({children:[new TextRun(line)]}))}]});download(await Packer.toBlob(word),safeName(doc.name,'scan')+'.docx');setNotice('Editable text exported; original page layout is not reconstructed.');}),busy),
          button('Export slides PPTX',()=>run(async()=>{download(slidesPptx(await rendered()),safeName(doc.name,'scan')+'.pptx');setNotice('Slides downloaded. Each page is an image, not editable slide objects.');}),busy)),
        h('p',null,'Compression, paper size and orientation are in Settings. CSV infers columns from tabs or multiple spaces. Word exports OCR text; slides contain page images.')),
      h('details',null,h('summary',null,'Page cleanup & annotation'),
        h('div',{className:'pt-actions'},button('Reset crop to full image',()=>run(()=>api.updatePage(doc.id,page.id,{crop:fullCrop()})),busy),
          button('Apply finish to all pages',()=>run(async()=>{await api.updatePages(doc.id,doc.pages.map(p=>p.id),{filter:page.filter,brightness:page.brightness,contrast:page.contrast,ocrText:undefined,ocrWords:undefined});setNotice('Finish applied to every page.');}),busy)),
        h('label',null,'Text annotation',h('input',{'aria-label':'Text annotation',value:text,onChange:e=>setText(e.target.value),maxLength:120})),
        button('Add text to page',()=>run(async()=>{if(!text.trim())throw new Error('Enter annotation text first.');const result=await renderPage(page),image=await imageFromBytes(result.bytes),canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);image.close();const font=Math.max(14,Math.round(canvas.width/30));ctx.font=`600 ${font}px sans-serif`;ctx.fillStyle='white';ctx.fillRect(0,canvas.height-font*2,canvas.width,font*2);ctx.fillStyle='#17363a';ctx.fillText(text,16,canvas.height-font*.6,canvas.width-32);const src=await readImage(new File([await canvasBlob(canvas)],'annotated.png',{type:'image/png'}));await api.duplicatePage(doc.id,page.id);await api.updatePage(doc.id,page.id,{src,crop:fullCrop(),rotation:0,filter:'original',brightness:100,contrast:100,ink:[],ocrText:undefined});setText('');setNotice('Text added. An unchanged copy of the page was preserved.');}),busy)),
      h('p',{role:'status','aria-live':'polite'},busy?'Working locally…':notice),preview&&h(Preview,{doc:preview.doc,options:preview.options,partial:preview.partial,onClose:()=>setPreview(null)}));
  }
  function LibraryTools() {
    const api=useScanner(),input=R.useRef(null),[status,setStatus]=R.useState(''),[busy,setBusy]=R.useState(false);
    return h('section',{'aria-label':'Library backup'},h(DropImport),h(PdfOrganizer),h(PdfTransfer),h('details',{className:'pt-tools'},h('summary',null,'Backup & restore'),h('p',null,'Backups include your documents and images. Keep the downloaded file private. Restore adds copies without replacing existing documents.'),
      h('div',{className:'pt-actions'},button('Download library backup',()=>download(new Blob([JSON.stringify({format:'papertrail-backup-v1',documents:api.documents})],{type:'application/json'}),'papertrail-backup.json'),busy),button('Restore backup',()=>input.current.click(),busy)),
      h('input',{ref:input,type:'file',accept:'.json',hidden:true,onChange:async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;setBusy(true);try {if(file.size>150*1024*1024)throw new Error('Backup exceeds 150 MB.');const docs=validateBackup(JSON.parse(await file.text()));let count=0;for(const doc of docs){await api.insert(doc);count++;setStatus(`Restored ${count} of ${docs.length} documents.`);}}catch(error){setStatus(error.message);}finally{setBusy(false);}}}),h('p',{role:'status'},status)));
  }
  function StorageNotice() {const api=useScanner();return api.error?h('div',{className:'pt-storage-error',role:'alert'},'Not saved: '+api.error,button('Dismiss',api.clearError)):null;}
  return {EditorTools,LibraryTools,RenderedPage,StorageNotice,SignatureCanvas};
}
