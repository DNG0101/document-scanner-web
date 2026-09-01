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
}catch(error){if(page){await fs.mkdir('test-results',{recursive:true});await page.screenshot({path:'test-results/failure.png'}).catch(()=>{});}throw error;}
finally{await browser?.close();server.kill();}
