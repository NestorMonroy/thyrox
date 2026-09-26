// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{rt}from"/$bunfs/root/chunk-dbjks79r.js";import{fo}from"/$bunfs/root/chunk-37swe2q7.js";import{jcn,LNe,M5,jct,cxo,dxo}from"/$bunfs/root/chunk-qpevst33.js";import{execFile as c}from"child_process";var s=1e4,SMr=250,o=null,u;function mzo(){return u===!0}function gzo(){return jct().lastKnown}function hzo(e){jct().lastKnown=e}function a(e){return new Promise((r)=>{try{c("security",["find-generic-password","-a",M5(),"-w","-s",e],{encoding:"utf-8",timeout:s,windowsHide:!0},(t,i)=>{let n=Boolean(t&&"killed"in t&&t.killed);r(n?null:{stdout:t?null:i?.trim()||null})})}catch{r(null)}})}function wMr(){if(o||fo())return;let e=jct(),r=e.generation;return}async function kLt(e){if(!o)return;await(e===void 0?o:rt(o,e))}function _2n(){jct().legacyApiKeyPrefetch=null}
export{SMr,mzo,gzo,hzo,wMr,kLt,_2n};
