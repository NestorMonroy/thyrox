// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{t}from"/$bunfs/root/chunk-6b6gfk00.js";import{tht,Nqr}from"/$bunfs/root/chunk-wt82nr44.js";import{Ufn,cNo,st,m6n,iUt,Hft,j6n,Mft,Gv,x}from"/$bunfs/root/chunk-swk3rjnt.js";import{$ut}from"/$bunfs/root/chunk-3sjn0fns.js";var u="tengu_log_datadog_events";function s(){if(Hft("datadog"))return!1;try{return x(u,!1)}catch{return!1}}function f(e){try{Ufn(st())}catch{}return cNo(e)}function d(e,n,a){let o=f(n),r=a!==null?{...o,sample_rate:a}:o;if(s())$ut(e,tht(r));Mft(e,r)}var i=!1;function m(e,n){if(i){t(`logEvent reentered while collecting metadata \u2014 dropped ${e}. A getEventMetadata dependency (model/betas/auth) called logEvent synchronously; defer it (queueMicrotask) or move it out of the metadata path.`,{level:"error"});return}i=!0;try{let a=j6n(e);if(a===0)return;if(m6n()){d(e,n,a);return}let o=()=>{i=!0;try{d(e,n,a)}finally{i=!1}};iUt().then(o,o)}finally{i=!1}}async function c(e,n){let a=j6n(e);if(a===0)return;if(!m6n())await iUt();let o=f(n),r=a!==null?{...o,sample_rate:a}:o,l=[];if(s())l.push($ut(e,tht(r)));l.push(Gv(e,r)),await Promise.all(l)}function Q4(){Nqr({logEvent:m,logEventAsync:c})}
export{Q4};
