// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{D_c as d,v_c as n,w_c as s,x_c as i}from"/$bunfs/root/_780.js";import{Aud as o,zvd as a}from"/$bunfs/root/_831.js";d();a();class u extends Error{subtype;constructor(r,e){super(`control_request '${r}' got no response after ${e/1000}s \u2014 the worker may still apply it`);this.subtype=r}}class c extends Error{subtype;constructor(r){super("Request was not delivered to the cloud session");this.subtype=r}}function f(r){if(r instanceof o)return"aborted";if(r instanceof u)return"timeout";if(r instanceof c)return"not_delivered";if(r instanceof Error&&(r.message.endsWith("Disconnected")||r.message.endsWith("Connection to remote lost")))return"disconnected";if(r instanceof Error&&(r.message.endsWith("not connected")||r.message.includes("Cannot send:")))return"not_connected";return"server_error"}async function m(r,e){try{let t=await e();return n(r),t}catch(t){if(t instanceof o)i(r,"aborted");else s(r,f(t));throw t}}function y(r){if(r.subtype==="error"&&typeof r.error==="string")return Error(r.error);let e=r.subtype==="error"?"non-string error":`subtype ${typeof r.subtype==="string"?"unrecognized":typeof r.subtype}`;return Error(`Malformed control_response from worker (${e})`)}
export{u as Oo,c as Po,f as Qo,m as Ro,y as So};
