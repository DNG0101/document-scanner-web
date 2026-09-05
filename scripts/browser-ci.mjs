import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const port=4180,url=`http://127.0.0.1:${port}/document-scanner-web/`;
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:'inherit'});
let browser,page;
async function waitEnabled(locator,expected){for(let i=0;i<200;i++){if(await locator.isEnabled()===expected)return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error(`Control did not become ${expected?'enabled':'disabled'}.`);}
try{
  for(let i=0;i<40;i++){try{if((await fetch(url)).ok)break;}catch{}if(i===39)throw Error('Preview server did not start');await new Promise(resolve=>setTimeout(resolve,250));}
  browser=await chromium.launch();page=await browser.newPage({viewport:{width:1280,height:900}});
  await page.goto(url+'tests/integration.html');
  await page.waitForFunction(()=>!document.querySelector('#run').disabled,{timeout:120000});
  await page.getByRole('button',{name:'Run checks',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#summary').textContent.includes('checks finished'),{timeout:180000});
  const summary=await page.locator('#summary').innerText(),results=await page.locator('#results').innerText();
  console.log(summary+'\n'+results);assert.match(summary,/38 checks finished; 0 failures/);
  await page.getByRole('link',{name:'Open synthetic review sample'}).click();
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:900});
    await page.getByRole('button',{name:'Preview & review PDF',exact:true}).click();
    await page.getByRole('img',{name:'PDF preview page 1',exact:true}).waitFor();
    const mark=page.getByRole('button',{name:'Mark document reviewed',exact:true});
    await waitEnabled(mark,false);
    await page.getByRole('button',{name:'Next',exact:true}).click();
    await page.getByRole('img',{name:'PDF preview page 2',exact:true}).waitFor();
    await waitEnabled(mark,true);
    await waitEnabled(page.getByRole('button',{name:'Next',exact:true}),false);
    await fs.mkdir('test-results',{recursive:true});await page.screenshot({path:`test-results/preview-${width}.png`});
    await page.getByRole('button',{name:'Mark document reviewed',exact:true}).click();
    await page.getByText('Reviewed',{exact:true}).waitFor();
    console.log(`PASS: preview and review at ${width}px`);
  }
  await page.setViewportSize({width:1280,height:900});
  await page.getByText('Pages, exports & conversion',{exact:true}).click();
  await page.getByLabel('Page selection',{exact:true}).fill('2');
  await page.getByRole('button',{name:'Preview selected PDF',exact:true}).click();
  await page.getByRole('img',{name:'PDF preview page 1',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Mark document reviewed',exact:true}).count(),0);
  await page.getByRole('button',{name:'Close preview',exact:true}).click();
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Download selected PDF',exact:true}).click();
  const pdfDownload=await downloaded;assert.match(pdfDownload.suggestedFilename(),/-selected.pdf$/);
  await page.getByText('More page tools',{exact:true}).click();
  await page.getByLabel('New text page',{exact:true}).fill(Array(45).fill('Complete notes stay searchable.').join('\n'));
  await page.getByRole('button',{name:'Append text pages',exact:true}).click();
  await page.getByText('2 searchable text page(s) appended.',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Page 3 03',exact:true}).click();
  assert.match(await page.getByLabel('Extracted text',{exact:true}).inputValue(),/Complete notes/);
  await page.getByText('Region OCR & redaction',{exact:true}).click();
  const region=page.getByLabel('Select region on page',{exact:true});await region.scrollIntoViewIfNeeded();
  await page.getByRole('img',{name:'Region selection preview',exact:true}).waitFor();
  const box=await region.boundingBox();await page.mouse.move(box.x+box.width*.1,box.y+box.height*.1);await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.4,{steps:8});await page.mouse.up();
  assert.ok(Number(await page.getByLabel('Width (%)',{exact:true}).inputValue())>55);
  await page.getByRole('button',{name:'Create redacted copy',exact:true}).click();
  await page.getByText('Redacted copy created in library. Review its exact covered region before sharing.',{exact:true}).waitFor();
  await page.screenshot({path:'test-results/new-page-tools.png'});
  console.log('PASS: selected PDF preview/download, paginated searchable notes, region dragging and redaction');
}catch(error){if(page){await fs.mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/failure.png'}).catch(()=>{});}throw error;}
finally{await browser?.close();server.kill();}
