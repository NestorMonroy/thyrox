// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{FAc as m,HAc as c,IAc as g,JAc as r,LAc as h,NAc as S}from"/$bunfs/root/_690.js";import{bid as p,nid as y}from"/$bunfs/root/_824.js";import{qid as f,tid as w}from"/$bunfs/root/_825.js";import{xxd as s}from"/$bunfs/root/_837.js";var l=()=>{};import{execFile as P}from"child_process";function k(){return d===!0}function H(e){d=e}function B(){return r().lastKnown}function I(e){r().lastKnown=e}function u(e){return new Promise((i)=>{try{P("security",["find-generic-password","-a",g(),"-w","-s",e],{encoding:"utf-8",timeout:A,windowsHide:!0},(t,a)=>{let n=Boolean(t&&"killed"in t&&t.killed);i(n?null:{stdout:t?null:a?.trim()||null})})}catch{i(null)}})}function U(){if(o||p())return;let e=r(),i=e.generation;return}async function F(e){if(!o)return;await(e===void 0?o:f(o,e))}function D(){let e=r().legacyApiKeyPrefetch;return e==="pending"?null:e}function R(){r().legacyApiKeyPrefetch=null}var A=1e4,T=250,o=null,d;var K=s(()=>{y();w();S();l()});
export{l as uAc,T as vAc,k as wAc,H as xAc,B as yAc,I as zAc,U as AAc,F as BAc,D as CAc,R as DAc,K as EAc};
