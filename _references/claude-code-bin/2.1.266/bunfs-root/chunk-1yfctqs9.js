// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{At}from"/$bunfs/root/chunk-rfvh2b8a.js";import{oo}from"/$bunfs/root/chunk-qsnhycbm.js";import{kxt,sye,UZ,w2e,opr}from"/$bunfs/root/chunk-p1db16q0.js";import{execFile as c}from"child_process";var s=1e4,d0n=250,r=null,l;function sAr(){return l===!0}function iAr(){return w2e().lastKnown}function aAr(e){w2e().lastKnown=e}function a(e){return new Promise((o)=>{try{c("security",["find-generic-password","-a",UZ(),"-w","-s",e],{encoding:"utf-8",timeout:s,windowsHide:!0},(t,i)=>{let n=Boolean(t&&"killed"in t&&t.killed);o(n?null:{stdout:t?null:i?.trim()||null})})}catch{o(null)}})}function p0n(){if(r||oo())return;let e=w2e(),o=e.generation;return}async function Lnt(e){if(!r)return;await(e===void 0?r:At(r,e))}function BXt(){w2e().legacyApiKeyPrefetch=null}
export{d0n,sAr,iAr,aAr,p0n,Lnt,BXt};
