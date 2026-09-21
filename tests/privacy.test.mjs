import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('app shell does not contact Google Fonts on load',()=>{
  assert.doesNotMatch(html,/fonts\.googleapis\.com|fonts\.gstatic\.com/);
});

test('app shell uses a bundled UI font and no-referrer policy',()=>{
  assert.match(html,/assets\/fonts\/NotoSans\.ttf/);
  assert.match(html,/name="referrer" content="no-referrer"/);
});
