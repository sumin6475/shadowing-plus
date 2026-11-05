import test from 'node:test';
import assert from 'node:assert/strict';
import {FOCUS_COPY,hasFocusText,focusWithinLimit} from '../src/lib/speaking-focus-copy.ts';
test('all six first languages supply complete examples, separate from saved text',()=>{
 assert.deepEqual(Object.keys(FOCUS_COPY).sort(),['en','es','ja','ko','ru','zh-Hant'].sort());
 for(const copy of Object.values(FOCUS_COPY)){assert.ok(copy.opening&&copy.closing&&copy.prompt);assert.equal(copy.bullets.length,2);assert.ok(copy.bullets.some(s=>s.includes('explain')));}
 assert.equal(hasFocusText(' \n\u200b\uFEFF'),false);
 assert.equal(hasFocusText('내 초점'),true);
});
test('focus limits count Unicode code points and UTF8 html bytes independently',()=>{
 assert.equal(focusWithinLimit('🙂'.repeat(12000),''),true);
 assert.equal(focusWithinLimit('🙂'.repeat(12001),''),false);
 assert.equal(focusWithinLimit('ok','한'.repeat(20001)),false);
 assert.equal(focusWithinLimit('',''),true);
});
