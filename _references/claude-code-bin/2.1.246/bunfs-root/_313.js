// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{G0c as o,O0c as a}from"/$bunfs/root/_753.js";a();var i=1048576;async function s(t){let e;try{e=await d(t)}catch(r){return{kind:"threw",error:r}}if(!e.ok){let r="telemetryCode"in e.error?e.error.telemetryCode:void 0;if(r==="ENXIO"||r==="EISDIR"||r==="EFBIG")return{kind:"refused"};return{kind:"failed",error:e.error}}let n=e.value.items[0];if(!n.found)return{kind:"absent"};if(n.totalBytes>i)return{kind:"refused"};return{kind:"text",text:Buffer.from(n.value).toString("utf8")}}function d(t){return t.read([{key:o.state("daemon-config"),offset:0,length:i+1}])}
export{i as NG,s as OG};
