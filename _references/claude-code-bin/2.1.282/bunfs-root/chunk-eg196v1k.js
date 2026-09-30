// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{t}from"/$bunfs/root/chunk-nbcqw6vp.js";import{aut,s$r}from"/$bunfs/root/chunk-hm522bzh.js";import{bin,WEo,it,czn,cMt,Llt,Lzn,Nlt,rv,x}from"/$bunfs/root/chunk-wbbthbh9.js";import{Wit}from"/$bunfs/root/chunk-438a6bk3.js";var u="tengu_log_datadog_events";function s(){if(Llt("datadog"))return!1;try{return x(u,!1)}catch{return!1}}function f(e){try{bin(it())}catch{}return WEo(e)}function d(e,n,a){let o=f(n),r=a!==null?{...o,sample_rate:a}:o;if(s())Wit(e,aut(r));Nlt(e,r)}var i=!1;function m(e,n){if(i){t(`logEvent reentered while collecting metadata \u2014 dropped ${e}. A getEventMetadata dependency (model/betas/auth) called logEvent synchronously; defer it (queueMicrotask) or move it out of the metadata path.`,{level:"error"});return}i=!0;try{let a=Lzn(e);if(a===0)return;if(czn()){d(e,n,a);return}let o=()=>{i=!0;try{d(e,n,a)}finally{i=!1}};cMt().then(o,o)}finally{i=!1}}async function c(e,n){let a=Lzn(e);if(a===0)return;if(!czn())await cMt();let o=f(n),r=a!==null?{...o,sample_rate:a}:o,l=[];if(s())l.push(Wit(e,aut(r)));l.push(rv(e,r)),await Promise.all(l)}function Jq(){s$r({logEvent:m,logEventAsync:c})}
export{Jq};
