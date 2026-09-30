// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{t}from"/$bunfs/root/chunk-6b6gfk00.js";import{L0}from"/$bunfs/root/chunk-5amhd006.js";import{Ae}from"/$bunfs/root/chunk-77kn462z.js";import{Upe}from"/$bunfs/root/chunk-kfnqep2p.js";import{bLe}from"/$bunfs/root/chunk-kdajstpm.js";import{mi}from"/$bunfs/root/chunk-ny5wsng0.js";function aCn(e,r,s){if(s.get(e)?.status!=="running")return;s.updateTranscript(e,(a)=>({...a,messages:bLe(a.messages,r)}))}function Dwt(e,r,s,a){let n=s.get(e);if(!n||mi(n.status)){t(`Dropping message for teammate task ${e}: task status is "${n?.status}"`);return}s.update(e,(m)=>({...m,pendingUserMessages:[...m.pendingUserMessages,{text:r,origin:a}]})),s.updateTranscript(e,(m)=>({...m,messages:bLe(m.messages,Ae({content:r,origin:a}))}))}function iir(e,r,s){let a=Upe(L0(r,s),e);if(a?.status==="running")a.retryWake?.emit()}
export{aCn,Dwt,iir};
