// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{t}from"/$bunfs/root/chunk-6w550002.js";import{qyt,t6r}from"/$bunfs/root/chunk-r27mnwfc.js";import{Kgn,OBo,et,F8n,JBt,ygt,l9n,_gt,pE,R}from"/$bunfs/root/chunk-4hjp8tw4.js";import{dft}from"/$bunfs/root/chunk-3e19xgms.js";var u="tengu_log_datadog_events";function s(){if(ygt("datadog"))return!1;try{return R(u,!1)}catch{return!1}}function f(e){try{Kgn(et())}catch{}return OBo(e)}function d(e,n,a){let o=f(n),r=a!==null?{...o,sample_rate:a}:o;if(s())dft(e,qyt(r));_gt(e,r)}var i=!1;function m(e,n){if(i){t(`logEvent reentered while collecting metadata \u2014 dropped ${e}. A getEventMetadata dependency (model/betas/auth) called logEvent synchronously; defer it (queueMicrotask) or move it out of the metadata path.`,{level:"error"});return}i=!0;try{let a=l9n(e);if(a===0)return;if(F8n()){d(e,n,a);return}let o=()=>{i=!0;try{d(e,n,a)}finally{i=!1}};JBt().then(o,o)}finally{i=!1}}async function c(e,n){let a=l9n(e);if(a===0)return;if(!F8n())await JBt();let o=f(n),r=a!==null?{...o,sample_rate:a}:o,l=[];if(s())l.push(dft(e,qyt(r)));l.push(pE(e,r)),await Promise.all(l)}function N5(){t6r({logEvent:m,logEventAsync:c})}
export{N5};
