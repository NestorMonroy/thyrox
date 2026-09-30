// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{V,Qu}from"/$bunfs/root/chunk-4qqe0nh4.js";import{b,c}from"/$bunfs/root/chunk-gytndg57.js";import{i}from"/$bunfs/root/chunk-bkjq2ptm.js";import{f}from"/$bunfs/root/chunk-epe8zpsz.js";import{Lyt,wG,Nyt}from"/$bunfs/root/chunk-g9ggb16f.js";function SIn(s,n,a){let e=Lyt(s),r=e!==null?Nyt():null;if(r!==null)f("goal_set",r.code,{origin:c("restored")});let t;if(e===null||r!==null){if(n((o)=>(t=o.activeGoal,o.activeGoal===void 0?o:{...o,activeGoal:void 0})),t!==void 0)wG(t,"resume_swap");return}if(a.add(V(),"Stop","",{type:"prompt",prompt:e}),n((o)=>(t=o.activeGoal,{...o,activeGoal:{condition:e,iterations:0,setAt:Date.now(),origin:"restored",tokensAtStart:Qu()}})),t!==void 0)wG(t,"resume_swap");i("tengu_goal_restored_on_resume",{promptLength:e.length}),i("tengu_stop_hook_added",{promptLength:e.length,via:b("goal"),origin:c("restored")})}
export{SIn};
