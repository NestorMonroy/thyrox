// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{tt}from"/$bunfs/root/chunk-bz96yhka.js";import{Jr}from"/$bunfs/root/chunk-0j2vcydt.js";import{dyn,aBe,j6,Lmt,L1o,N1o}from"/$bunfs/root/chunk-00mawwda.js";import{execFile as c}from"child_process";var s=1e4,KGr=250,o=null,u;function w7o(){return u===!0}function v7o(){return Lmt().lastKnown}function E7o(e){Lmt().lastKnown=e}function a(e){return new Promise((r)=>{try{c("security",["find-generic-password","-a",j6(),"-w","-s",e],{encoding:"utf-8",timeout:s,windowsHide:!0},(t,i)=>{let n=Boolean(t&&"killed"in t&&t.killed);r(n?null:{stdout:t?null:i?.trim()||null})})}catch{r(null)}})}function YGr(){if(o||Jr())return;let e=Lmt(),r=e.generation;return}async function C1t(e){if(!o)return;await(e===void 0?o:tt(o,e))}function R8n(){Lmt().legacyApiKeyPrefetch=null}
export{KGr,w7o,v7o,E7o,YGr,C1t,R8n};
