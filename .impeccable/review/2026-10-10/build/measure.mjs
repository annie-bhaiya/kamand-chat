import {chromium} from 'file:///C:/Users/Msi%201/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const dir='E:/chat-utkarsh/artifacts/.presentation-build';
const data=JSON.parse(await fs.readFile(dir+'/text-metrics.json','utf8'));
const b=await chromium.launch({channel:'msedge',headless:true});const p=await b.newPage();
await p.goto('http://localhost:3100');await p.getByRole('heading',{name:'Welcome to Kamand Chat'}).waitFor();
const output=await p.evaluate(async data=>{await document.fonts.ready;const family=getComputedStyle(document.body).fontFamily;const ctx=document.createElement('canvas').getContext('2d');return data.map(t=>{ctx.font=`${{Regular:400,Medium:500,SemiBold:600,Bold:700}[t.style]} ${t.size}px ${family}`;let lines=0;for(const paragraph of t.text.split('\n')){let line='';lines++;for(const word of paragraph.split(' ')){const test=line?line+' '+word:word;if(ctx.measureText(test).width>t.w-2 && line){lines++;line=word;}else line=test;}}return {id:t.id,w:t.w,h:Math.ceil(lines*t.size*1.2+3),lines};});},data);
await fs.writeFile(dir+'/measured.json',JSON.stringify(output));console.log(JSON.stringify(output));await b.close();
