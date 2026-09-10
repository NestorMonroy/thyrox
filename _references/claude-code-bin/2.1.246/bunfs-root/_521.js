// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Glb as g,Hlb as n,Jlb as v}from"/$bunfs/root/_522.js";import{iRb as a,jRb as b,pRb as m,rRb as h}from"/$bunfs/root/_589.js";import{sRb as u,tRb as A}from"/$bunfs/root/_590.js";import{pCc as c,vCc as f}from"/$bunfs/root/_697.js";import{jhd as t,ohd as l}from"/$bunfs/root/_820.js";import{xxd as d}from"/$bunfs/root/_837.js";import{format as o}from"util";class p{silly(e,...r){t(o(e,...r),{level:"debug"})}debug(e,...r){t(o(e,...r),{level:"debug"})}info(e,...r){t(o(e,...r),{level:"info"})}warn(e,...r){t(o(e,...r),{level:"warn"})}error(e,...r){t(o(e,...r),{level:"error"})}}function H(){let e=u();if(e.hostAdapter)return e.hostAdapter;return e.hostAdapter={serverName:c,logger:new p,executor:m({getMouseAnimationEnabled:()=>n().mouseAnimation,getHideBeforeActionEnabled:()=>n().hideBeforeAction}),ensureOsPermissions:async()=>{let r=a(),i=r.tcc.checkAccessibility(),s=r.tcc.checkScreenRecording();return i&&s?{granted:!0}:{granted:!1,accessibility:i,screenRecording:s}},isDisabled:()=>!g(),getSubGates:n,getAutoUnhideEnabled:()=>!0,cropRawPatch:()=>null},e.hostAdapter}var w=d(()=>{l();f();A();h();v();b()});
export{H as Elb,w as Flb};
