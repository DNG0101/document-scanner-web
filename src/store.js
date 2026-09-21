export const MAX_DOCUMENT_PAGES = 500;

// One queue for every mutation: each edit reads the latest committed document.
export function createStore(io, id = () => crypto.randomUUID(), now = () => new Date().toISOString()) {
  let documents = [], queue = Promise.resolve(), failure = null;
  const listeners = new Set();
  const history=new Map(),future=new Map();
  const remember=(map,key,doc)=>{const frames=map.get(key)||[];frames.push(doc);while(frames.length>10||frames.reduce((sum,d)=>sum+d.pages.reduce((n,p)=>n+(p.src?.length||0),0),0)>32000000)frames.shift();map.set(key,frames);};
  const publish = () => listeners.forEach(fn => fn(documents));
  const enqueue = fn => { const job = queue.then(fn).then(value=>{failure=null;return value;},error=>{failure=error;throw error;}); queue = job.catch(() => {}); return job; };
  const assertPageCount=(pages,allowEmpty=false)=>{
    if(!Array.isArray(pages)||(!allowEmpty&&!pages.length))throw new Error('A document must contain at least one page.');
    if(pages.length>MAX_DOCUMENT_PAGES)throw new Error(`A document can contain at most ${MAX_DOCUMENT_PAGES} pages.`);
  };
  const save = async doc => {
    assertPageCount(doc.pages);
    const next = {...doc, updatedAt: now()};
    await io.put(next);
    documents = [next, ...documents.filter(d => d.id !== next.id)].sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
    publish(); return next;
  };
  const mutate = (key, fn) => enqueue(async () => {
    const current = documents.find(d => d.id === key);
    if (!current) throw new Error('Document no longer exists.');
    const result=await save(fn({...structuredClone(current),reviewedAt:undefined}));
    remember(history,key,current);future.delete(key);return result;
  });
  const clonePage = page => ({...structuredClone(page), id: id()});
  const patchPage=(page,patch)=>{
    let ink=page.ink;
    if('rotation' in patch&&!('ink' in patch)&&ink?.length){
      const turns=((patch.rotation-(page.rotation||0))/90%4+4)%4;
      ink=ink.map(stroke=>({...stroke,points:stroke.points.map(point=>{let [x,y]=point;for(let n=0;n<turns;n++)[x,y]=[100-y,x];return [x,y];})}));
    }
    const stale=['src','crop','rotation','ink','brightness','contrast','filter'].some(k=>k in patch);
    return {...page,...(ink?{ink}:{}),...(stale?{ocrText:undefined,ocrWords:undefined}:('ocrText' in patch&&!('ocrWords' in patch)?{ocrWords:undefined}:{})),...patch,id:page.id};
  };
  return {
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    get documents() { return documents; },
    load: () => enqueue(async () => { documents = await io.read(); publish(); }),
    flush: async () => {await queue;if(failure)throw failure;},
    getDocument: key => structuredClone(documents.find(d=>d.id===key)),
    undo: key => enqueue(async()=>{const frames=history.get(key)||[];if(!frames.length)throw Error('Nothing to undo.');const current=documents.find(d=>d.id===key);if(!current)throw Error('Document no longer exists.');const result=await save({...frames.at(-1),reviewedAt:undefined});frames.pop();remember(future,key,current);return result;}),
    redo: key => enqueue(async()=>{const frames=future.get(key)||[];if(!frames.length)throw Error('Nothing to redo.');const current=documents.find(d=>d.id===key);if(!current)throw Error('Document no longer exists.');const result=await save({...frames.at(-1),reviewedAt:undefined});frames.pop();remember(history,key,current);return result;}),
    updatePages: (key,pageIds,patch) => mutate(key,doc=>{
      if(!Array.isArray(pageIds)||!pageIds.length)throw Error('Choose at least one existing page.');
      const selected=[...new Set(pageIds)];
      if(selected.some(pageId=>!doc.pages.some(p=>p.id===pageId)))throw Error('One or more pages no longer exist.');
      return {...doc,pages:doc.pages.map(p=>selected.includes(p.id)?patchPage(p,patch):p)};
    }),
    rotateAll: key => mutate(key,doc=>({...doc,pages:doc.pages.map(p=>patchPage(p,{rotation:((p.rotation||0)+90)%360}))})),
    reversePages: key => mutate(key,doc=>({...doc,pages:[...doc.pages].reverse()})),
    insert: doc => enqueue(() => {assertPageCount(doc?.pages);return save({...structuredClone(doc), id: id(), createdAt: now(), pages: doc.pages.map(clonePage)});}),
    updateDocument: (key, patch) => mutate(key, doc => ({...doc, ...patch, id: key})),
    updatePdfOptions: (key, patch) => mutate(key,doc=>({...doc,pdfOptions:{...doc.pdfOptions,...patch}})),
    updatePage: (key, pageId, patch) => mutate(key, doc => {
      if(!doc.pages.some(p=>p.id===pageId))throw Error('Page no longer exists.');
      return {...doc,reviewedAt:undefined,pages:doc.pages.map(p=>p.id===pageId?patchPage(p,patch):p)};
    }),
    append: (key, pages) => mutate(key, doc => {
      if(!Array.isArray(pages)||!pages.length)throw Error('Add at least one page.');
      if(doc.pages.length+pages.length>MAX_DOCUMENT_PAGES)throw Error(`A document can contain at most ${MAX_DOCUMENT_PAGES} pages.`);
      return {...doc, pages:[...doc.pages,...pages.map(clonePage)]};
    }),
    reorderPages: (key, from, to) => mutate(key, doc => {
      if (![from,to].every(i => Number.isInteger(i) && i >= 0 && i < doc.pages.length)) throw new Error('Invalid page position.');
      const [page] = doc.pages.splice(from,1); doc.pages.splice(to,0,page); return doc;
    }),
    duplicatePage: (key, pageId) => mutate(key, doc => {
      const index = doc.pages.findIndex(p => p.id === pageId);
      if (index < 0) throw new Error('Page no longer exists.');
      if(doc.pages.length>=MAX_DOCUMENT_PAGES)throw Error(`A document can contain at most ${MAX_DOCUMENT_PAGES} pages.`);
      doc.pages.splice(index+1,0,{...clonePage(doc.pages[index]),name:doc.pages[index].name+' copy'}); return doc;
    }),
    deletePage: (key, pageId) => mutate(key, doc => {
      const index=doc.pages.findIndex(p=>p.id===pageId);
      if(index<0)throw new Error('Page no longer exists.');
      if(doc.pages.length <= 1) throw new Error('Keep at least one page.');
      doc.pages.splice(index,1); return doc;
    }),
    deleteDocument: key => enqueue(async () => {if(!documents.some(d=>d.id===key))throw Error('Document no longer exists.');await io.remove(key);history.delete(key);future.delete(key); documents = documents.filter(d => d.id !== key); publish();}),
    duplicateDocument: key => enqueue(async () => {
      const doc = documents.find(d => d.id === key); if(!doc) throw new Error('Document no longer exists.');
      return save({...structuredClone(doc),id:id(),name:doc.name+' copy',createdAt:now(),pages:doc.pages.map(clonePage)});
    }),
    mergeDocuments: (keys, name) => enqueue(async () => {
      const docs = [...new Set(keys)].map(key => documents.find(d => d.id === key));
      if(docs.length<2 || docs.some(d => !d)) throw new Error('Select at least two existing documents.');
      const count=docs.reduce((sum,doc)=>sum+doc.pages.length,0);
      if(count>MAX_DOCUMENT_PAGES)throw Error(`A merged document can contain at most ${MAX_DOCUMENT_PAGES} pages.`);
      return save({id:id(),name:name || docs[0].name+' merged',createdAt:now(),mode:'document',tags:[...new Set(docs.flatMap(d=>d.tags||[]))],pages:docs.flatMap(d=>d.pages.map(clonePage))});
    })
  };
}

export function createScannerProvider(React, Context, io) {
  return function ScannerProvider({children}) {
    const [store] = React.useState(() => createStore(io));
    const [documents,setDocuments] = React.useState([]), [loading,setLoading] = React.useState(true), [error,setError] = React.useState(null);
    React.useEffect(() => { const unsub=store.subscribe(setDocuments); store.load().catch(e=>setError(e.message)).finally(()=>setLoading(false)); return unsub; },[store]);
    const api = React.useMemo(() => {
      const guarded = fn => async (...args) => {try {const value=await fn(...args);setError(null);return value;} catch(e) {setError(e.message); throw e;}};
      const methods = Object.fromEntries(Object.entries(store).filter(([,v])=>typeof v === 'function').map(([k,v])=>[k,guarded(v)]));
      return {...methods, createDocument: guarded(async (files,name,mode='document') => {
        const input=Array.from(files||[]);
        if(!input.length) throw new Error('Import at least one page.');
        if(input.length>MAX_DOCUMENT_PAGES)throw new Error(`Import at most ${MAX_DOCUMENT_PAGES} pages into one document.`);
        const pages=[];
        for(let i=0;i<input.length;i++){const file=input[i];pages.push(await io.page(await io.readImage(file),i,file.name.replace(/\.[^.]+$/,''),mode));}
        return store.insert({name:name||input[0].name.replace(/\.[^.]+$/,''),mode,tags:[],pages});
      }), addPages: guarded(async (key,files) => {
        const input=Array.from(files||[]);if(!input.length)throw new Error('Add at least one page.');
        const current=store.getDocument(key);if(!current)throw new Error('Document no longer exists.');
        if(current.pages.length+input.length>MAX_DOCUMENT_PAGES)throw new Error(`A document can contain at most ${MAX_DOCUMENT_PAGES} pages.`);
        const pages=[];for(let i=0;i<input.length;i++){const file=input[i];pages.push(await io.page(await io.readImage(file),i,file.name.replace(/\.[^.]+$/,'')));}
        return store.append(key,pages);
      }),
      clearError:()=>setError(null)};
    },[store]);
    return React.createElement(Context.Provider,{value:{...api,documents,loading,error}},children);
  };
}
