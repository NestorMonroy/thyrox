// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{t}from"/$bunfs/root/chunk-6w550002.js";import{dD}from"/$bunfs/root/chunk-5rxa78mt.js";import{Re}from"/$bunfs/root/chunk-kt4703ww.js";import{zNe}from"/$bunfs/root/chunk-c8ts4r2w.js";import{xfe}from"/$bunfs/root/chunk-m4xq8dn6.js";import{ui}from"/$bunfs/root/chunk-6j0tanmw.js";function $xn(e,r,s){if(s.get(e)?.status!=="running")return;s.updateTranscript(e,(a)=>({...a,messages:zNe(a.messages,r)}))}function NEt(e,r,s,a){let n=s.get(e);if(!n||ui(n.status)){t(`Dropping message for teammate task ${e}: task status is "${n?.status}"`);return}s.update(e,(m)=>({...m,pendingUserMessages:[...m.pendingUserMessages,{text:r,origin:a}]})),s.updateTranscript(e,(m)=>({...m,messages:zNe(m.messages,Re({content:r,origin:a}))}))}function icr(e,r,s){let a=xfe(dD(r,s),e);if(a?.status==="running")a.retryWake?.emit()}
export{$xn,NEt,icr};
