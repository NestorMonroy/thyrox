// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{t}from"/$bunfs/root/chunk-fzpv8ev5.js";import{EI}from"/$bunfs/root/chunk-x722nt0q.js";import{Ude,CJ,Ie}from"/$bunfs/root/chunk-qpwbvc04.js";import{wi}from"/$bunfs/root/chunk-zbjsms1x.js";function YNt(e,r,s){if(s.get(e)?.status!=="running")return;s.updateTranscript(e,(a)=>({...a,messages:Ude(a.messages,r)}))}function JKe(e,r,s,a){let n=s.get(e);if(!n||wi(n.status)){t(`Dropping message for teammate task ${e}: task status is "${n?.status}"`);return}s.update(e,(m)=>({...m,pendingUserMessages:[...m.pendingUserMessages,{text:r,origin:a}]})),s.updateTranscript(e,(m)=>({...m,messages:Ude(m.messages,Ie({content:r,origin:a}))}))}function dan(e,r,s){let a=CJ(EI(r,s),e);if(a?.status==="running")a.retryWake?.emit()}
export{YNt,JKe,dan};
