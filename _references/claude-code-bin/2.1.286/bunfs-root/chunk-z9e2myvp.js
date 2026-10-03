// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{YBo,uy,Pt,np}from"/$bunfs/root/chunk-4hjp8tw4.js";import{W}from"/$bunfs/root/chunk-ydzyx3m5.js";import{Va}from"/$bunfs/root/chunk-pzx3e956.js";import{IPt,Cke}from"/$bunfs/root/chunk-kt4703ww.js";import{C,X,vh,D}from"/$bunfs/root/chunk-mqace48v.js";D();function PI(){let[o,e]=vh((r)=>r+1,0);return C(()=>np(e),[]),o}function iB(o){return PI(),o()}D();function t(){let[o,e]=vh((r)=>r+1,0);return C(()=>YBo(e),[]),o}function MCn(o,e){return IPt(o)??IPt(e)??uy()}function a5(o){return Pt(MCn(o.mainLoopModelForSession,o.mainLoopModel))}function vse(){let o=W((n)=>n.mainLoopModel),e=W((n)=>n.mainLoopModelForSession),r=PI(),s=t(),i=Va();return X(()=>Cke(e,o),[e,o,r,i,s])}function S5t(){let o=W((n)=>n.mainLoopModel),e=W((n)=>n.mainLoopModelForSession),r=PI(),s=t(),i=Va();return X(()=>MCn(e,o),[e,o,r,i,s])}function Nc(){let o=W((n)=>n.mainLoopModel),e=W((n)=>n.mainLoopModelForSession),r=PI(),s=t(),i=Va();return X(()=>a5({mainLoopModel:o,mainLoopModelForSession:e}),[e,o,r,i,s])}
export{PI,iB,MCn,a5,vse,S5t,Nc};
