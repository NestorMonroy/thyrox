// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{t}from"/$bunfs/root/chunk-nbcqw6vp.js";import{k0}from"/$bunfs/root/chunk-2c4t9j03.js";import{Ae}from"/$bunfs/root/chunk-c9jscxk0.js";import{Ece}from"/$bunfs/root/chunk-hz1p470t.js";import{UOe}from"/$bunfs/root/chunk-0bxpecg1.js";import{ni}from"/$bunfs/root/chunk-jc89w66v.js";function whn(e,r,s){if(s.get(e)?.status!=="running")return;s.updateTranscript(e,(a)=>({...a,messages:UOe(a.messages,r)}))}function _mt(e,r,s,a){let n=s.get(e);if(!n||ni(n.status)){t(`Dropping message for teammate task ${e}: task status is "${n?.status}"`);return}s.update(e,(m)=>({...m,pendingUserMessages:[...m.pendingUserMessages,{text:r,origin:a}]})),s.updateTranscript(e,(m)=>({...m,messages:UOe(m.messages,Ae({content:r,origin:a}))}))}function DYn(e,r,s){let a=Ece(k0(r,s),e);if(a?.status==="running")a.retryWake?.emit()}
export{whn,_mt,DYn};
