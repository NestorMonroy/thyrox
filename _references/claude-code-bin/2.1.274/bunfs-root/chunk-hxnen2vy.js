// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{V}from"/$bunfs/root/chunk-ja309z9r.js";import{b,c}from"/$bunfs/root/chunk-64dkx51v.js";import{xK,aa,Ra,Sr,oi}from"/$bunfs/root/chunk-wae9xe9x.js";import{Et,$Y}from"/$bunfs/root/chunk-27bj2wbx.js";import{i}from"/$bunfs/root/chunk-qpc977f4.js";import{_}from"/$bunfs/root/chunk-marw4shk.js";import{a}from"/$bunfs/root/chunk-j96jysac.js";import{Vn}from"/$bunfs/root/chunk-ayyj05ne.js";import{be}from"/$bunfs/root/chunk-hyjn4arn.js";function s(){return a.CLAUDE_JOB_DIR}async function pRt(n,e){i("tengu_bg_agent_action",{action:b("stop"),source:c(n),jobSessionId:be(V())});let o=s();if(Et()&&o){let r=new Date().toISOString(),t=await Sr(o,e);if(t&&!oi(t))await aa(o,{...t,state:"stopped",detail:"stopped from session",tempo:"idle",needs:void 0,block:void 0,inFlight:void 0,updatedAt:r,firstTerminalAt:t.firstTerminalAt??r},e).catch(Ra);if($Y())process.stdout.write(xK("Session stopped."))}return _("job_stop_self"),Vn(0,"prompt_input_exit",{suppressResumeHint:!0})}
export{pRt};
