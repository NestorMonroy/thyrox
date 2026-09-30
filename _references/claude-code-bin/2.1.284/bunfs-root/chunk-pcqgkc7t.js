// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{G}from"/$bunfs/root/chunk-e1ahn80a.js";class He extends Error{name="HooksError";telemetryMessage="function hooks error (message not reported: it may contain plugin details)";thrownName}function qFr(e){if(!(e instanceof Error))return;let t=e.cause;return typeof t==="string"?t:void 0}function wpt(e,t="aborted"){let{reason:o}=e;return o instanceof Error?o.message:o===void 0?t:String(o)}function Y$t(e,t){if(!G(e))throw new He(`${t}: next() takes the event's argument: next(e) passes it on, next({ ...e, x }) rewrites it`);return e}var aLo=(e)=>typeof e==="object"&&e!==null&&("aborted"in e)&&typeof e.addEventListener==="function"&&typeof e.removeEventListener==="function";var ZCe=(e)=>new He(`${e}: its environment was unloaded`);function Ks(){let e;return{set:(t)=>{e=t},get:()=>e}}var P5n=Ks();var X$t=()=>P5n.get();export{wpt,He,Y$t,qFr,aLo,ZCe,Ks,P5n,X$t};
