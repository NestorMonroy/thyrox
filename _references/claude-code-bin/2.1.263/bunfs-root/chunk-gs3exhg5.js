// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{X,Bc}from"/$bunfs/root/chunk-k6vqz9fa.js";import{i}from"/$bunfs/root/chunk-y9tkdj4c.js";import{b,u}from"/$bunfs/root/chunk-1m0n2kwr.js";import{g}from"/$bunfs/root/chunk-9c9242q9.js";import{jB,l7e}from"/$bunfs/root/chunk-tpbaacey.js";function s(l){if(!l)return null;for(let n=l.length-1;n>=0;n--){let e=l[n];if(e?.type!=="attachment"||e.attachment.type!=="goal_status")continue;if(e.attachment.met||e.attachment.failed)return null;let t=e.attachment.condition;return typeof t==="string"&&t.length>0?t:null}return null}function tQt(l,n,e){let t=s(l),a=t!==null?l7e():null;if(a!==null)g("goal_set",a.code,{origin:u("restored")});let r;if(t===null||a!==null){if(n((o)=>(r=o.activeGoal,o.activeGoal===void 0?o:{...o,activeGoal:void 0})),r!==void 0)jB(r,"resume_swap");return}if(e.add(X(),"Stop","",{type:"prompt",prompt:t}),n((o)=>(r=o.activeGoal,{...o,activeGoal:{condition:t,iterations:0,setAt:Date.now(),origin:"restored",tokensAtStart:Bc()}})),r!==void 0)jB(r,"resume_swap");i("tengu_goal_restored_on_resume",{promptLength:t.length}),i("tengu_stop_hook_added",{promptLength:t.length,via:b("goal"),origin:u("restored")})}
export{tQt};
