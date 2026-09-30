// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Wi,NA,nd,nI}from"/$bunfs/root/chunk-yqm14hey.js";import{t}from"/$bunfs/root/chunk-zkn0228z.js";import{a}from"/$bunfs/root/chunk-v49zfq06.js";import{delimiter as l,isAbsolute as u,resolve as o}from"path";var Obn="CLAUDE_CODE_PLUGIN_DIRS",r7n="Unset CLAUDE_CODE_PLUGIN_DIRS (in the environment, or in the settings `env` block that sets it) to run without those folders.";function Hbn(){let n=(a.CLAUDE_CODE_PLUGIN_DIRS??"").split(l).map((e)=>nd(e.trim())).filter((e)=>e!==""),i=n.filter((e)=>!s(e));if(i.length>0)t(`${Obn}: skipped ${i.join(", ")}: a plugin folder here is an absolute local path or starts with ~`,{level:"warn"});return n.filter(s).map((e)=>o(e))}function o7n(){let n=Hbn();if(a.CLAUDE_CODE_PLUGIN_DIRS!==void 0)a.set("CLAUDE_CODE_PLUGIN_DIRS",n.join(l));return n}function SN(...n){let i=new Map;for(let e of n.flat()){let r=o(e);if(!i.has(r))i.set(r,e)}return[...i.values()]}function mht(n,i){let e=new Set(i.map((r)=>o(r)));return n.filter((r)=>!e.has(o(r)))}function s(n){return u(n)&&!nI(n)&&!Wi(n)&&!NA(n)}
export{Obn,r7n,Hbn,o7n,SN,mht};
