// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Mub as c,Qub as M}from"/$bunfs/root/_533.js";import{Tbd as y}from"/$bunfs/root/_811.js";import{ncd as a}from"/$bunfs/root/_812.js";import{jhd as f,ohd as h}from"/$bunfs/root/_820.js";import{xxd as g}from"/$bunfs/root/_837.js";import*as o from"fs/promises";import*as p from"path";function u(i){f(`[file-persistence] ${i}`)}function T(){let i=a.CLAUDE_CODE_ENVIRONMENT_KIND;if(i==="byoc"||i==="anthropic_cloud")return i;return null}function _(i,n){return Boolean(i)&&(!n||n==="anthropic_cloud")}async function b(i,n){let m;try{m=await o.readdir(n,{withFileTypes:!0,recursive:!0})}catch{return[]}let e=[];for(let t of m){if(t.isSymbolicLink()||t.name.startsWith(c))continue;if(t.isFile())e.push(p.join(t.parentPath,t.name))}if(e.length===0)return u("No files found in outputs directory"),[];let s=0,d=await Promise.all(e.map(async(t)=>{try{let r=await o.lstat(t);if(r.isSymbolicLink())return null;if(r.nlink>1)return s++,null;return{filePath:t,mtimeMs:r.mtimeMs,ctimeMs:r.ctimeMs}}catch{return null}})),l=[];for(let t of d)if(t&&(t.mtimeMs>=i||t.ctimeMs>=i))l.push(t.filePath);return u(`Found ${l.length} modified files since turn start (scanned ${e.length} total${s>0?`, skipped ${s} multiply-linked`:""})`),l}var E=g(()=>{h();y();M()});
export{T as Hub,_ as Iub,b as Jub,E as Kub};
