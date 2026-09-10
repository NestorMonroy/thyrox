// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{N2 as u,U2 as j}from"/$bunfs/root/_441.js";import{Y5a as b,f6a as y,p5a as S,q5a as l,v5a as _}from"/$bunfs/root/_468.js";import{Pcb as g,ddb as x}from"/$bunfs/root/_495.js";import{Djc as d,Fjc as O,Skc as h,skc as f,xkc as c}from"/$bunfs/root/_668.js";import{D_c as I,v_c as a}from"/$bunfs/root/_780.js";import{Tbd as v}from"/$bunfs/root/_811.js";import{ncd as m}from"/$bunfs/root/_812.js";import{Pcd as p,Rcd as k}from"/$bunfs/root/_814.js";import{Ckd as s,atd as D}from"/$bunfs/root/_826.js";import{ewd as i,fwd as n,nwd as B}from"/$bunfs/root/_833.js";import{xxd as A}from"/$bunfs/root/_837.js";function E(){return m.CLAUDE_JOB_DIR}async function U(w,e){p("tengu_bg_agent_action",{action:i("stop"),source:n(w),jobSessionId:d(s())});let o=E();if(f()&&o){let r=new Date().toISOString(),t=await _(o,e);if(t&&!b(t))await S(o,{...t,state:"stopped",detail:"stopped from session",tempo:"idle",needs:void 0,block:void 0,inFlight:void 0,updatedAt:r,firstTerminalAt:t.firstTerminalAt??r},e).catch(l);if(c())process.stdout.write(g("Session stopped."))}return a("job_stop_self"),u(0,"prompt_input_exit",{suppressResumeHint:!0})}var J=A(()=>{D();x();I();k();O();B();h();v();j();y()});
export{U as WH,J as XH};
