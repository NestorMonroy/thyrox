// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{ne}from"/$bunfs/root/chunk-q77993h4.js";class Ne extends Error{name="HooksError";thrownName}function Wer(e){if(!(e instanceof Error))return;let t=e.cause;return typeof t==="string"?t:void 0}function Abt(e,t="aborted"){let{reason:o}=e;return o instanceof Error?o.message:o===void 0?t:String(o)}function pVt(e,t){if(!ne(e))throw new Ne(`${t}: next() takes the event's argument: next(e) passes it on, next({ ...e, x }) rewrites it`);return e}var oVr=(e)=>typeof e==="object"&&e!==null&&("aborted"in e)&&typeof e.addEventListener==="function"&&typeof e.removeEventListener==="function";var ghe=(e)=>new Ne(`${e}: its environment was unloaded`);function ku(){let e;return{set:(t)=>{e=t},get:()=>e}}var OSn=ku();var Tbt=()=>OSn.get();export{Abt,Ne,pVt,Wer,oVr,ghe,ku,OSn,Tbt};
