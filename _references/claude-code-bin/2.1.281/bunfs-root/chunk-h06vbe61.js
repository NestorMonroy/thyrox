// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Y,Wu}from"/$bunfs/root/chunk-cqc88nqm.js";import{b,c}from"/$bunfs/root/chunk-rnxz8hs2.js";import{i}from"/$bunfs/root/chunk-bh8vsyek.js";import{p}from"/$bunfs/root/chunk-2pwc1ycq.js";import{CIt,t4,RIt}from"/$bunfs/root/chunk-pq51evng.js";function rKn(s,n,a){let e=CIt(s),r=e!==null?RIt():null;if(r!==null)p("goal_set",r.code,{origin:c("restored")});let t;if(e===null||r!==null){if(n((o)=>(t=o.activeGoal,o.activeGoal===void 0?o:{...o,activeGoal:void 0})),t!==void 0)t4(t,"resume_swap");return}if(a.add(Y(),"Stop","",{type:"prompt",prompt:e}),n((o)=>(t=o.activeGoal,{...o,activeGoal:{condition:e,iterations:0,setAt:Date.now(),origin:"restored",tokensAtStart:Wu()}})),t!==void 0)t4(t,"resume_swap");i("tengu_goal_restored_on_resume",{promptLength:e.length}),i("tengu_stop_hook_added",{promptLength:e.length,via:b("goal"),origin:c("restored")})}
export{rKn};
