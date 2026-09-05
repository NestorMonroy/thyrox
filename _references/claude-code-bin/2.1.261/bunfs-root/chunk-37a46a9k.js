// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{Y}from"/$bunfs/root/chunk-annedm50.js";import{b,u}from"/$bunfs/root/chunk-2y9gqtpa.js";import{l2,wi,Mi,Zn,Is}from"/$bunfs/root/chunk-26vw39tf.js";import{yt,Zq}from"/$bunfs/root/chunk-hyqdn9c0.js";import{i}from"/$bunfs/root/chunk-838r2s0v.js";import{_}from"/$bunfs/root/chunk-vvf2tdhs.js";import{a}from"/$bunfs/root/chunk-a207t0vs.js";import{Ee}from"/$bunfs/root/chunk-d5174152.js";import{Rn}from"/$bunfs/root/chunk-vd630rs0.js";function s(){return a.CLAUDE_JOB_DIR}async function Nat(n,e){i("tengu_bg_agent_action",{action:b("stop"),source:u(n),jobSessionId:Ee(Y())});let o=s();if(yt()&&o){let r=new Date().toISOString(),t=await Zn(o,e);if(t&&!Is(t))await wi(o,{...t,state:"stopped",detail:"stopped from session",tempo:"idle",needs:void 0,block:void 0,inFlight:void 0,updatedAt:r,firstTerminalAt:t.firstTerminalAt??r},e).catch(Mi);if(Zq())process.stdout.write(l2("Session stopped."))}return _("job_stop_self"),Rn(0,"prompt_input_exit",{suppressResumeHint:!0})}
export{Nat};
