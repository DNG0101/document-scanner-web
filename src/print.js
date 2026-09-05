// Print the same PDF pages used by preview, including ID layout and page numbers.
export async function preparePrint(pdfjs,blob,target,title){
  const task=pdfjs.getDocument({data:await blob.arrayBuffer()});
  const urls=[];
  try{
    const pdf=await task.promise,document=target.document;
    document.title=title;
    const style=document.createElement('style');
    style.textContent='body{margin:0;background:#eee}img{display:block;width:100%;height:100%}.sheet{margin:12px auto;background:white;break-after:page}.sheet:last-child{break-after:auto}button{margin:12px;padding:12px}@media print{body{background:white}button{display:none}.sheet{margin:0}}';
    document.head.append(style);
    const button=document.createElement('button');button.textContent='Preparing print pages…';button.disabled=true;document.body.append(button);
    for(let i=1;i<=pdf.numPages;i++){
      if(target.closed)throw Error('Print window was closed.');
      const page=await pdf.getPage(i),size=page.getViewport({scale:1}),viewport=page.getViewport({scale:2});
      const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
      const image=document.createElement('img'),sheet=document.createElement('section');sheet.className='sheet';
      sheet.style.cssText=`width:${size.width}pt;height:${size.height}pt;page:sheet${i}`;
      style.textContent+=`@page sheet${i}{size:${size.width}pt ${size.height}pt;margin:0}`;
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not prepare print image.'))));
      const url=URL.createObjectURL(blob);urls.push(url);image.src=url;await image.decode();sheet.append(image);document.body.append(sheet);
      canvas.width=canvas.height=0;
    }
    button.textContent='Print / save as PDF · choose 100% / actual size';button.disabled=false;button.onclick=()=>target.print();
    target.addEventListener('pagehide',()=>urls.forEach(url=>URL.revokeObjectURL(url)),{once:true});
  }catch(error){urls.forEach(url=>URL.revokeObjectURL(url));throw error;}
  finally{await task.destroy();}
}
