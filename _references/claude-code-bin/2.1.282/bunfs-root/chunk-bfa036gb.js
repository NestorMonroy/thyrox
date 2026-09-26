// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{le}from"/$bunfs/root/chunk-wbbthbh9.js";import{t}from"/$bunfs/root/chunk-nbcqw6vp.js";import{Dg}from"/$bunfs/root/chunk-5yk5cxet.js";import{AT}from"/$bunfs/root/chunk-8y2t7vqf.js";import{t0}from"/$bunfs/root/chunk-1xjxfex5.js";import{ct}from"/$bunfs/root/chunk-th8dg73p.js";import{Ecr,nYt,rYt,Acr}from"/$bunfs/root/chunk-c9jscxk0.js";import{Vu,ar}from"/$bunfs/root/chunk-g5a1w94e.js";var d=14,f=10;async function Bxe(){try{let e=ct().pluginLoadCacheOnly;if(e===void 0)return[];if(t0()!==null)return[];let{enabled:s}=await e;if(s.length===0)return[];let u=Dg(),l=AT(),g=le().numStartups,c=Date.now(),r=[];for(let n of s){let{marketplace:o}=ar(n.repository);if(!o||Vu(o))continue;if(Acr(n,u,l)!=="user-install")continue;if(p(n))continue;let i=nYt(n.repository);if(!i)continue;if(Ecr(n.repository))continue;let{sessionsSinceLastUse:m,daysSinceLastUse:a}=rYt(i,g,c);if(a>=d&&m>=f)r.push({pluginId:n.repository,name:n.name,daysSinceLastUse:a})}return r.sort((n,o)=>o.daysSinceLastUse-n.daysSinceLastUse),r}catch(e){return t(`plugin-disuse tip: failed to compute disused plugins: ${e}`,{level:"error"}),[]}}function M3r(e){if(t0()!==null)return null;let s=nYt(e);if(!s)return null;if(Ecr(e))return 0;return rYt(s,le().numStartups,Date.now()).daysSinceLastUse}function p(e){return Boolean(e.themesPath||e.themesPaths?.length||e.outputStylesPath||e.outputStylesPaths?.length||e.monitors?.length||e.workflowsPath||e.workflowsPaths?.length)}
export{Bxe,M3r};
