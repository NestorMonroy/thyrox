// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{q,Zp}from"/$bunfs/root/chunk-hbjpbz2q.js";import{_,c}from"/$bunfs/root/chunk-dwaez71m.js";import{i}from"/$bunfs/root/chunk-r27mnwfc.js";import{f}from"/$bunfs/root/chunk-gm7a1q0z.js";import{bFt,y6,SFt}from"/$bunfs/root/chunk-5gres8e0.js";function orr(s,n,a){let e=bFt(s),r=e!==null?SFt():null;if(r!==null)f("goal_set",r.code,{origin:c("restored")});let t;if(e===null||r!==null){if(n((o)=>(t=o.activeGoal,o.activeGoal===void 0?o:{...o,activeGoal:void 0})),t!==void 0)y6(t,"resume_swap");return}if(a.add(q(),"Stop","",{type:"prompt",prompt:e}),n((o)=>(t=o.activeGoal,{...o,activeGoal:{condition:e,iterations:0,setAt:Date.now(),origin:"restored",tokensAtStart:Zp()}})),t!==void 0)y6(t,"resume_swap");i("tengu_goal_restored_on_resume",{promptLength:e.length}),i("tengu_stop_hook_added",{promptLength:e.length,via:_("goal"),origin:c("restored")})}
export{orr};
