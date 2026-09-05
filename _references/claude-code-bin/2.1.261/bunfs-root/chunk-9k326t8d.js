// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{n}from"/$bunfs/root/chunk-y5pwxex8.js";import{eR}from"/$bunfs/root/chunk-hyqdn9c0.js";import{Uue,VX,Te}from"/$bunfs/root/chunk-vd630rs0.js";import{Rs}from"/$bunfs/root/chunk-p20syc8v.js";function rNt(e,a,s){if(s.get(e)?.status!=="running")return;s.updateTranscript(e,(t)=>({...t,messages:Uue(t.messages,a)}))}function vKe(e,a,s,t){let m=s.get(e);if(!m||Rs(m.status)){n(`Dropping message for teammate task ${e}: task status is "${m?.status}"`);return}s.update(e,(r)=>({...r,pendingUserMessages:[...r.pendingUserMessages,{text:a,origin:t}]})),s.updateTranscript(e,(r)=>({...r,messages:Uue(r.messages,Te({content:a,origin:t}))}))}function Wsn(e,a,s){let t=VX(eR(a,s),e);if(t?.status==="running")t.retryWake?.emit()}
export{rNt,vKe,Wsn};
