// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{t}from"/$bunfs/root/chunk-fy3j7rz0.js";import{Qze,l$n}from"/$bunfs/root/chunk-74qghvre.js";import{hCt,Flr,et,sYt,Zet,Hje,NYt,Mje,Ny,I,t2e}from"/$bunfs/root/chunk-btbsn9s4.js";var m="tengu_log_datadog_events";function s(){if(Hje("datadog"))return!1;try{return I(m,!1)}catch{return!1}}function f(e){try{hCt(et())}catch{}return Flr(e)}function d(e,n,a){let o=f(n),r=a!==null?{...o,sample_rate:a}:o;if(s())t2e(e,Qze(r));Mje(e,r)}var i=!1;function u(e,n){if(i){t(`logEvent reentered while collecting metadata \u2014 dropped ${e}. A getEventMetadata dependency (model/betas/auth) called logEvent synchronously; defer it (queueMicrotask) or move it out of the metadata path.`,{level:"error"});return}i=!0;try{let a=NYt(e);if(a===0)return;if(sYt()){d(e,n,a);return}let o=()=>{i=!0;try{d(e,n,a)}finally{i=!1}};Zet().then(o,o)}finally{i=!1}}async function g(e,n){let a=NYt(e);if(a===0)return;if(!sYt())await Zet();let o=f(n),r=a!==null?{...o,sample_rate:a}:o,l=[];if(s())l.push(t2e(e,Qze(r)));l.push(Ny(e,r)),await Promise.all(l)}function W6(){l$n({logEvent:u,logEventAsync:g})}
export{W6};
