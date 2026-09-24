// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{fp}from"/$bunfs/root/chunk-5khn4tvf.js";import{f}from"/$bunfs/root/chunk-1y7zyxh8.js";import{Nd}from"/$bunfs/root/chunk-gg8nk2j9.js";import{nY,Bv,Jt,OF}from"/$bunfs/root/chunk-adsaemws.js";import{o,C,d,R}from"/$bunfs/root/chunk-r9b963ay.js";var i="tengu_violin_soundpost";async function vFt(){try{return await Nd()&&await fp(i)}catch{return!1}}var n=1,Yun=64,OBr="offer",e=f(()=>o().regex(Jt).refine(OF)),h=f(()=>d({v:R(n),head:e(),branch:o().min(1).max(nY).refine(Bv),ancestors:C(e()).max(Yun)}));function MBr({head:r,branch:a,history:s}){let t=h().safeParse({v:n,head:r,branch:a,ancestors:s.filter((c)=>c!==r).slice(0,Yun)});return t.success?t.data:null}
export{vFt,Yun,OBr,MBr};
