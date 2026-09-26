// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{V}from"/$bunfs/root/chunk-t6d3nxvc.js";class Me extends Error{name="HooksError";telemetryMessage="function hooks error (message not reported: it may contain plugin details)";thrownName}function Hxr(e){if(!(e instanceof Error))return;let t=e.cause;return typeof t==="string"?t:void 0}function Cat(e,t="aborted"){let{reason:o}=e;return o instanceof Error?o.message:o===void 0?t:String(o)}function i0t(e,t){if(!V(e))throw new Me(`${t}: next() takes the event's argument: next(e) passes it on, next({ ...e, x }) rewrites it`);return e}var Gvo=(e)=>typeof e==="object"&&e!==null&&("aborted"in e)&&typeof e.addEventListener==="function"&&typeof e.removeEventListener==="function";var Nke=(e)=>new Me(`${e}: its environment was unloaded`);function bl(){let e;return{set:(t)=>{e=t},get:()=>e}}var Hjn=bl();var a0t=()=>Hjn.get();export{Cat,Me,i0t,Hxr,Gvo,Nke,bl,Hjn,a0t};
