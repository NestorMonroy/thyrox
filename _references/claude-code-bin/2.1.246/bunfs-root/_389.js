// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{NDb as s,ODb as i,PCb as a,QCb as d,SDb as u}from"/$bunfs/root/_564.js";import{Mud as n,zvd as l}from"/$bunfs/root/_831.js";import{xxd as g}from"/$bunfs/root/_837.js";var p="Usage: /design consent | /design revoke",w=async(c,e)=>{let o=c.trim().split(/\s+/).filter(Boolean)[0],y="your Claude Design projects",r=e.toolState.get(a);if(o==="consent")try{return await s(r,"agent_design_projects",e.credentials),{type:"text",value:"Design agent access granted for your Claude Design projects. Use /design revoke to undo."}}catch(t){return{type:"text",value:`Couldn't record Design agent access for ${"your Claude Design projects"} \u2014 ${n(t)}. Try again, or check your claude.ai login with /login.`}}if(o==="revoke")try{return await i(r,"agent_design_projects",e.credentials),{type:"text",value:"Design agent access revoked for your Claude Design projects."}}catch(t){return{type:"text",value:`Couldn't revoke Design agent access for ${"your Claude Design projects"} \u2014 ${n(t)}. Try again, or check your claude.ai login with /login.`}}return{type:"text",value:p}};var m=g(()=>{d();u();l()});
export{w as XO,m as YO};
