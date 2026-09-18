// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{t}from"/$bunfs/root/chunk-r2c9k9kh.js";import{vJe,Dor}from"/$bunfs/root/chunk-qpc977f4.js";import{cWt,qjr,rt,qyn,qht,VYe,XYe,M_n,JYe,eS,I}from"/$bunfs/root/chunk-27bj2wbx.js";var u="tengu_log_datadog_events";function s(){if(XYe("datadog"))return!1;try{return I(u,!1)}catch{return!1}}function f(e){try{cWt(rt())}catch{}return qjr(e)}function d(e,n,a){let o=f(n),r=a!==null?{...o,sample_rate:a}:o;if(s())VYe(e,vJe(r));JYe(e,r)}var i=!1;function m(e,n){if(i){t(`logEvent reentered while collecting metadata \u2014 dropped ${e}. A getEventMetadata dependency (model/betas/auth) called logEvent synchronously; defer it (queueMicrotask) or move it out of the metadata path.`,{level:"error"});return}i=!0;try{let a=M_n(e);if(a===0)return;if(qyn()){d(e,n,a);return}let o=()=>{i=!0;try{d(e,n,a)}finally{i=!1}};qht().then(o,o)}finally{i=!1}}async function c(e,n){let a=M_n(e);if(a===0)return;if(!qyn())await qht();let o=f(n),r=a!==null?{...o,sample_rate:a}:o,l=[];if(s())l.push(VYe(e,vJe(r)));l.push(eS(e,r)),await Promise.all(l)}function K2(){Dor({logEvent:m,logEventAsync:c})}
export{K2};
