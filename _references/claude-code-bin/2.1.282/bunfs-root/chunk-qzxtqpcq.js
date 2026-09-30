// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Nn}from"/$bunfs/root/chunk-z3ns4mz4.js";import{N}from"/$bunfs/root/chunk-hm6k4hcw.js";import{sP}from"/$bunfs/root/chunk-g59nc6ra.js";import{kN}from"/$bunfs/root/chunk-dg8z8cmw.js";import{zs}from"/$bunfs/root/chunk-46qnjbs6.js";import{readdir as g,stat as h}from"fs/promises";import{basename as ie,join as p}from"path";function P(s){let n=kN(s);return n!==void 0&&Nn(n)?n:void 0}async function g5r(s,n,o,a,u,d){let f=N()&&a!==void 0?P(s):void 0;if(a!==void 0&&f!==void 0){let t=new Map;try{await zs((i)=>a.listEntries({namespace:"transcript",projectKey:f},{skipScopeStats:!0,...n?{}:{skipKeyStats:!0},...i!==void 0&&{cursor:i}}),(i)=>{for(let e of i){if(e.kind!=="key"||e.key.namespace!=="transcript")continue;let r=sP(e.key.sessionId);if(!r)continue;if(n&&e.mtimeMs===void 0)continue;let c=n?Math.trunc(e.mtimeMs??0):0,l=t.get(r);if(l!==void 0){if(c>l.mtime)l.mtime=c;continue}t.set(r,{sessionId:r,filePath:p(s,`${e.key.sessionId}.jsonl`),mtime:c,projectPath:o,ownWorktrees:d})}},u!==void 0?{budget:u}:void 0)}catch{}return[...t.values()]}let m;try{m=await g(s)}catch{return[]}return(await Promise.all(m.map(async(t)=>{if(!t.endsWith(".jsonl"))return null;let i=sP(t.slice(0,-6));if(!i)return null;let e=p(s,t);if(!n)return{sessionId:i,filePath:e,mtime:0,projectPath:o,ownWorktrees:d};try{let r=await h(e);return{sessionId:i,filePath:e,mtime:r.mtime.getTime(),projectPath:o,ownWorktrees:d}}catch{return null}}))).filter((t)=>t!==null)}
export{g5r};
