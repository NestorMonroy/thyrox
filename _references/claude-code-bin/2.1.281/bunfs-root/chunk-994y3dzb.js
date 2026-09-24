// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{l}from"/$bunfs/root/chunk-2bj5eqbj.js";import{$i}from"/$bunfs/root/chunk-yck00zks.js";import{S,Q,t}from"/$bunfs/root/chunk-wfscmafr.js";import{f}from"/$bunfs/root/chunk-1y7zyxh8.js";import{g2t,m_n}from"/$bunfs/root/chunk-m8dk61d4.js";import{zte,T2t}from"/$bunfs/root/chunk-k3wn4yz2.js";import{o,k,Je,z,R}from"/$bunfs/root/chunk-r9b963ay.js";var y=1,d=["flag_off","consent_off","not_served","arm_slow","arm_failed","cancelled","no_word"];var c=f(()=>Je({version:R(y),kind:R("created_empty_unfilled"),sessionId:o().min(1).max(256),createdAtMs:k().int().nonnegative(),why:z(d)}));function p(s,n){let e;try{e=Q(s.toString("utf8"))}catch{return null}let r=c().safeParse(e);return r.success&&r.data.sessionId===n?r.data:null}async function u({recordPath:s,v5:n,markerPath:e,sessionId:r,why:i,nowMs:a=Date.now}){try{if((await g2t(s,n)).kind!=="absent")return;let m={version:y,kind:"created_empty_unfilled",sessionId:r,createdAtMs:a(),why:i};await m_n(e,Buffer.from(S(m),"utf8"))}catch(m){t(`[dirSync] created-empty marker for ${r} not written: ${l(m)}; a later attach will not be warned that this session is empty`)}}async function Hqr(s,n){let e=await g2t(s);return e.kind==="ok"?p(e.content,n):null}async function Oqr({gitRoot:s,sessionId:n,storageV5:e,why:r}){let i=$i(n);try{let a=await zte(s,i,e);await u({recordPath:a.path,v5:a.v5,markerPath:T2t(a.path,i),sessionId:i,why:r})}catch(a){t(`[dirSync] created-empty marker for ${i} not written: could not work out its path: ${l(a)}; a later attach will not be warned that this session is empty`)}}
export{Hqr,Oqr};
