// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{it}from"/$bunfs/root/chunk-t2x4z9pb.js";import{Eo}from"/$bunfs/root/chunk-6ghkw3jc.js";import{L3t,$Re,fq,e7e,d8r}from"/$bunfs/root/chunk-c1c3wvmj.js";import{execFile as c}from"child_process";var s=1e4,ysr=250,r=null,l;function Lao(){return l===!0}function Nao(){return e7e().lastKnown}function $ao(e){e7e().lastKnown=e}function a(e){return new Promise((o)=>{try{c("security",["find-generic-password","-a",fq(),"-w","-s",e],{encoding:"utf-8",timeout:s,windowsHide:!0},(t,i)=>{let n=Boolean(t&&"killed"in t&&t.killed);o(n?null:{stdout:t?null:i?.trim()||null})})}catch{o(null)}})}function _sr(){if(r||Eo())return;let e=e7e(),o=e.generation;return}async function Wwt(e){if(!r)return;await(e===void 0?r:it(r,e))}function Mkn(){e7e().legacyApiKeyPrefetch=null}
export{ysr,Lao,Nao,$ao,_sr,Wwt,Mkn};
