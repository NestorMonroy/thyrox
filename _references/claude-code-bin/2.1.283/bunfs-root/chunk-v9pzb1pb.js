// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{t}from"/$bunfs/root/chunk-zkn0228z.js";import{w0}from"/$bunfs/root/chunk-q8a07cv0.js";import{Ae}from"/$bunfs/root/chunk-csayct82.js";import{Gue}from"/$bunfs/root/chunk-7d13dyjb.js";import{aDe}from"/$bunfs/root/chunk-we3dq8fh.js";import{ui}from"/$bunfs/root/chunk-gfkhec5a.js";function fkn(e,r,s){if(s.get(e)?.status!=="running")return;s.updateTranscript(e,(a)=>({...a,messages:aDe(a.messages,r)}))}function Obt(e,r,s,a){let n=s.get(e);if(!n||ui(n.status)){t(`Dropping message for teammate task ${e}: task status is "${n?.status}"`);return}s.update(e,(m)=>({...m,pendingUserMessages:[...m.pendingUserMessages,{text:r,origin:a}]})),s.updateTranscript(e,(m)=>({...m,messages:aDe(m.messages,Ae({content:r,origin:a}))}))}function Pnr(e,r,s){let a=Gue(w0(r,s),e);if(a?.status==="running")a.retryWake?.emit()}
export{fkn,Obt,Pnr};
