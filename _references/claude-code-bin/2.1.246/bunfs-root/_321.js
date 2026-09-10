// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{$vc as s,Dmc as A,Qrc as S,awc as _,omc as u,pmc as h,rmc as l,ymc as f,yrc as m,zmc as p}from"/$bunfs/root/_668.js";import{Icd as i,Ocd as d,Rcd as v}from"/$bunfs/root/_814.js";import{jhd as g,ohd as y}from"/$bunfs/root/_820.js";import{xxd as E}from"/$bunfs/root/_837.js";function c(){if(u("datadog"))return!1;try{return m(k,!1)}catch{return!1}}function M(t,o){if(r){g(`logEvent reentered while collecting metadata \u2014 dropped ${t}. A getEventMetadata dependency (model/betas/auth) called logEvent synchronously; defer it (queueMicrotask) or move it out of the metadata path.`,{level:"error"});return}r=!0;try{let e=l(t);if(e===0)return;let a=e!==null?{...o,sample_rate:e}:o;if(c())s(t,i(a));f(t,a)}finally{r=!1}}async function b(t,o){let e=l(t);if(e===0)return;let a=e!==null?{...o,sample_rate:e}:o,n=[];if(c())n.push(s(t,i(a)));n.push(p(t,a)),await Promise.all(n)}function I(){d({logEvent:M,logEventAsync:b})}var k="tengu_log_datadog_events",r=!1;var D=E(()=>{y();_();A();S();v();h()});
export{c as iH,I as jH,D as kH};
