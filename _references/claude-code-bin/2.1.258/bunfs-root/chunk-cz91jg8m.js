// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{t}from"/$bunfs/root/chunk-5nyank6v.js";import{uI}from"/$bunfs/root/chunk-8qt7d28b.js";import{Vue,YX,Ie}from"/$bunfs/root/chunk-vw215j9f.js";import{Ns}from"/$bunfs/root/chunk-mn40654k.js";function QMt(e,r,s){if(s.get(e)?.status!=="running")return;s.updateTranscript(e,(a)=>({...a,messages:Vue(a.messages,r)}))}function wqe(e,r,s,a){let n=s.get(e);if(!n||Ns(n.status)){t(`Dropping message for teammate task ${e}: task status is "${n?.status}"`);return}s.update(e,(m)=>({...m,pendingUserMessages:[...m.pendingUserMessages,{text:r,origin:a}]})),s.updateTranscript(e,(m)=>({...m,messages:Vue(m.messages,Ie({content:r,origin:a}))}))}function sin(e,r,s){let a=YX(uI(r,s),e);if(a?.status==="running")a.retryWake?.emit()}
export{QMt,wqe,sin};
