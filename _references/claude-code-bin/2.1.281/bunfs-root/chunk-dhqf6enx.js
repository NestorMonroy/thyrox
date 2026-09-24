// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{t}from"/$bunfs/root/chunk-wfscmafr.js";import{XO}from"/$bunfs/root/chunk-jcesa5j7.js";import{Ae}from"/$bunfs/root/chunk-4n4g22z6.js";import{wle}from"/$bunfs/root/chunk-pq1hgqcb.js";import{ZPe}from"/$bunfs/root/chunk-jnq4br38.js";import{ti}from"/$bunfs/root/chunk-zbv3j381.js";function dfn(e,r,s){if(s.get(e)?.status!=="running")return;s.updateTranscript(e,(a)=>({...a,messages:ZPe(a.messages,r)}))}function Tpt(e,r,s,a){let n=s.get(e);if(!n||ti(n.status)){t(`Dropping message for teammate task ${e}: task status is "${n?.status}"`);return}s.update(e,(m)=>({...m,pendingUserMessages:[...m.pendingUserMessages,{text:r,origin:a}]})),s.updateTranscript(e,(m)=>({...m,messages:ZPe(m.messages,Ae({content:r,origin:a}))}))}function F4n(e,r,s){let a=wle(XO(r,s),e);if(a?.status==="running")a.retryWake?.emit()}
export{dfn,Tpt,F4n};
