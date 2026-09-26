// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Y}from"/$bunfs/root/chunk-zwm3fybx.js";import{_,c}from"/$bunfs/root/chunk-zxcb8vnv.js";import{vY,Oa,ol,xr,Ci}from"/$bunfs/root/chunk-kda7f0br.js";import{i}from"/$bunfs/root/chunk-hm522bzh.js";import{y}from"/$bunfs/root/chunk-fq30rq8e.js";import{a}from"/$bunfs/root/chunk-h56wjcte.js";import{Et,pee}from"/$bunfs/root/chunk-wbbthbh9.js";import{Qn}from"/$bunfs/root/chunk-c9jscxk0.js";import{be}from"/$bunfs/root/chunk-99dxwxtw.js";function s(){return a.CLAUDE_JOB_DIR}async function fGt(n,e){i("tengu_bg_agent_action",{action:_("stop"),source:c(n),jobSessionId:be(Y())});let o=s();if(Et()&&o){let r=new Date().toISOString(),t=await xr(o,e);if(t&&!Ci(t))await Oa(o,{...t,state:"stopped",detail:"stopped from session",tempo:"idle",needs:void 0,block:void 0,inFlight:void 0,updatedAt:r,firstTerminalAt:t.firstTerminalAt??r},e).catch(ol);if(pee())process.stdout.write(vY("Session stopped."))}return y("job_stop_self"),Qn(0,"prompt_input_exit",{suppressResumeHint:!0})}
export{fGt};
