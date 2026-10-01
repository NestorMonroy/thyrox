// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{q}from"/$bunfs/root/chunk-hbjpbz2q.js";import{_,c}from"/$bunfs/root/chunk-dwaez71m.js";import{DX,Ka,Tl,Mr,Ki}from"/$bunfs/root/chunk-j6mm9mhr.js";import{i}from"/$bunfs/root/chunk-r27mnwfc.js";import{y}from"/$bunfs/root/chunk-gm7a1q0z.js";import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{Rt,pre}from"/$bunfs/root/chunk-4hjp8tw4.js";import{Vn}from"/$bunfs/root/chunk-kt4703ww.js";import{ye}from"/$bunfs/root/chunk-nptqjrtp.js";function s(){return a.CLAUDE_JOB_DIR}async function q6t(n,e){i("tengu_bg_agent_action",{action:_("stop"),source:c(n),jobSessionId:ye(q())});let o=s();if(Rt()&&o){let r=new Date().toISOString(),t=await Mr(o,e);if(t&&!Ki(t))await Ka(o,{...t,state:"stopped",detail:"stopped from session",tempo:"idle",needs:void 0,block:void 0,inFlight:void 0,updatedAt:r,firstTerminalAt:t.firstTerminalAt??r},e).catch(Tl);if(pre())process.stdout.write(DX("Session stopped."))}return y("job_stop_self"),Vn(0,"prompt_input_exit",{suppressResumeHint:!0})}
export{q6t};
