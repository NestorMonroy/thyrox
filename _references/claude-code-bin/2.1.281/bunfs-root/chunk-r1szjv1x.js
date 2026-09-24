// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{K}from"/$bunfs/root/chunk-b93xrf5w.js";class Me extends Error{name="HooksError";telemetryMessage="function hooks error (message not reported: it may contain plugin details)";thrownName}function STr(e){if(!(e instanceof Error))return;let t=e.cause;return typeof t==="string"?t:void 0}function jst(e,t="aborted"){let{reason:o}=e;return o instanceof Error?o.message:o===void 0?t:String(o)}function NPt(e,t){if(!K(e))throw new Me(`${t}: next() takes the event's argument: next(e) passes it on, next({ ...e, x }) rewrites it`);return e}var Iyo=(e)=>typeof e==="object"&&e!==null&&("aborted"in e)&&typeof e.addEventListener==="function"&&typeof e.removeEventListener==="function";var yEe=(e)=>new Me(`${e}: its environment was unloaded`);function al(){let e;return{set:(t)=>{e=t},get:()=>e}}var aUn=al();var $Pt=()=>aUn.get();export{jst,Me,NPt,STr,Iyo,yEe,al,aUn,$Pt};
