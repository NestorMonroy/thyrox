// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Y,kp}from"/$bunfs/root/chunk-zwm3fybx.js";import{_,c}from"/$bunfs/root/chunk-zxcb8vnv.js";import{i}from"/$bunfs/root/chunk-hm522bzh.js";import{p}from"/$bunfs/root/chunk-fq30rq8e.js";import{qHt,N4,KHt}from"/$bunfs/root/chunk-45qprvaj.js";function n6n(s,n,a){let e=qHt(s),r=e!==null?KHt():null;if(r!==null)p("goal_set",r.code,{origin:c("restored")});let t;if(e===null||r!==null){if(n((o)=>(t=o.activeGoal,o.activeGoal===void 0?o:{...o,activeGoal:void 0})),t!==void 0)N4(t,"resume_swap");return}if(a.add(Y(),"Stop","",{type:"prompt",prompt:e}),n((o)=>(t=o.activeGoal,{...o,activeGoal:{condition:e,iterations:0,setAt:Date.now(),origin:"restored",tokensAtStart:kp()}})),t!==void 0)N4(t,"resume_swap");i("tengu_goal_restored_on_resume",{promptLength:e.length}),i("tengu_stop_hook_added",{promptLength:e.length,via:_("goal"),origin:c("restored")})}
export{n6n};
