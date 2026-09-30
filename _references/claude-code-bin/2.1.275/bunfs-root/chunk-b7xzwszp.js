// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{te}from"/$bunfs/root/chunk-q8sknw7e.js";class Ne extends Error{name="HooksError";thrownName}function Ner(e){if(!(e instanceof Error))return;let t=e.cause;return typeof t==="string"?t:void 0}function sbt(e,t="aborted"){let{reason:o}=e;return o instanceof Error?o.message:o===void 0?t:String(o)}function LVt(e,t){if(!te(e))throw new Ne(`${t}: next() takes the event's argument: next(e) passes it on, next({ ...e, x }) rewrites it`);return e}var dKr=(e)=>typeof e==="object"&&e!==null&&("aborted"in e)&&typeof e.addEventListener==="function"&&typeof e.removeEventListener==="function";var Che=(e)=>new Ne(`${e}: its environment was unloaded`);function _c(){let e;return{set:(t)=>{e=t},get:()=>e}}var ywn=_c();var ibt=()=>ywn.get();export{sbt,Ne,LVt,Ner,dKr,Che,_c,ywn,ibt};
