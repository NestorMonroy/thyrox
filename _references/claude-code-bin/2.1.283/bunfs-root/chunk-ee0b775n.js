// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Y,Dp}from"/$bunfs/root/chunk-nvht7ckf.js";import{y,c}from"/$bunfs/root/chunk-vyyazxfq.js";import{i}from"/$bunfs/root/chunk-ab7mw5d9.js";import{p}from"/$bunfs/root/chunk-d09a8ccq.js";import{dDt,l5,uDt}from"/$bunfs/root/chunk-dzqjfsvd.js";function EJn(s,n,a){let e=dDt(s),r=e!==null?uDt():null;if(r!==null)p("goal_set",r.code,{origin:c("restored")});let t;if(e===null||r!==null){if(n((o)=>(t=o.activeGoal,o.activeGoal===void 0?o:{...o,activeGoal:void 0})),t!==void 0)l5(t,"resume_swap");return}if(a.add(Y(),"Stop","",{type:"prompt",prompt:e}),n((o)=>(t=o.activeGoal,{...o,activeGoal:{condition:e,iterations:0,setAt:Date.now(),origin:"restored",tokensAtStart:Dp()}})),t!==void 0)l5(t,"resume_swap");i("tengu_goal_restored_on_resume",{promptLength:e.length}),i("tengu_stop_hook_added",{promptLength:e.length,via:y("goal"),origin:c("restored")})}
export{EJn};
