// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{zn}from"/$bunfs/root/chunk-h4npc7kp.js";import{N}from"/$bunfs/root/chunk-0pd7kjzx.js";import{rO}from"/$bunfs/root/chunk-6hfhp7ca.js";import{cF}from"/$bunfs/root/chunk-xn16exs1.js";import{Zs}from"/$bunfs/root/chunk-ebdmegft.js";import{readdir as g,stat as h}from"fs/promises";import{basename as ie,join as p}from"path";function P(s){let n=cF(s);return n!==void 0&&zn(n)?n:void 0}async function ceo(s,n,o,a,u,d){let f=N()&&a!==void 0?P(s):void 0;if(a!==void 0&&f!==void 0){let t=new Map;try{await Zs((i)=>a.listEntries({namespace:"transcript",projectKey:f},{skipScopeStats:!0,...n?{}:{skipKeyStats:!0},...i!==void 0&&{cursor:i}}),(i)=>{for(let e of i){if(e.kind!=="key"||e.key.namespace!=="transcript")continue;let r=rO(e.key.sessionId);if(!r)continue;if(n&&e.mtimeMs===void 0)continue;let c=n?Math.trunc(e.mtimeMs??0):0,l=t.get(r);if(l!==void 0){if(c>l.mtime)l.mtime=c;continue}t.set(r,{sessionId:r,filePath:p(s,`${e.key.sessionId}.jsonl`),mtime:c,projectPath:o,ownWorktrees:d})}},u!==void 0?{budget:u}:void 0)}catch{}return[...t.values()]}let m;try{m=await g(s)}catch{return[]}return(await Promise.all(m.map(async(t)=>{if(!t.endsWith(".jsonl"))return null;let i=rO(t.slice(0,-6));if(!i)return null;let e=p(s,t);if(!n)return{sessionId:i,filePath:e,mtime:0,projectPath:o,ownWorktrees:d};try{let r=await h(e);return{sessionId:i,filePath:e,mtime:r.mtime.getTime(),projectPath:o,ownWorktrees:d}}catch{return null}}))).filter((t)=>t!==null)}
export{ceo};
