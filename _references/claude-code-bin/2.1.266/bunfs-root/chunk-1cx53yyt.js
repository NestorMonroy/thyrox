// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{B}from"/$bunfs/root/chunk-t8q7n4ta.js";import{xl}from"/$bunfs/root/chunk-6nd7jk67.js";import{h}from"/$bunfs/root/chunk-jvycdhmw.js";import{TH}from"/$bunfs/root/chunk-5zps47bf.js";import{GT}from"/$bunfs/root/chunk-61kg6xrt.js";import{lg}from"/$bunfs/root/chunk-bn7wpb3g.js";import{gqe}from"/$bunfs/root/chunk-99v4x8hh.js";import{e}from"/$bunfs/root/chunk-zhg3ync1.js";var vOt=(p,r,m)=>new Promise((i,s)=>{let n=!1,o=null;function a(){return o!==null&&!xl(o)}(async()=>{let{rerender:t,unmount:l,waitUntilExit:g}=await TH(e(lg,{session:B(),children:e(gqe,{settings:p,baseline:m,reveal:"default",onAccept:()=>{if(!a())return!1;if(n=!0,i("approved"),r)t(null);else l()},onReject:()=>{if(!a())return!1;if(n=!0,i("rejected"),r)t(null);else l()}})},"managed-settings-security"),GT(!1));if(o=Date.now(),await g(),!n){let u=Error("Managed-settings consent dialog exited without an answer");h(u),s(u)}})().catch((t)=>{h(t),s(t)})});
export{vOt};
