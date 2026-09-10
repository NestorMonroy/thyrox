// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{n}from"/$bunfs/root/chunk-mh9y4c2z.js";import{eR}from"/$bunfs/root/chunk-32f2qmtc.js";import{jue,YX,Te}from"/$bunfs/root/chunk-9wa0ka8p.js";import{Rs}from"/$bunfs/root/chunk-awwpp4fv.js";function oNt(e,a,s){if(s.get(e)?.status!=="running")return;s.updateTranscript(e,(t)=>({...t,messages:jue(t.messages,a)}))}function TKe(e,a,s,t){let m=s.get(e);if(!m||Rs(m.status)){n(`Dropping message for teammate task ${e}: task status is "${m?.status}"`);return}s.update(e,(r)=>({...r,pendingUserMessages:[...r.pendingUserMessages,{text:a,origin:t}]})),s.updateTranscript(e,(r)=>({...r,messages:jue(r.messages,Te({content:a,origin:t}))}))}function Vsn(e,a,s){let t=YX(eR(a,s),e);if(t?.status==="running")t.retryWake?.emit()}
export{oNt,TKe,Vsn};
