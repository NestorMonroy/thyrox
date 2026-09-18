// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{V}from"/$bunfs/root/chunk-4qqe0nh4.js";import{b,c}from"/$bunfs/root/chunk-gytndg57.js";import{l4,da,Ma,wr,fi}from"/$bunfs/root/chunk-f3t284zj.js";import{Et,C9}from"/$bunfs/root/chunk-xbd48fav.js";import{i}from"/$bunfs/root/chunk-bkjq2ptm.js";import{_}from"/$bunfs/root/chunk-epe8zpsz.js";import{a}from"/$bunfs/root/chunk-crr3rzxx.js";import{Qn}from"/$bunfs/root/chunk-q2gh92k2.js";import{be}from"/$bunfs/root/chunk-pvbbfbpd.js";function s(){return a.CLAUDE_JOB_DIR}async function UIt(n,e){i("tengu_bg_agent_action",{action:b("stop"),source:c(n),jobSessionId:be(V())});let o=s();if(Et()&&o){let r=new Date().toISOString(),t=await wr(o,e);if(t&&!fi(t))await da(o,{...t,state:"stopped",detail:"stopped from session",tempo:"idle",needs:void 0,block:void 0,inFlight:void 0,updatedAt:r,firstTerminalAt:t.firstTerminalAt??r},e).catch(Ma);if(C9())process.stdout.write(l4("Session stopped."))}return _("job_stop_self"),Qn(0,"prompt_input_exit",{suppressResumeHint:!0})}
export{UIt};
