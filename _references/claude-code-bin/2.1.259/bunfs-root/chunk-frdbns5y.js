// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{t}from"/$bunfs/root/chunk-fzpv8ev5.js";import{d2e,ODn}from"/$bunfs/root/chunk-9f9fskgc.js";import{TAt,Osr,at,f5t,FQe,L1e,W5t,D1e,Fy,L,tUe}from"/$bunfs/root/chunk-x722nt0q.js";var f="tengu_log_datadog_events";function O2n(){if(L1e("datadog"))return!1;try{return L(f,!1)}catch{return!1}}function s(e){try{TAt(at())}catch{}return Osr(e)}function d(e,n,a){let o=s(n),r=a!==null?{...o,sample_rate:a}:o;if(O2n())tUe(e,d2e(r));D1e(e,r)}var i=!1;function m(e,n){if(i){t(`logEvent reentered while collecting metadata \u2014 dropped ${e}. A getEventMetadata dependency (model/betas/auth) called logEvent synchronously; defer it (queueMicrotask) or move it out of the metadata path.`,{level:"error"});return}i=!0;try{let a=W5t(e);if(a===0)return;if(f5t()){d(e,n,a);return}let o=()=>{i=!0;try{d(e,n,a)}finally{i=!1}};FQe().then(o,o)}finally{i=!1}}async function u(e,n){let a=W5t(e);if(a===0)return;if(!f5t())await FQe();let o=s(n),r=a!==null?{...o,sample_rate:a}:o,l=[];if(O2n())l.push(tUe(e,d2e(r)));l.push(Fy(e,r)),await Promise.all(l)}function F9(){ODn({logEvent:m,logEventAsync:u})}
export{O2n,F9};
