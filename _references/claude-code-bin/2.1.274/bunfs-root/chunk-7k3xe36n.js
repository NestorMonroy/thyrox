// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{t}from"/$bunfs/root/chunk-r2c9k9kh.js";import{XH}from"/$bunfs/root/chunk-27bj2wbx.js";import{fve,Ae}from"/$bunfs/root/chunk-ayyj05ne.js";import{ine}from"/$bunfs/root/chunk-mn6rz0ah.js";import{Ws}from"/$bunfs/root/chunk-x7szm81w.js";function C9t(e,r,s){if(s.get(e)?.status!=="running")return;s.updateTranscript(e,(a)=>({...a,messages:fve(a.messages,r)}))}function dtt(e,r,s,a){let n=s.get(e);if(!n||Ws(n.status)){t(`Dropping message for teammate task ${e}: task status is "${n?.status}"`);return}s.update(e,(m)=>({...m,pendingUserMessages:[...m.pendingUserMessages,{text:r,origin:a}]})),s.updateTranscript(e,(m)=>({...m,messages:fve(m.messages,Ae({content:r,origin:a}))}))}function HIn(e,r,s){let a=ine(XH(r,s),e);if(a?.status==="running")a.retryWake?.emit()}
export{C9t,dtt,HIn};
