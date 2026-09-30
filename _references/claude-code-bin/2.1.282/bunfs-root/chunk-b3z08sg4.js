// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{f}from"/$bunfs/root/chunk-f344jh32.js";import{KY,tE,Zt,oU}from"/$bunfs/root/chunk-ga02wneq.js";import{o,C,d,R}from"/$bunfs/root/chunk-hq4c63ht.js";var a=1,ogn=64,iGr="offer",n=f(()=>o().regex(Zt).refine(oU)),i=f(()=>d({v:R(a),head:n(),branch:o().min(1).max(KY).refine(tE),ancestors:C(n()).max(ogn)}));function aGr({head:r,branch:t,history:s}){let e=i().safeParse({v:a,head:r,branch:t,ancestors:s.filter((c)=>c!==r).slice(0,ogn)});return e.success?e.data:null}function lGr(r,t){if(t.branch===null||t.branch!==r.branch)return"other_branch";return t.head===r.head||r.ancestors.includes(t.head)?"covers":"not_in_history"}
export{ogn,iGr,aGr,lGr};
