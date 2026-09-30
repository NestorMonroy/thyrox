// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{J}from"/$bunfs/root/chunk-t8q7n4ta.js";import{_,u}from"/$bunfs/root/chunk-vkfaczp9.js";import{yz,Ti,ji,tr,Rs}from"/$bunfs/root/chunk-7tfkwhcm.js";import{_t,_4}from"/$bunfs/root/chunk-btbsn9s4.js";import{i}from"/$bunfs/root/chunk-74qghvre.js";import{b}from"/$bunfs/root/chunk-dzyeyv65.js";import{a}from"/$bunfs/root/chunk-9fmxymtw.js";import{Mn}from"/$bunfs/root/chunk-yw4jc948.js";import{we}from"/$bunfs/root/chunk-e5066x5s.js";function s(){return a.CLAUDE_JOB_DIR}async function cut(n,e){i("tengu_bg_agent_action",{action:_("stop"),source:u(n),jobSessionId:we(J())});let o=s();if(_t()&&o){let r=new Date().toISOString(),t=await tr(o,e);if(t&&!Rs(t))await Ti(o,{...t,state:"stopped",detail:"stopped from session",tempo:"idle",needs:void 0,block:void 0,inFlight:void 0,updatedAt:r,firstTerminalAt:t.firstTerminalAt??r},e).catch(ji);if(_4())process.stdout.write(yz("Session stopped."))}return b("job_stop_self"),Mn(0,"prompt_input_exit",{suppressResumeHint:!0})}
export{cut};
