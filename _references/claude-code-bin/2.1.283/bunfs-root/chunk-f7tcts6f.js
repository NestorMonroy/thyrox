// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{yy,Tt,Yd}from"/$bunfs/root/chunk-t6pwageh.js";import{W}from"/$bunfs/root/chunk-6ms3480f.js";import{Ba}from"/$bunfs/root/chunk-2r61name.js";import{NCt,Ove}from"/$bunfs/root/chunk-csayct82.js";import{C,X,Ak,L}from"/$bunfs/root/chunk-8fdrzdn0.js";L();function iM(){let[o,e]=Ak((r)=>r+1,0);return C(()=>Yd(e),[]),o}function oU(o){return iM(),o()}L();function qwn(o,e){return NCt(o)??NCt(e)??yy()}function P7(o){return Tt(qwn(o.mainLoopModelForSession,o.mainLoopModel))}function qre(){let o=W((n)=>n.mainLoopModel),e=W((n)=>n.mainLoopModelForSession),r=iM(),s=Ba();return X(()=>Ove(e,o),[e,o,r,s])}function E2t(){let o=W((n)=>n.mainLoopModel),e=W((n)=>n.mainLoopModelForSession),r=iM(),s=Ba();return X(()=>qwn(e,o),[e,o,r,s])}function rd(){let o=W((n)=>n.mainLoopModel),e=W((n)=>n.mainLoopModelForSession),r=iM(),s=Ba();return X(()=>P7({mainLoopModel:o,mainLoopModelForSession:e}),[e,o,r,s])}
export{iM,oU,qwn,P7,qre,E2t,rd};
