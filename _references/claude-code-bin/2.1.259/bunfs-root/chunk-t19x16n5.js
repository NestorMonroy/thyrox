// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Q}from"/$bunfs/root/chunk-x1rrg5j2.js";import{S,u}from"/$bunfs/root/chunk-97tbrkcc.js";import{X2,Is,Ws,Zn,Fi}from"/$bunfs/root/chunk-m1g84jsb.js";import{Te,St,fK}from"/$bunfs/root/chunk-x722nt0q.js";import{s}from"/$bunfs/root/chunk-9f9fskgc.js";import{_}from"/$bunfs/root/chunk-spz20jb6.js";import{a}from"/$bunfs/root/chunk-m92n5xra.js";import{Pn}from"/$bunfs/root/chunk-qpwbvc04.js";function n(){return a.CLAUDE_JOB_DIR}async function Jat(i,e){s("tengu_bg_agent_action",{action:S("stop"),source:u(i),jobSessionId:Te(Q())});let o=n();if(St()&&o){let r=new Date().toISOString(),t=await Zn(o,e);if(t&&!Fi(t))await Is(o,{...t,state:"stopped",detail:"stopped from session",tempo:"idle",needs:void 0,block:void 0,inFlight:void 0,updatedAt:r,firstTerminalAt:t.firstTerminalAt??r},e).catch(Ws);if(fK())process.stdout.write(X2("Session stopped."))}return _("job_stop_self"),Pn(0,"prompt_input_exit",{suppressResumeHint:!0})}
export{Jat};
