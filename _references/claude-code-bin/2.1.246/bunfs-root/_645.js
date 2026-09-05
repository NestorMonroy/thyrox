// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{oid as s,tid as k}from"/$bunfs/root/_825.js";import{Jjd as r,Kjd as u,atd as f,zkd as e}from"/$bunfs/root/_826.js";import{Axd as o,xxd as g}from"/$bunfs/root/_837.js";async function S(){try{let t=n.of(e().host).tasks;if(t.length>0)await Promise.race([Promise.allSettled(t),s(200)]),t.length=0;let[{settle1PEventLoggingBeforeExit:a,shutdown1PEventLogging:l},{shutdownDatadog:c},{shutdownErrorTracking:m}]=await Promise.all([import("/$bunfs/root/chunk-x1zyza6k.js"),import("/$bunfs/root/chunk-p0evyyay.js"),import("/$bunfs/root/chunk-gmbe240f.js")]),h=a(),p=[l(),c(),m()];await Promise.race([Promise.all(p),s(500)]),await h}catch{}}class i{tasks=[]}function T(t){n.of(e().host).tasks.push(t.catch(()=>{}))}var n;var w=g(()=>{f();u();k();n=new r(()=>new i)});
export{S as $5b,i as a6b,n as b6b,T as c6b,w as d6b};
