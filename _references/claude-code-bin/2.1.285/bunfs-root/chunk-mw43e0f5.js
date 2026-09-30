// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Gn}from"/$bunfs/root/chunk-1m79ycfm.js";import{L}from"/$bunfs/root/chunk-k3gp1qmc.js";import{YA}from"/$bunfs/root/chunk-bgchm1w8.js";import{hF}from"/$bunfs/root/chunk-wzht8hyn.js";import{Qs}from"/$bunfs/root/chunk-kw36dve0.js";import{readdir as g,stat as h}from"fs/promises";import{basename as ie,join as p}from"path";function P(s){let n=hF(s);return n!==void 0&&Gn(n)?n:void 0}async function wto(s,n,o,a,u,d){let f=L()&&a!==void 0?P(s):void 0;if(a!==void 0&&f!==void 0){let t=new Map;try{await Qs((i)=>a.listEntries({namespace:"transcript",projectKey:f},{skipScopeStats:!0,...n?{}:{skipKeyStats:!0},...i!==void 0&&{cursor:i}}),(i)=>{for(let e of i){if(e.kind!=="key"||e.key.namespace!=="transcript")continue;let r=YA(e.key.sessionId);if(!r)continue;if(n&&e.mtimeMs===void 0)continue;let c=n?Math.trunc(e.mtimeMs??0):0,l=t.get(r);if(l!==void 0){if(c>l.mtime)l.mtime=c;continue}t.set(r,{sessionId:r,filePath:p(s,`${e.key.sessionId}.jsonl`),mtime:c,projectPath:o,ownWorktrees:d})}},u!==void 0?{budget:u}:void 0)}catch{}return[...t.values()]}let m;try{m=await g(s)}catch{return[]}return(await Promise.all(m.map(async(t)=>{if(!t.endsWith(".jsonl"))return null;let i=YA(t.slice(0,-6));if(!i)return null;let e=p(s,t);if(!n)return{sessionId:i,filePath:e,mtime:0,projectPath:o,ownWorktrees:d};try{let r=await h(e);return{sessionId:i,filePath:e,mtime:r.mtime.getTime(),projectPath:o,ownWorktrees:d}}catch{return null}}))).filter((t)=>t!==null)}
export{wto};
