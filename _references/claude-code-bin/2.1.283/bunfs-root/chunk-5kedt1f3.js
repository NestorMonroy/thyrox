// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Y}from"/$bunfs/root/chunk-nvht7ckf.js";import{y,c}from"/$bunfs/root/chunk-vyyazxfq.js";import{t9,ja,ml,Pr,Hi}from"/$bunfs/root/chunk-mxz6ht5b.js";import{i}from"/$bunfs/root/chunk-ab7mw5d9.js";import{_}from"/$bunfs/root/chunk-d09a8ccq.js";import{a}from"/$bunfs/root/chunk-v49zfq06.js";import{vt,jte}from"/$bunfs/root/chunk-t6pwageh.js";import{Kn}from"/$bunfs/root/chunk-csayct82.js";import{_e}from"/$bunfs/root/chunk-34s7cqpd.js";function s(){return a.CLAUDE_JOB_DIR}async function mKt(n,e){i("tengu_bg_agent_action",{action:y("stop"),source:c(n),jobSessionId:_e(Y())});let o=s();if(vt()&&o){let r=new Date().toISOString(),t=await Pr(o,e);if(t&&!Hi(t))await ja(o,{...t,state:"stopped",detail:"stopped from session",tempo:"idle",needs:void 0,block:void 0,inFlight:void 0,updatedAt:r,firstTerminalAt:t.firstTerminalAt??r},e).catch(ml);if(jte())process.stdout.write(t9("Session stopped."))}return _("job_stop_self"),Kn(0,"prompt_input_exit",{suppressResumeHint:!0})}
export{mKt};
