// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{t}from"/$bunfs/root/chunk-055ns4k8.js";import{$D}from"/$bunfs/root/chunk-vd01jhy3.js";import{Ce}from"/$bunfs/root/chunk-qazw855w.js";import{N0e}from"/$bunfs/root/chunk-pqj7t96h.js";import{Wpe}from"/$bunfs/root/chunk-hegqv7xz.js";import{ni}from"/$bunfs/root/chunk-e0gw2zfa.js";function aCn(e,r,s){if(s.get(e)?.status!=="running")return;s.updateTranscript(e,(a)=>({...a,messages:N0e(a.messages,r)}))}function Nwt(e,r,s,a){let n=s.get(e);if(!n||ni(n.status)){t(`Dropping message for teammate task ${e}: task status is "${n?.status}"`);return}s.update(e,(m)=>({...m,pendingUserMessages:[...m.pendingUserMessages,{text:r,origin:a}]})),s.updateTranscript(e,(m)=>({...m,messages:N0e(m.messages,Ce({content:r,origin:a}))}))}function oir(e,r,s){let a=Wpe($D(r,s),e);if(a?.status==="running")a.retryWake?.emit()}
export{aCn,Nwt,oir};
