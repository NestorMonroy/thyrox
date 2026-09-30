// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{l}from"/$bunfs/root/chunk-d5d0zdsy.js";import{jR}from"/$bunfs/root/chunk-wrjbravb.js";import{rde,dkr}from"/$bunfs/root/chunk-1wqdwapg.js";var VPt=async(o,e)=>{let n=e.toolState.get(jR);if(o==="consent")try{return await rde(n,"agent_design_projects",e.credentials),{type:"text",value:"Design agent access granted for your Claude Design projects. Use /design revoke to undo."}}catch(t){return{type:"text",value:`Couldn't record Design agent access for ${"your Claude Design projects"} \u2014 ${l(t)}. Try again, or run /design-login to authorize Claude Design for this account.`}}try{return await dkr(n,"agent_design_projects",e.credentials),{type:"text",value:"Design agent access revoked for your Claude Design projects."}}catch(t){return{type:"text",value:`Couldn't revoke Design agent access for ${"your Claude Design projects"} \u2014 ${l(t)}. Try again, or run /design-login to authorize Claude Design for this account.`}}};
export{VPt};
