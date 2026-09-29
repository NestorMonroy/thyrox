// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Y}from"/$bunfs/root/chunk-d37h8mav.js";import{y,c}from"/$bunfs/root/chunk-czwr6846.js";import{L9,Ka,wl,Hr,Ni}from"/$bunfs/root/chunk-e06pb89d.js";import{i}from"/$bunfs/root/chunk-wt82nr44.js";import{_}from"/$bunfs/root/chunk-q5gkv7dz.js";import{a}from"/$bunfs/root/chunk-8whxj5sg.js";import{kt,Ine}from"/$bunfs/root/chunk-swk3rjnt.js";import{Qn}from"/$bunfs/root/chunk-77kn462z.js";import{ye}from"/$bunfs/root/chunk-vtvzrtws.js";function s(){return a.CLAUDE_JOB_DIR}async function W5t(n,e){i("tengu_bg_agent_action",{action:y("stop"),source:c(n),jobSessionId:ye(Y())});let o=s();if(kt()&&o){let r=new Date().toISOString(),t=await Hr(o,e);if(t&&!Ni(t))await Ka(o,{...t,state:"stopped",detail:"stopped from session",tempo:"idle",needs:void 0,block:void 0,inFlight:void 0,updatedAt:r,firstTerminalAt:t.firstTerminalAt??r},e).catch(wl);if(Ine())process.stdout.write(L9("Session stopped."))}return _("job_stop_self"),Qn(0,"prompt_input_exit",{suppressResumeHint:!0})}
export{W5t};
