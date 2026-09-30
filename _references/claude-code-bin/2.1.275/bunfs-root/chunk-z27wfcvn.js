// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Wc}from"/$bunfs/root/chunk-6tc74m82.js";import{d}from"/$bunfs/root/chunk-gh1pqen9.js";import{HD}from"/$bunfs/root/chunk-0hefd0r9.js";import{AI}from"/$bunfs/root/chunk-saj7trpt.js";import{ny}from"/$bunfs/root/chunk-083034fe.js";import{Bet}from"/$bunfs/root/chunk-b8fpne4s.js";import{e}from"/$bunfs/root/chunk-4m6y8tt1.js";var x9t=(p,r,c)=>new Promise((i,a)=>{let n=!1,o=null;function s(){return o!==null&&!Wc(o)}(async()=>{let{rerender:t,unmount:l,waitUntilExit:g}=await HD(e(ny,{children:e(Bet,{settings:p,baseline:c,reveal:"default",onAccept:()=>{if(!s())return!1;if(n=!0,i("approved"),r)t(null);else l()},onReject:()=>{if(!s())return!1;if(n=!0,i("rejected"),r)t(null);else l()}})},"managed-settings-security"),AI(!1));if(o=Date.now(),await g(),!n){let u=Error("Managed-settings consent dialog exited without an answer");d(u),a(u)}})().catch((t)=>{d(t),a(t)})});
export{x9t};
