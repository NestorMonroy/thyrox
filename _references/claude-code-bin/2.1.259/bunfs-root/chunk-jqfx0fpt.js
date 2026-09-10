// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Q,Ec}from"/$bunfs/root/chunk-x1rrg5j2.js";import{s}from"/$bunfs/root/chunk-9f9fskgc.js";import{S,u}from"/$bunfs/root/chunk-97tbrkcc.js";import{g}from"/$bunfs/root/chunk-spz20jb6.js";import{GB,AXe}from"/$bunfs/root/chunk-xz3v8y7y.js";function Rhr(i){if(!i)return null;for(let n=i.length-1;n>=0;n--){let e=i[n];if(e?.type!=="attachment"||e.attachment.type!=="goal_status")continue;if(e.attachment.met||e.attachment.failed)return null;let t=e.attachment.condition;return typeof t==="string"&&t.length>0?t:null}return null}function aZt(i,n,e){let t=Rhr(i),l=t!==null?AXe():null;if(l!==null)g("goal_set",l.code,{origin:u("restored")});let r;if(t===null||l!==null){if(n((o)=>(r=o.activeGoal,o.activeGoal===void 0?o:{...o,activeGoal:void 0})),r!==void 0)GB(r,"resume_swap");return}if(e.add(Q(),"Stop","",{type:"prompt",prompt:t}),n((o)=>(r=o.activeGoal,{...o,activeGoal:{condition:t,iterations:0,setAt:Date.now(),origin:"restored",tokensAtStart:Ec()}})),r!==void 0)GB(r,"resume_swap");s("tengu_goal_restored_on_resume",{promptLength:t.length}),s("tengu_stop_hook_added",{promptLength:t.length,via:S("goal"),origin:u("restored")})}
export{Rhr,aZt};
