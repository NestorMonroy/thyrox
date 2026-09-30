// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{f}from"/$bunfs/root/chunk-bnk68ax9.js";import{I9,wE,rn,vB}from"/$bunfs/root/chunk-5t3x93y6.js";import{o,A,u,R}from"/$bunfs/root/chunk-dk5kbfrn.js";var a=1,Cbn=64,YJn="offer",n=f(()=>o().regex(rn).refine(vB)),s=f(()=>u({v:R(a),head:n(),branch:o().min(1).max(I9).refine(wE),ancestors:A(n()).max(Cbn)}));function x5r(t){let r=s().safeParse(t[YJn]);return r.success?r.data:null}function I5r({head:t,branch:r,history:c}){let e=s().safeParse({v:a,head:t,branch:r,ancestors:c.filter((i)=>i!==t).slice(0,Cbn)});return e.success?e.data:null}function P5r(t,r){if(r.branch===null||r.branch!==t.branch)return"other_branch";return r.head===t.head||t.ancestors.includes(r.head)?"covers":"not_in_history"}
export{Cbn,YJn,x5r,I5r,P5r};
