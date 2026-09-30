// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{t}from"/$bunfs/root/chunk-4bbpt7sc.js";import{yQe,Pcr}from"/$bunfs/root/chunk-bkjq2ptm.js";import{JVt,RKr,nt,hvn,Ubt,sJe,lJe,sEn,cJe,mS,I}from"/$bunfs/root/chunk-xbd48fav.js";var u="tengu_log_datadog_events";function s(){if(lJe("datadog"))return!1;try{return I(u,!1)}catch{return!1}}function f(e){try{JVt(nt())}catch{}return RKr(e)}function d(e,n,a){let o=f(n),r=a!==null?{...o,sample_rate:a}:o;if(s())sJe(e,yQe(r));cJe(e,r)}var i=!1;function m(e,n){if(i){t(`logEvent reentered while collecting metadata \u2014 dropped ${e}. A getEventMetadata dependency (model/betas/auth) called logEvent synchronously; defer it (queueMicrotask) or move it out of the metadata path.`,{level:"error"});return}i=!0;try{let a=sEn(e);if(a===0)return;if(hvn()){d(e,n,a);return}let o=()=>{i=!0;try{d(e,n,a)}finally{i=!1}};Ubt().then(o,o)}finally{i=!1}}async function c(e,n){let a=sEn(e);if(a===0)return;if(!hvn())await Ubt();let o=f(n),r=a!==null?{...o,sample_rate:a}:o,l=[];if(s())l.push(sJe(e,yQe(r)));l.push(mS(e,r)),await Promise.all(l)}function Mz(){Pcr({logEvent:m,logEventAsync:c})}
export{Mz};
