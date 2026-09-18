// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{t}from"/$bunfs/root/chunk-4bbpt7sc.js";import{T0}from"/$bunfs/root/chunk-xbd48fav.js";import{Ae}from"/$bunfs/root/chunk-q2gh92k2.js";import{Fke}from"/$bunfs/root/chunk-tg58r4rj.js";import{cre}from"/$bunfs/root/chunk-e1dfwdb4.js";import{Ws}from"/$bunfs/root/chunk-b5qvg8aa.js";function hQt(e,r,s){if(s.get(e)?.status!=="running")return;s.updateTranscript(e,(a)=>({...a,messages:Fke(a.messages,r)}))}function brt(e,r,s,a){let n=s.get(e);if(!n||Ws(n.status)){t(`Dropping message for teammate task ${e}: task status is "${n?.status}"`);return}s.update(e,(m)=>({...m,pendingUserMessages:[...m.pendingUserMessages,{text:r,origin:a}]})),s.updateTranscript(e,(m)=>({...m,messages:Fke(m.messages,Ae({content:r,origin:a}))}))}function HMn(e,r,s){let a=cre(T0(r,s),e);if(a?.status==="running")a.retryWake?.emit()}
export{hQt,brt,HMn};
