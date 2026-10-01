// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{l}from"/$bunfs/root/chunk-ern0s5ks.js";import{ci}from"/$bunfs/root/chunk-2vygpg3s.js";import{b,J,t}from"/$bunfs/root/chunk-zkn0228z.js";import{f}from"/$bunfs/root/chunk-bnk68ax9.js";import{iQ,Bwt}from"/$bunfs/root/chunk-rq2y71d3.js";import{P4t,_An}from"/$bunfs/root/chunk-pyp45n90.js";import{o,k,Ze,G,R}from"/$bunfs/root/chunk-dk5kbfrn.js";var y=1,d=["flag_off","consent_off","not_served","arm_slow","arm_failed","cancelled","no_word"];var c=f(()=>Ze({version:R(y),kind:R("created_empty_unfilled"),sessionId:o().min(1).max(256),createdAtMs:k().int().nonnegative(),why:G(d)}));function p(s,n){let e;try{e=J(s.toString("utf8"))}catch{return null}let r=c().safeParse(e);return r.success&&r.data.sessionId===n?r.data:null}async function S({recordPath:s,v5:n,markerPath:e,sessionId:r,why:i,nowMs:a=Date.now}){try{if((await P4t(s,n)).kind!=="absent")return;let m={version:y,kind:"created_empty_unfilled",sessionId:r,createdAtMs:a(),why:i};await _An(e,Buffer.from(b(m),"utf8"))}catch(m){t(`[dirSync] created-empty marker for ${r} not written: ${l(m)}; a later attach will not be warned that this session is empty`)}}async function ueo(s,n){let e=await P4t(s);return e.kind==="ok"?p(e.content,n):null}async function peo({gitRoot:s,sessionId:n,storageV5:e,why:r}){let i=ci(n);try{let a=await iQ(s,i,e);await S({recordPath:a.path,v5:a.v5,markerPath:Bwt(a.path,i),sessionId:i,why:r})}catch(a){t(`[dirSync] created-empty marker for ${i} not written: could not work out its path: ${l(a)}; a later attach will not be warned that this session is empty`)}}
export{ueo,peo};
