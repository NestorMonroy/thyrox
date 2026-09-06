// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{n}from"/$bunfs/root/chunk-mh9y4c2z.js";import{Mje,XLn}from"/$bunfs/root/chunk-y9tkdj4c.js";import{TAt,arr,rt,M5t,EQe,b1e,g8t,S1e,Sy,I,z1e}from"/$bunfs/root/chunk-32f2qmtc.js";var m="tengu_log_datadog_events";function s(){if(b1e("datadog"))return!1;try{return I(m,!1)}catch{return!1}}function f(t){try{TAt(rt())}catch{}return arr(t)}function d(t,o,e){let a=f(o),r=e!==null?{...a,sample_rate:e}:a;if(s())z1e(t,Mje(r));S1e(t,r)}var i=!1;function u(t,o){if(i){n(`logEvent reentered while collecting metadata \u2014 dropped ${t}. A getEventMetadata dependency (model/betas/auth) called logEvent synchronously; defer it (queueMicrotask) or move it out of the metadata path.`,{level:"error"});return}i=!0;try{let e=g8t(t);if(e===0)return;if(M5t()){d(t,o,e);return}let a=()=>{i=!0;try{d(t,o,e)}finally{i=!1}};EQe().then(a,a)}finally{i=!1}}async function g(t,o){let e=g8t(t);if(e===0)return;if(!M5t())await EQe();let a=f(o),r=e!==null?{...a,sample_rate:e}:a,l=[];if(s())l.push(z1e(t,Mje(r)));l.push(Sy(t,r)),await Promise.all(l)}function H9(){XLn({logEvent:u,logEventAsync:g})}
export{H9};
