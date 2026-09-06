import {transferPdfPages} from './pdf-tools.js';
export function createPdfTransfer(React){
 const h=React.createElement;
 return function PdfTransfer(){
  const [source,setSource]=React.useState(null),[target,setTarget]=React.useState(null),[selection,setSelection]=React.useState(''),[position,setPosition]=React.useState(''),[move,setMove]=React.useState(false),[busy,setBusy]=React.useState(false),[status,setStatus]=React.useState(''),[result,setResult]=React.useState(null);
  React.useEffect(()=>()=>{if(result){URL.revokeObjectURL(result.target);if(result.source)URL.revokeObjectURL(result.source);}},[result]);
  const edit=fn=>value=>{setResult(null);setStatus('');fn(value);};
  const choose=(title,set)=>h('label',null,title,h('input',{type:'file',accept:'.pdf',disabled:busy,onChange:e=>edit(set)(e.target.files[0]||null)}));
  return h('details',{className:'pt-tools'},h('summary',null,'Copy / move pages between PDF files'),
   h('p',null,'Transfer pages into an existing PDF without converting text and graphics into scans. Local originals are never overwritten. A move prepares two updated files; download both. Forms, links, bookmarks and digital signatures may be affected, so review the outputs.'),
   choose('Source PDF',setSource),choose('Destination PDF',setTarget),
   h('label',null,'Source pages',h('input',{value:selection,placeholder:'All, or 3,1-2',disabled:busy,onChange:e=>edit(setSelection)(e.target.value)})),
   h('label',null,'Insert before destination page',h('input',{type:'number',min:1,value:position,placeholder:'Blank appends',disabled:busy,onChange:e=>edit(setPosition)(e.target.value)})),
   h('label',null,h('input',{type:'checkbox',checked:move,disabled:busy,onChange:e=>edit(setMove)(e.target.checked)}),'Remove transferred pages from source output'),
   h('button',{type:'button',disabled:busy||!source||!target,onClick:async()=>{setBusy(true);setStatus('Preparing PDFs…');setResult(null);try{if(source.size>100*1024*1024||target.size>100*1024*1024)throw Error('Each PDF must be below 100 MB.');const files=await transferPdfPages(await source.arrayBuffer(),await target.arrayBuffer(),{selection,move,position:position===''?null:Number(position)-1});setResult({target:URL.createObjectURL(files.target),source:files.source?URL.createObjectURL(files.source):null});setStatus('Ready. Preview and download the updated files below. Originals are unchanged.');}catch(e){setStatus(e.message);}finally{setBusy(false);}}},'Prepare PDF transfer'),
   result&&h('div',{className:'pt-actions'},...['target','source'].filter(k=>result[k]).flatMap(k=>[h('a',{key:k+'preview',href:result[k],target:'_blank',rel:'noopener'},'Preview updated '+(k==='target'?'destination':'source')),h('a',{key:k+'download',href:result[k],download:`updated-${k==='target'?'destination':'source'}.pdf`},'Download updated '+(k==='target'?'destination':'source'))])),
   h('p',{role:'status'},status));
 };
}
