// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{pt}from"/$bunfs/root/chunk-akpzg2yh.js";import{wo}from"/$bunfs/root/chunk-53a5hn9r.js";import{zqt,iCe,MG,j9e,vqr}from"/$bunfs/root/chunk-843kre03.js";import{execFile as c}from"child_process";var s=1e4,kZn=250,r=null,l;function Xeo(){return l===!0}function Jeo(){return j9e().lastKnown}function Qeo(e){j9e().lastKnown=e}function a(e){return new Promise((o)=>{try{c("security",["find-generic-password","-a",MG(),"-w","-s",e],{encoding:"utf-8",timeout:s,windowsHide:!0},(t,i)=>{let n=Boolean(t&&"killed"in t&&t.killed);o(n?null:{stdout:t?null:i?.trim()||null})})}catch{o(null)}})}function AZn(){if(r||wo())return;let e=j9e(),o=e.generation;return}async function Z_t(e){if(!r)return;await(e===void 0?r:pt(r,e))}function iSn(){j9e().legacyApiKeyPrefetch=null}
export{kZn,Xeo,Jeo,Qeo,AZn,Z_t,iSn};
