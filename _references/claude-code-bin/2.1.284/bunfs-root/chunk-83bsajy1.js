// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Y,Kp}from"/$bunfs/root/chunk-d37h8mav.js";import{y,c}from"/$bunfs/root/chunk-czwr6846.js";import{i}from"/$bunfs/root/chunk-wt82nr44.js";import{p}from"/$bunfs/root/chunk-q5gkv7dz.js";import{xNt,F3,PNt}from"/$bunfs/root/chunk-zjmg8mxz.js";function ger(s,n,a){let e=xNt(s),r=e!==null?PNt():null;if(r!==null)p("goal_set",r.code,{origin:c("restored")});let t;if(e===null||r!==null){if(n((o)=>(t=o.activeGoal,o.activeGoal===void 0?o:{...o,activeGoal:void 0})),t!==void 0)F3(t,"resume_swap");return}if(a.add(Y(),"Stop","",{type:"prompt",prompt:e}),n((o)=>(t=o.activeGoal,{...o,activeGoal:{condition:e,iterations:0,setAt:Date.now(),origin:"restored",tokensAtStart:Kp()}})),t!==void 0)F3(t,"resume_swap");i("tengu_goal_restored_on_resume",{promptLength:e.length}),i("tengu_stop_hook_added",{promptLength:e.length,via:y("goal"),origin:c("restored")})}
export{ger};
