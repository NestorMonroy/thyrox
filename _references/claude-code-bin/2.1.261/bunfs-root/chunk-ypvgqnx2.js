// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{n}from"/$bunfs/root/chunk-y5pwxex8.js";import{$je,KLn}from"/$bunfs/root/chunk-838r2s0v.js";import{kAt,orr,rt,$5t,EQe,_1e,m8t,b1e,Sy,I,G1e}from"/$bunfs/root/chunk-hyqdn9c0.js";var m="tengu_log_datadog_events";function s(){if(_1e("datadog"))return!1;try{return I(m,!1)}catch{return!1}}function f(t){try{kAt(rt())}catch{}return orr(t)}function d(t,o,e){let a=f(o),r=e!==null?{...a,sample_rate:e}:a;if(s())G1e(t,$je(r));b1e(t,r)}var i=!1;function u(t,o){if(i){n(`logEvent reentered while collecting metadata \u2014 dropped ${t}. A getEventMetadata dependency (model/betas/auth) called logEvent synchronously; defer it (queueMicrotask) or move it out of the metadata path.`,{level:"error"});return}i=!0;try{let e=m8t(t);if(e===0)return;if($5t()){d(t,o,e);return}let a=()=>{i=!0;try{d(t,o,e)}finally{i=!1}};EQe().then(a,a)}finally{i=!1}}async function g(t,o){let e=m8t(t);if(e===0)return;if(!$5t())await EQe();let a=f(o),r=e!==null?{...a,sample_rate:e}:a,l=[];if(s())l.push(G1e(t,$je(r)));l.push(Sy(t,r)),await Promise.all(l)}function b9(){KLn({logEvent:u,logEventAsync:g})}
export{b9};
