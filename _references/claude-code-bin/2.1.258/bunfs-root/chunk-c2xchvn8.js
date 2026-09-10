// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{t}from"/$bunfs/root/chunk-5nyank6v.js";import{RUe,Oxn}from"/$bunfs/root/chunk-62em4bpm.js";import{Fwt,grr,at,e9t,c7e,eBe,D9t,nBe,Ly,L,EBe}from"/$bunfs/root/chunk-8qt7d28b.js";var f="tengu_log_datadog_events";function D1n(){if(eBe("datadog"))return!1;try{return L(f,!1)}catch{return!1}}function s(e){try{Fwt(at())}catch{}return grr(e)}function d(e,n,a){let o=s(n),r=a!==null?{...o,sample_rate:a}:o;if(D1n())EBe(e,RUe(r));nBe(e,r)}var i=!1;function m(e,n){if(i){t(`logEvent reentered while collecting metadata \u2014 dropped ${e}. A getEventMetadata dependency (model/betas/auth) called logEvent synchronously; defer it (queueMicrotask) or move it out of the metadata path.`,{level:"error"});return}i=!0;try{let a=D9t(e);if(a===0)return;if(e9t()){d(e,n,a);return}let o=()=>{i=!0;try{d(e,n,a)}finally{i=!1}};c7e().then(o,o)}finally{i=!1}}async function u(e,n){let a=D9t(e);if(a===0)return;if(!e9t())await c7e();let o=s(n),r=a!==null?{...o,sample_rate:a}:o,l=[];if(D1n())l.push(EBe(e,RUe(r)));l.push(Ly(e,r)),await Promise.all(l)}function r9(){Oxn({logEvent:m,logEventAsync:u})}
export{D1n,r9};
