// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{f}from"/$bunfs/root/chunk-k40f9rxb.js";import{lX,FE,nn,BB}from"/$bunfs/root/chunk-45s965ek.js";import{o,A,u,R}from"/$bunfs/root/chunk-fwjxbyrt.js";var a=1,Lvn=64,Fer="offer",n=f(()=>o().regex(nn).refine(BB)),s=f(()=>u({v:R(a),head:n(),branch:o().min(1).max(lX).refine(FE),ancestors:A(n()).max(Lvn)}));function J9r(t){let r=s().safeParse(t[Fer]);return r.success?r.data:null}function Q9r({head:t,branch:r,history:c}){let e=s().safeParse({v:a,head:t,branch:r,ancestors:c.filter((i)=>i!==t).slice(0,Lvn)});return e.success?e.data:null}function Z9r(t,r){if(r.branch===null||r.branch!==t.branch)return"other_branch";return r.head===t.head||t.ancestors.includes(r.head)?"covers":"not_in_history"}
export{Lvn,Fer,J9r,Q9r,Z9r};
