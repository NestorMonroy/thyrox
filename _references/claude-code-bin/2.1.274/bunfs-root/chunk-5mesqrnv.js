// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{Nc}from"/$bunfs/root/chunk-32grsnwh.js";import{d}from"/$bunfs/root/chunk-b565vq97.js";import{pD}from"/$bunfs/root/chunk-x41kazpn.js";import{$x}from"/$bunfs/root/chunk-08804jyy.js";import{zh}from"/$bunfs/root/chunk-sbf0dh5c.js";import{LQe}from"/$bunfs/root/chunk-natjhkys.js";import{e}from"/$bunfs/root/chunk-kd9k0apc.js";var K6t=(p,r,c)=>new Promise((i,a)=>{let n=!1,o=null;function s(){return o!==null&&!Nc(o)}(async()=>{let{rerender:t,unmount:l,waitUntilExit:g}=await pD(e(zh,{children:e(LQe,{settings:p,baseline:c,reveal:"default",onAccept:()=>{if(!s())return!1;if(n=!0,i("approved"),r)t(null);else l()},onReject:()=>{if(!s())return!1;if(n=!0,i("rejected"),r)t(null);else l()}})},"managed-settings-security"),$x(!1));if(o=Date.now(),await g(),!n){let u=Error("Managed-settings consent dialog exited without an answer");d(u),a(u)}})().catch((t)=>{d(t),a(t)})});
export{K6t};
