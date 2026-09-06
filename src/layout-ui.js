import {clampLayer,drawLayout,validateLayout} from './layout.js';
import {canvasBlob,fullCrop} from './document-tools.js';
export function createLayoutEditor({React:R,useScanner,renderPage,readImage}) {
 const h=R.createElement;
 return function LayoutEditor({doc,page,onClose}) {
  const api=useScanner(),[layout,setLayout]=R.useState(null),[selected,setSelected]=R.useState(''),[busy,setBusy]=R.useState(false),[status,setStatus]=R.useState('Loading page…'),[preview,setPreview]=R.useState(''),[lockAspect,setLockAspect]=R.useState(true);
  const dialog=R.useRef(null),drag=R.useRef(null),history=R.useRef([]),redo=R.useRef([]),current=R.useRef(null),original=R.useRef(null);
  current.current=layout;
  const change=next=>{history.current.push(structuredClone(current.current));if(history.current.length>30)history.current.shift();redo.current=[];setLayout(next);};
  const run=async fn=>{setBusy(true);setStatus('');try{await fn();}catch(e){setStatus(e.message);}finally{setBusy(false);}};
  R.useEffect(()=>{dialog.current.showModal();let cancelled=false;original.current=JSON.stringify(page);
   (async()=>{let initial;if(page.composition)initial=validateLayout(page.composition);else {const result=await renderPage(page),src=await readImage(new File([result.bytes],'page.jpg',{type:'image/jpeg'}));initial={width:result.width,height:result.height,layers:[{id:crypto.randomUUID(),type:'image',src,x:0,y:0,w:100,h:100,opacity:1}]};}if(!cancelled){setLayout(initial);setSelected(initial.layers[0]?.id||'');setStatus('');}})().catch(e=>!cancelled&&setStatus(e.message));return()=>{cancelled=true;};
  },[]);
  R.useEffect(()=>{if(!layout)return;let cancelled=false;const canvas=document.createElement('canvas');drawLayout(canvas,layout).then(()=>{if(!cancelled)setPreview(canvas.toDataURL('image/png'));}).catch(e=>!cancelled&&setStatus(e.message));return()=>{cancelled=true;};},[layout]);
  const object=layout?.layers.find(l=>l.id===selected);
  const patch=value=>change({...layout,layers:layout.layers.map(l=>l.id===selected?clampLayer({...l,...value}):l)});
  const add=layers=>{if(layout.layers.length+layers.length>100){setStatus('Limit each page to 100 objects.');return;}change({...layout,layers:[...layout.layers,...layers]});setSelected(layers.at(-1).id);};
  const textLayer=(values={})=>({id:crypto.randomUUID(),type:'text',text:'Your text',x:10,y:10,w:65,h:20,size:3,color:'#172f32',font:'sans-serif',align:'left',opacity:1,...values});
  const button=(label,fn,disabled=false)=>h('button',{type:'button',disabled:busy||disabled,onClick:fn},label);
  const close=()=>{if(busy)return;if(history.current.length&&!window.confirm('Discard unsaved layout changes?'))return;onClose();};
  const save=()=>run(async()=>{
    if(!layout.layers.length)throw Error('Add at least one object.');
    const validated=validateLayout(layout),canvas=document.createElement('canvas'),overflow=await drawLayout(canvas,validated);
    if(overflow.length)throw Error('Some text does not fit. Increase its box height/width or reduce font size before saving.');
    await api.flush();const fresh=await api.getDocument(doc.id);
    if(JSON.stringify(fresh.pages.find(p=>p.id===page.id))!==original.current)throw Error('The page changed while this editor was open. Close and reopen to avoid overwriting it.');
    const src=await readImage(new File([await canvasBlob(canvas)],'layout.png',{type:'image/png'}));
    await api.updatePage(doc.id,page.id,{src,composition:validated,crop:fullCrop(),rotation:0,filter:'original',brightness:100,contrast:100,ink:[],ocrText:undefined,ocrWords:undefined});onClose();
  });
  return h('dialog',{ref:dialog,className:'pt-layout-dialog','aria-label':'Page layout editor',onCancel:e=>{e.preventDefault();close();}},
   h('h2',null,'Page layout editor'),h('p',null,'Place images in front of or behind text. Drag an object to move it; drag its corner to resize. Positions and font sizes are percentages of this page.'),
   h('div',{className:'pt-actions'},button('Close layout',close),button('Save layout',save,!layout),button('Undo layout',()=>{redo.current.push(layout);setLayout(history.current.pop());},!history.current.length),button('Redo layout',()=>{history.current.push(layout);setLayout(redo.current.pop());},!redo.current.length)),
   layout&&h('div',{className:'pt-layout-grid'},h('div',null,
    h('div',{className:'pt-layout-stage',style:{aspectRatio:layout.width+'/'+layout.height},'aria-label':'Layout canvas',onPointerMove:e=>{const d=drag.current;if(!d)return;const rect=e.currentTarget.getBoundingClientRect(),dx=(e.clientX-d.x)/rect.width*100,dy=(e.clientY-d.y)/rect.height*100;setLayout({...d.layout,layers:d.layout.layers.map(l=>l.id===d.id?clampLayer({...l,...(d.resize?{w:l.w+dx,h:lockAspect&&l.type==='image'?l.h*(l.w+dx)/l.w:l.h+dy}:{x:l.x+dx,y:l.y+dy})}):l)});},onPointerUp:()=>{drag.current=null;},onPointerCancel:()=>{drag.current=null;}},
      preview&&h('img',{src:preview,alt:'Exact page layout preview',draggable:false}),
      ...layout.layers.map((l,i)=>h('div',{key:l.id,role:'button',tabIndex:0,'aria-label':`Select ${l.type} layer ${i+1}`,'aria-pressed':l.id===selected,className:'pt-layout-object'+(l.id===selected?' selected':''),style:{left:l.x+'%',top:l.y+'%',width:l.w+'%',height:l.h+'%'},onFocus:()=>setSelected(l.id),onKeyDown:e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)||busy)return;e.preventDefault();const delta=e.shiftKey?5:1;change({...layout,layers:layout.layers.map(v=>v.id===l.id?clampLayer({...v,x:v.x+(e.key==='ArrowLeft'?-delta:e.key==='ArrowRight'?delta:0),y:v.y+(e.key==='ArrowUp'?-delta:e.key==='ArrowDown'?delta:0)}):v)});},onPointerDown:e=>{if(busy)return;e.preventDefault();setSelected(l.id);history.current.push(structuredClone(layout));if(history.current.length>30)history.current.shift();redo.current=[];e.currentTarget.parentElement.setPointerCapture(e.pointerId);drag.current={id:l.id,x:e.clientX,y:e.clientY,layout,resize:e.target.dataset.resize==='yes'};}},l.id===selected&&h('span',{'data-resize':'yes',className:'pt-layout-handle','aria-hidden':true}))))),
    h('div',{className:'pt-layout-controls'},
     button('Add text box',()=>add([textLayer()])),
     h('label',null,'Insert image',h('input',{type:'file',accept:'image/png,image/jpeg,image/webp',disabled:busy,onChange:e=>{const file=e.target.files[0];e.target.value='';if(file)run(async()=>{if(file.size>25*1024*1024)throw Error('Choose an image below 25 MB.');const src=await readImage(file),img=new Image();img.src=src;await img.decode();const w=40,hh=Math.min(80,w*img.height/img.width*layout.width/layout.height);add([{id:crypto.randomUUID(),type:'image',src,x:10,y:10,w,h:hh,opacity:1}]);});}})),
     button('Add cover rectangle',()=>add([{id:crypto.randomUUID(),type:'cover',x:10,y:10,w:40,h:10,opacity:1,background:'#ffffff'}])),
     h('p',null,'Visual text replacement: cover the old text, then add a text box. This creates a flattened PDF, not an edit to original PDF text objects. Saved layouts retain the original image for re-editing; do not share backups as redacted documents.'),
     page.ocrWords?.length>0&&h('label',null,'Replace recognized text',h('select',{'aria-label':'Replace recognized text',value:'',disabled:busy,onChange:e=>{if(e.target.value==='')return;const t=page.ocrWords[Number(e.target.value)];add([{id:crypto.randomUUID(),type:'cover',x:t.x*100,y:t.y*100,w:Math.max(1,t.w*100),h:Math.max(1,t.h*100),background:'#ffffff',opacity:1},textLayer({text:t.text,x:t.x*100,y:t.y*100,w:Math.min(100-t.x*100,Math.max(15,t.w*100)),h:Math.min(100-t.y*100,Math.max(5,t.h*100*1.5)),size:Math.max(.5,t.h*layout.height/layout.width*80)})]);}},h('option',{value:''},'Choose a word / line'),page.ocrWords.map((t,i)=>h('option',{key:i,value:i},t.text)))),
     h('label',null,'Selected object',h('select',{'aria-label':'Selected object',value:selected,onChange:e=>setSelected(e.target.value)},h('option',{value:''},'Choose object'),layout.layers.map((l,i)=>h('option',{key:l.id,value:l.id},`${i+1}. ${l.type} ${l.text?.slice(0,24)||''}`)))),
     object&&h('fieldset',{disabled:busy},h('legend',null,'Object properties'),
      ...['x','y','w','h'].map(k=>h('label',{key:k},({x:'Object left',y:'Object top',w:'Object width',h:'Object height'})[k],h('input',{type:'number',step:.1,min:0,max:100,value:object[k],onChange:e=>patch({[k]:Number(e.target.value)})}))),
      h('label',null,'Opacity',h('input',{type:'range',min:0,max:1,step:.05,value:object.opacity??1,onChange:e=>patch({opacity:Number(e.target.value)})})),
      object.type==='image'&&h('label',null,h('input',{type:'checkbox',checked:lockAspect,onChange:e=>setLockAspect(e.target.checked)}),'Keep image proportions when dragging'),
      object.type==='cover'&&h('label',null,'Cover color',h('input',{type:'color',value:object.background||'#ffffff',onChange:e=>patch({background:e.target.value})})),
      object.type==='text'&&h(R.Fragment,null,h('label',null,'Text content',h('textarea',{'aria-label':'Text content',value:object.text,maxLength:10000,onChange:e=>patch({text:e.target.value})})),
       h('label',null,'Font family',h('select',{'aria-label':'Font family',value:object.font||'sans-serif',onChange:e=>patch({font:e.target.value})},['sans-serif','serif','monospace'].map(v=>h('option',{key:v,value:v},v)))),
       h('label',null,'Font size (%)',h('input',{type:'number',min:.5,max:20,step:.1,value:object.size,onChange:e=>patch({size:Number(e.target.value)})})),
       h('label',null,'Text color',h('input',{type:'color',value:object.color||'#172f32',onChange:e=>patch({color:e.target.value})})),
       ...['bold','italic','underline'].map(k=>h('label',{key:k},h('input',{type:'checkbox',checked:!!object[k],onChange:e=>patch({[k]:e.target.checked})}),k)),
       h('label',null,'Text alignment',h('select',{'aria-label':'Text alignment',value:object.align||'left',onChange:e=>patch({align:e.target.value})},['left','center','right'].map(v=>h('option',{key:v,value:v},v))))),
      button('Bring to front',()=>change({...layout,layers:[...layout.layers.filter(l=>l.id!==selected),object]})),button('Send to back',()=>change({...layout,layers:[object,...layout.layers.filter(l=>l.id!==selected)]})),
      button('Duplicate object',()=>add([clampLayer({...object,id:crypto.randomUUID(),x:object.x+2,y:object.y+2})])),button('Delete object',()=>{change({...layout,layers:layout.layers.filter(l=>l.id!==selected)});setSelected('');})),
     h('p',null,'Save first, then use Preview & review PDF for paper margins, page numbers and final PDF appearance. Layout text is rendered into the page; rerun OCR for searchable export.'))),
    h('p',{role:'status'},busy?'Saving / loading…':status));
 };
}
