// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{t}from"/$bunfs/root/chunk-055ns4k8.js";import{Vgt,hKr}from"/$bunfs/root/chunk-gn6mgw10.js";import{ufn,XLo,rt,I3n,WFt,Eft,Z3n,kft,Xv,x}from"/$bunfs/root/chunk-f74xvn8g.js";import{_ut}from"/$bunfs/root/chunk-kjsx66fy.js";var u="tengu_log_datadog_events";function s(){if(Eft("datadog"))return!1;try{return x(u,!1)}catch{return!1}}function f(e){try{ufn(rt())}catch{}return XLo(e)}function d(e,n,a){let o=f(n),r=a!==null?{...o,sample_rate:a}:o;if(s())_ut(e,Vgt(r));kft(e,r)}var i=!1;function m(e,n){if(i){t(`logEvent reentered while collecting metadata \u2014 dropped ${e}. A getEventMetadata dependency (model/betas/auth) called logEvent synchronously; defer it (queueMicrotask) or move it out of the metadata path.`,{level:"error"});return}i=!0;try{let a=Z3n(e);if(a===0)return;if(I3n()){d(e,n,a);return}let o=()=>{i=!0;try{d(e,n,a)}finally{i=!1}};WFt().then(o,o)}finally{i=!1}}async function c(e,n){let a=Z3n(e);if(a===0)return;if(!I3n())await WFt();let o=f(n),r=a!==null?{...o,sample_rate:a}:o,l=[];if(s())l.push(_ut(e,Vgt(r)));l.push(Xv(e,r)),await Promise.all(l)}function f5(){hKr({logEvent:m,logEventAsync:c})}
export{f5};
