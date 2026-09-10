// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Ot}from"/$bunfs/root/chunk-td0fv71w.js";import{po}from"/$bunfs/root/chunk-0sa7g6pk.js";import{LAt,Xme,lQ,iTe,Tsr}from"/$bunfs/root/chunk-0wc7a0ya.js";import{execFile as s}from"child_process";var l=1e4,wkn=250,r=null,c;function Gxr(){return c===!0}function Wxr(e){c=e}function zxr(){return iTe().lastKnown}function Vxr(e){iTe().lastKnown=e}function a(e){return new Promise((o)=>{try{s("security",["find-generic-password","-a",lQ(),"-w","-s",e],{encoding:"utf-8",timeout:l,windowsHide:!0},(t,i)=>{let n=Boolean(t&&"killed"in t&&t.killed);o(n?null:{stdout:t?null:i?.trim()||null})})}catch{o(null)}})}function Ekn(){if(r||po())return;let e=iTe(),o=e.generation;return}async function DQe(e){if(!r)return;await(e===void 0?r:Ot(r,e))}function qxr(){let e=iTe().legacyApiKeyPrefetch;return e==="pending"?null:e}function $8t(){iTe().legacyApiKeyPrefetch=null}
export{wkn,Gxr,Wxr,zxr,Vxr,Ekn,DQe,qxr,$8t};
