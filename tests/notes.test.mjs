import test from 'node:test';
import assert from 'node:assert/strict';
import {wrapNotes,dragRegion} from '../src/text-pages.js';
test('long notes paginate without losing characters',()=>{const text='x'.repeat(200);const pages=wrapNotes(text,s=>s.length,10,3);assert.equal(pages.length,7);assert.equal(pages.flat().join(''),text);assert.ok(pages.flat().every(s=>s.length<=10));});
test('notes preserve blank lines and Unicode',()=>assert.deepEqual(wrapNotes('नमस्ते\n\nRésumé',s=>s.length,100),[['नमस्ते','','Résumé']]));
test('empty notes are rejected',()=>assert.throws(()=>wrapNotes('  ',s=>s.length),/Enter/));
test('backwards region drags normalize and clamp',()=>assert.deepEqual(dragRegion([90,80],[-10,20]),{x:0,y:20,w:90,h:60}));
