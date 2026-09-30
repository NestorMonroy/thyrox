// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{p}from"/$bunfs/root/chunk-z10rc4tf.js";import{cur,v6t}from"/$bunfs/root/chunk-n7wr5vj4.js";import{yKe,qbo}from"/$bunfs/root/chunk-qazw855w.js";import{o,C,d,R}from"/$bunfs/root/chunk-ea52y7e7.js";var n=1,a=64,s="offer",t=p(()=>o().regex(yKe).refine(qbo)),c=p(()=>d({v:R(n),head:t(),branch:o().min(1).max(cur).refine(v6t),ancestors:C(t()).max(a)}));function OXr(e){let r=c().safeParse(e[s]);return r.success?r.data:null}
export{OXr};
