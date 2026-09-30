// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{nt}from"/$bunfs/root/chunk-jxwbd5gq.js";import{Xr}from"/$bunfs/root/chunk-4cnes656.js";import{dmn,zFe,u6,Mpt,LNo,NNo}from"/$bunfs/root/chunk-vpxas6dq.js";import{execFile as c}from"child_process";var s=1e4,FBr=250,o=null,u;function mYo(){return u===!0}function gYo(){return Mpt().lastKnown}function hYo(e){Mpt().lastKnown=e}function a(e){return new Promise((r)=>{try{c("security",["find-generic-password","-a",u6(),"-w","-s",e],{encoding:"utf-8",timeout:s,windowsHide:!0},(t,i)=>{let n=Boolean(t&&"killed"in t&&t.killed);r(n?null:{stdout:t?null:i?.trim()||null})})}catch{r(null)}})}function UBr(){if(o||Xr())return;let e=Mpt(),r=e.generation;return}async function tUt(e){if(!o)return;await(e===void 0?o:nt(o,e))}function G3n(){Mpt().legacyApiKeyPrefetch=null}
export{FBr,mYo,gYo,hYo,UBr,tUt,G3n};
