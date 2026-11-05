import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
function moduleFrom(path,dependencies){
 const api={};const code=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 runInNewContext(code,{exports:api,expo:{uuidv4:()=>"11111111-1111-4111-8111-111111111111"},require:name=>{if(!(name in dependencies))throw new Error(`Unexpected dependency ${name}`);return dependencies[name];}});return api;
}
test('the existing CEFR choice is claimed once and never inherited by another account',async()=>{
 const data=new Map();let level='b2';
 const api=moduleFrom('../src/lib/coaching-level-migration.ts',{'@react-native-async-storage/async-storage':{getItem:async key=>data.get(key)??null,setItem:async(key,value)=>data.set(key,value)},'./english-level':{englishLevel:()=>level}});
 assert.equal(await api.initialCoachingLevel('owner-a'),'b2');level='c1';
 assert.equal(await api.initialCoachingLevel('owner-b'),'b1');
 assert.equal(await api.initialCoachingLevel('owner-a'),'b2');
});
test('a failed or in-progress update keeps the previous completed review accessible',async()=>{
 for(const status of ['failed','generating']){
  const latest={id:'new',status},ready={id:'old',status:'ready'};
  const db={from:()=>{let completed=false;const query={select:()=>query,eq:(key,value)=>{if(key==='status'&&value==='ready')completed=true;return query;},order:()=>query,limit:()=>query,maybeSingle:async()=>({data:completed?ready:latest,error:null})};return query;},auth:{getUser:async()=>({data:{user:{id:'owner'}},error:null})}};
  const api=moduleFrom('../src/lib/advanced-feedback.ts',{'./coaching-level-migration':{},'./supabase':{supabase:db},'./ai-consent':{}});
  const state=await api.loadFeedbackState('session');assert.equal(state.report.id,'old');assert.equal(state.attempt.status,status);
 }
});
test('a draft from an old account cannot be submitted under a new session token',async()=>{
 let invoked=false;
 const api=moduleFrom('../src/lib/advanced-feedback.ts',{'./coaching-level-migration':{},'./supabase':{supabase:{auth:{getSession:async()=>({data:{session:{user:{id:'new-owner'},access_token:'new-token'}}})},functions:{invoke:()=>{invoked=true;}}}},'./ai-consent':{}});
 await assert.rejects(api.saveCoachingPreferences({revision:0,richText:'private old draft',level:'b2',language:'ko'},'old-owner'),/account changed/);assert.equal(invoked,false);
});

test('profile compilation and analysis use separate authenticated requests',async()=>{
 const calls=[];
 const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:{user_id:'owner'},error:null})};
 const db={auth:{getUser:async()=>({data:{user:{id:'owner'}},error:null}),getSession:async()=>({data:{session:{user:{id:'owner'},access_token:'owner-token'}}})},from:()=>query,functions:{invoke:async(name,options)=>{calls.push({name,...options});return {data:name==='coaching-profile'?{profile:{}}:{report:{status:'ready'}},error:null};}}};
 const api=moduleFrom('../src/lib/advanced-feedback.ts',{'./coaching-level-migration':{},'./supabase':{supabase:db},'./ai-consent':{requireAiProcessingConsent:async()=>{}}});
 await api.analyzeFeedback('session',{ownerId:'owner'});
 assert.deepEqual(calls.map(c=>c.name),['coaching-profile','talk-advanced-feedback']);assert.equal(calls[0].body.operation,'compile');
 assert.ok(calls.every(c=>c.headers.Authorization==='Bearer owner-token'));
});
