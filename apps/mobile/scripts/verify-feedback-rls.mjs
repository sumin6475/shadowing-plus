// Run only against an explicitly configured test environment after migration
// 036. Seed account A through the UI: focus, analysis, targeted retry. No model
// outputs or learner text are printed by this harness.
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
function value(name){if(!process.env[name])throw new Error(`Missing ${name}`);return process.env[name];}
const url=value('FEEDBACK_RLS_TEST_URL'),key=value('FEEDBACK_RLS_TEST_ANON_KEY');
const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const a=createClient(url,key,options),b=createClient(url,key,options);
try{
 const login=async(c,label)=>{const {data,error}=await c.auth.signInWithPassword({email:value(`RLS_TEST_${label}_EMAIL`),password:value(`RLS_TEST_${label}_PASSWORD`)});assert.ifError(error);assert.ok(data.user);return data.user.id;};
 const ua=await login(a,'A'),ub=await login(b,'B');assert.notEqual(ua,ub);
 for(const table of ['coaching_preferences','coaching_profile_versions','talk_feedback_reports','talk_feedback_retries','feedback_generation_attempts']){
  const owner=await a.from(table).select('user_id').eq('user_id',ua).limit(1);assert.ifError(owner.error);assert.equal(owner.data.length,1,`Seed account A's ${table} before this test`);
  const read=await b.from(table).select('user_id').eq('user_id',ua);assert.ifError(read.error);assert.equal(read.data.length,0);
  for(const result of [await a.from(table).update({user_id:ua}).eq('user_id',ua),await b.from(table).delete().eq('user_id',ua),await b.from(table).insert({user_id:ua})])assert.equal(result.error?.code,'42501',`${table} denies client mutations`);
  console.log(`PASS: ${table} owner read, isolated read and protected writes`);
 }
 const claim=await a.rpc('claim_feedback_generation',{p_user:ua,p_kind:'report',p_fingerprint:'forbidden'});assert.equal(claim.error?.code,'42501');
 console.log('PASS: service-only generation claim');
}finally{await a.auth.signOut();await b.auth.signOut();}
