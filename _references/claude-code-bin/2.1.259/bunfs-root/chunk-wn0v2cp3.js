// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{z}from"/$bunfs/root/chunk-x1rrg5j2.js";import{Ha}from"/$bunfs/root/chunk-z98654x2.js";import{h}from"/$bunfs/root/chunk-6rkpsn9e.js";import{uL}from"/$bunfs/root/chunk-h8z84shc.js";import{cw}from"/$bunfs/root/chunk-22nrstsb.js";import{Pf}from"/$bunfs/root/chunk-g26yx69g.js";import{MWe}from"/$bunfs/root/chunk-v9sy60rn.js";import{e}from"/$bunfs/root/chunk-g3erx2ps.js";var mPt=(p,r,m)=>new Promise((i,s)=>{let n=!1,o=null;function a(){return o!==null&&!Ha(o)}(async()=>{let{rerender:t,unmount:l,waitUntilExit:g}=await uL(e(Pf,{session:z(),children:e(MWe,{settings:p,baseline:m,reveal:"default",onAccept:()=>{if(!a())return!1;if(n=!0,i("approved"),r)t(null);else l()},onReject:()=>{if(!a())return!1;if(n=!0,i("rejected"),r)t(null);else l()}})},"managed-settings-security"),cw(!1));if(o=Date.now(),await g(),!n){let u=Error("Managed-settings consent dialog exited without an answer");h(u),s(u)}})().catch((t)=>{h(t),s(t)})});
export{mPt};
