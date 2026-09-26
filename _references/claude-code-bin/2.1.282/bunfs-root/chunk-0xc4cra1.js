// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{l}from"/$bunfs/root/chunk-dw9y6h6j.js";import{li}from"/$bunfs/root/chunk-6tq2tfz1.js";import{S,Q,t}from"/$bunfs/root/chunk-nbcqw6vp.js";import{f}from"/$bunfs/root/chunk-f344jh32.js";import{PJ,H_t}from"/$bunfs/root/chunk-avhdmmhd.js";import{X2t,Own}from"/$bunfs/root/chunk-r98bjdyf.js";import{o,k,Je,z,R}from"/$bunfs/root/chunk-hq4c63ht.js";var y=1,d=["flag_off","consent_off","not_served","arm_slow","arm_failed","cancelled","no_word"];var c=f(()=>Je({version:R(y),kind:R("created_empty_unfilled"),sessionId:o().min(1).max(256),createdAtMs:k().int().nonnegative(),why:z(d)}));function p(s,n){let e;try{e=Q(s.toString("utf8"))}catch{return null}let r=c().safeParse(e);return r.success&&r.data.sessionId===n?r.data:null}async function u({recordPath:s,v5:n,markerPath:e,sessionId:r,why:i,nowMs:a=Date.now}){try{if((await X2t(s,n)).kind!=="absent")return;let m={version:y,kind:"created_empty_unfilled",sessionId:r,createdAtMs:a(),why:i};await Own(e,Buffer.from(S(m),"utf8"))}catch(m){t(`[dirSync] created-empty marker for ${r} not written: ${l(m)}; a later attach will not be warned that this session is empty`)}}async function v6r(s,n){let e=await X2t(s);return e.kind==="ok"?p(e.content,n):null}async function E6r({gitRoot:s,sessionId:n,storageV5:e,why:r}){let i=li(n);try{let a=await PJ(s,i,e);await u({recordPath:a.path,v5:a.v5,markerPath:H_t(a.path,i),sessionId:i,why:r})}catch(a){t(`[dirSync] created-empty marker for ${i} not written: could not work out its path: ${l(a)}; a later attach will not be warned that this session is empty`)}}
export{v6r,E6r};
