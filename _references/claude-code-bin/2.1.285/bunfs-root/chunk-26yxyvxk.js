// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{l}from"/$bunfs/root/chunk-vqpmen5t.js";import{DO}from"/$bunfs/root/chunk-ym74p047.js";import{Nwe,Foo}from"/$bunfs/root/chunk-75hfr3en.js";var R3t=async(o,e)=>{let n=e.toolState.get(DO);if(o==="consent")try{return await Nwe(n,"agent_design_projects",e.credentials),{type:"text",value:"Design agent access granted for your Claude Design projects. Use /design revoke to undo."}}catch(t){return{type:"text",value:`Couldn't record Design agent access for ${"your Claude Design projects"} \u2014 ${l(t)}. Try again, or run /design-login to authorize Claude Design for this account.`}}try{return await Foo(n,"agent_design_projects",e.credentials),{type:"text",value:"Design agent access revoked for your Claude Design projects."}}catch(t){return{type:"text",value:`Couldn't revoke Design agent access for ${"your Claude Design projects"} \u2014 ${l(t)}. Try again, or run /design-login to authorize Claude Design for this account.`}}};
export{R3t};
