// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Q}from"/$bunfs/root/chunk-b1z7jvb2.js";import{S,u}from"/$bunfs/root/chunk-mrh5xd2h.js";import{C2,As,Fs,er,$i}from"/$bunfs/root/chunk-bnc671w7.js";import{ke,St,Pq}from"/$bunfs/root/chunk-8qt7d28b.js";import{s}from"/$bunfs/root/chunk-62em4bpm.js";import{_}from"/$bunfs/root/chunk-krz8ngz3.js";import{a}from"/$bunfs/root/chunk-sr28hb79.js";import{Ln}from"/$bunfs/root/chunk-vw215j9f.js";function n(){return a.CLAUDE_JOB_DIR}async function lst(i,e){s("tengu_bg_agent_action",{action:S("stop"),source:u(i),jobSessionId:ke(Q())});let o=n();if(St()&&o){let r=new Date().toISOString(),t=await er(o,e);if(t&&!$i(t))await As(o,{...t,state:"stopped",detail:"stopped from session",tempo:"idle",needs:void 0,block:void 0,inFlight:void 0,updatedAt:r,firstTerminalAt:t.firstTerminalAt??r},e).catch(Fs);if(Pq())process.stdout.write(C2("Session stopped."))}return _("job_stop_self"),Ln(0,"prompt_input_exit",{suppressResumeHint:!0})}
export{lst};
