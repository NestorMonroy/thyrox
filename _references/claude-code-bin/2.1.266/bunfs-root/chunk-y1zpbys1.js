// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{t}from"/$bunfs/root/chunk-fy3j7rz0.js";import{Mx}from"/$bunfs/root/chunk-btbsn9s4.js";import{Rpe,u7,Ce}from"/$bunfs/root/chunk-yw4jc948.js";import{Cs}from"/$bunfs/root/chunk-y1keqvk9.js";function JUt(e,r,s){if(s.get(e)?.status!=="running")return;s.updateTranscript(e,(a)=>({...a,messages:Rpe(a.messages,r)}))}function N3e(e,r,s,a){let n=s.get(e);if(!n||Cs(n.status)){t(`Dropping message for teammate task ${e}: task status is "${n?.status}"`);return}s.update(e,(m)=>({...m,pendingUserMessages:[...m.pendingUserMessages,{text:r,origin:a}]})),s.updateTranscript(e,(m)=>({...m,messages:Rpe(m.messages,Ce({content:r,origin:a}))}))}function mcn(e,r,s){let a=u7(Mx(r,s),e);if(a?.status==="running")a.retryWake?.emit()}
export{JUt,N3e,mcn};
