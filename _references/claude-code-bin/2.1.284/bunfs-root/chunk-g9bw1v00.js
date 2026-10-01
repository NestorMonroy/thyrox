// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Hy,xt,Zu}from"/$bunfs/root/chunk-swk3rjnt.js";import{W}from"/$bunfs/root/chunk-wx4aqxv5.js";import{qa}from"/$bunfs/root/chunk-n3wrm10r.js";import{Bxt,UEe}from"/$bunfs/root/chunk-77kn462z.js";import{C,X,Cv,L}from"/$bunfs/root/chunk-68gegf2j.js";L();function EP(){let[o,e]=Cv((r)=>r+1,0);return C(()=>Zu(e),[]),o}function EU(o){return EP(),o()}L();function Ukn(o,e){return Bxt(o)??Bxt(e)??Hy()}function mQ(o){return xt(Ukn(o.mainLoopModelForSession,o.mainLoopModel))}function Boe(){let o=W((n)=>n.mainLoopModel),e=W((n)=>n.mainLoopModelForSession),r=EP(),s=qa();return X(()=>UEe(e,o),[e,o,r,s])}function Qqt(){let o=W((n)=>n.mainLoopModel),e=W((n)=>n.mainLoopModelForSession),r=EP(),s=qa();return X(()=>Ukn(e,o),[e,o,r,s])}function dd(){let o=W((n)=>n.mainLoopModel),e=W((n)=>n.mainLoopModelForSession),r=EP(),s=qa();return X(()=>mQ({mainLoopModel:o,mainLoopModelForSession:e}),[e,o,r,s])}
export{EP,EU,Ukn,mQ,Boe,Qqt,dd};
