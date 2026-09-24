// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Y}from"/$bunfs/root/chunk-cqc88nqm.js";import{b,c}from"/$bunfs/root/chunk-rnxz8hs2.js";import{I6,Ga,_l,xr,Ii}from"/$bunfs/root/chunk-ew6qt9wg.js";import{i}from"/$bunfs/root/chunk-bh8vsyek.js";import{y}from"/$bunfs/root/chunk-2pwc1ycq.js";import{a}from"/$bunfs/root/chunk-ay603yys.js";import{Tt,pZ}from"/$bunfs/root/chunk-5khn4tvf.js";import{Qn}from"/$bunfs/root/chunk-4n4g22z6.js";import{be}from"/$bunfs/root/chunk-j9g7t4xw.js";function s(){return a.CLAUDE_JOB_DIR}async function bjt(n,e){i("tengu_bg_agent_action",{action:b("stop"),source:c(n),jobSessionId:be(Y())});let o=s();if(Tt()&&o){let r=new Date().toISOString(),t=await xr(o,e);if(t&&!Ii(t))await Ga(o,{...t,state:"stopped",detail:"stopped from session",tempo:"idle",needs:void 0,block:void 0,inFlight:void 0,updatedAt:r,firstTerminalAt:t.firstTerminalAt??r},e).catch(_l);if(pZ())process.stdout.write(I6("Session stopped."))}return y("job_stop_self"),Qn(0,"prompt_input_exit",{suppressResumeHint:!0})}
export{bjt};
