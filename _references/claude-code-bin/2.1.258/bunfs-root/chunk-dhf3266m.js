// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{W}from"/$bunfs/root/chunk-b1z7jvb2.js";import{ha}from"/$bunfs/root/chunk-js8fmpwp.js";import{h}from"/$bunfs/root/chunk-hfch6q45.js";import{mL}from"/$bunfs/root/chunk-tj5q8vxd.js";import{ZH}from"/$bunfs/root/chunk-7c7jern1.js";import{Tf}from"/$bunfs/root/chunk-wd6p43g2.js";import{tGe}from"/$bunfs/root/chunk-bx5gpn9s.js";import{e}from"/$bunfs/root/chunk-pbthxwmf.js";var hxt=(p,r,m)=>new Promise((i,s)=>{let n=!1,o=null;function a(){return o!==null&&!ha(o)}(async()=>{let{rerender:t,unmount:l,waitUntilExit:g}=await mL(e(Tf,{session:W(),children:e(tGe,{settings:p,baseline:m,reveal:"default",onAccept:()=>{if(!a())return!1;if(n=!0,i("approved"),r)t(null);else l()},onReject:()=>{if(!a())return!1;if(n=!0,i("rejected"),r)t(null);else l()}})},"managed-settings-security"),ZH(!1));if(o=Date.now(),await g(),!n){let u=Error("Managed-settings consent dialog exited without an answer");h(u),s(u)}})().catch((t)=>{h(t),s(t)})});
export{hxt};
