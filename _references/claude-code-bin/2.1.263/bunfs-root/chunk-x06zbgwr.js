// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{X}from"/$bunfs/root/chunk-k6vqz9fa.js";import{b,u}from"/$bunfs/root/chunk-1m0n2kwr.js";import{u2,wi,Mi,Zn,Is}from"/$bunfs/root/chunk-82qrhb9b.js";import{yt,tK}from"/$bunfs/root/chunk-32f2qmtc.js";import{i}from"/$bunfs/root/chunk-y9tkdj4c.js";import{_}from"/$bunfs/root/chunk-9c9242q9.js";import{a}from"/$bunfs/root/chunk-bxegdt3f.js";import{Ee}from"/$bunfs/root/chunk-j6rfmzxq.js";import{Rn}from"/$bunfs/root/chunk-9wa0ka8p.js";function s(){return a.CLAUDE_JOB_DIR}async function Fat(n,e){i("tengu_bg_agent_action",{action:b("stop"),source:u(n),jobSessionId:Ee(X())});let o=s();if(yt()&&o){let r=new Date().toISOString(),t=await Zn(o,e);if(t&&!Is(t))await wi(o,{...t,state:"stopped",detail:"stopped from session",tempo:"idle",needs:void 0,block:void 0,inFlight:void 0,updatedAt:r,firstTerminalAt:t.firstTerminalAt??r},e).catch(Mi);if(tK())process.stdout.write(u2("Session stopped."))}return _("job_stop_self"),Rn(0,"prompt_input_exit",{suppressResumeHint:!0})}
export{Fat};
