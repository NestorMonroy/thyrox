// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{V,Bu}from"/$bunfs/root/chunk-ja309z9r.js";import{b,c}from"/$bunfs/root/chunk-64dkx51v.js";import{i}from"/$bunfs/root/chunk-qpc977f4.js";import{g}from"/$bunfs/root/chunk-marw4shk.js";import{wgt,KW,vgt}from"/$bunfs/root/chunk-3a3evbfh.js";function YAn(s,n,a){let e=wgt(s),r=e!==null?vgt():null;if(r!==null)g("goal_set",r.code,{origin:c("restored")});let t;if(e===null||r!==null){if(n((o)=>(t=o.activeGoal,o.activeGoal===void 0?o:{...o,activeGoal:void 0})),t!==void 0)KW(t,"resume_swap");return}if(a.add(V(),"Stop","",{type:"prompt",prompt:e}),n((o)=>(t=o.activeGoal,{...o,activeGoal:{condition:e,iterations:0,setAt:Date.now(),origin:"restored",tokensAtStart:Bu()}})),t!==void 0)KW(t,"resume_swap");i("tengu_goal_restored_on_resume",{promptLength:e.length}),i("tengu_stop_hook_added",{promptLength:e.length,via:b("goal"),origin:c("restored")})}
export{YAn};
