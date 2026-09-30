// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{V,Wp}from"/$bunfs/root/chunk-bxhyh54r.js";import{_,c}from"/$bunfs/root/chunk-aap6zsd0.js";import{i}from"/$bunfs/root/chunk-gn6mgw10.js";import{f}from"/$bunfs/root/chunk-dpwtsz9f.js";import{lNt,V3,cNt}from"/$bunfs/root/chunk-4hdx46mf.js";function fer(s,n,a){let e=lNt(s),r=e!==null?cNt():null;if(r!==null)f("goal_set",r.code,{origin:c("restored")});let t;if(e===null||r!==null){if(n((o)=>(t=o.activeGoal,o.activeGoal===void 0?o:{...o,activeGoal:void 0})),t!==void 0)V3(t,"resume_swap");return}if(a.add(V(),"Stop","",{type:"prompt",prompt:e}),n((o)=>(t=o.activeGoal,{...o,activeGoal:{condition:e,iterations:0,setAt:Date.now(),origin:"restored",tokensAtStart:Wp()}})),t!==void 0)V3(t,"resume_swap");i("tengu_goal_restored_on_resume",{promptLength:e.length}),i("tengu_stop_hook_added",{promptLength:e.length,via:_("goal"),origin:c("restored")})}
export{fer};
