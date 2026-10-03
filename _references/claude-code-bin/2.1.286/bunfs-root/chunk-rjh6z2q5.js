// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{ce}from"/$bunfs/root/chunk-4hjp8tw4.js";import{t}from"/$bunfs/root/chunk-6w550002.js";import{bp,rr}from"/$bunfs/root/chunk-t9e08syq.js";import{Eh}from"/$bunfs/root/chunk-8gjb4ft4.js";import{aT}from"/$bunfs/root/chunk-0rv4g29k.js";import{R0}from"/$bunfs/root/chunk-1pw818zw.js";import{Rpn}from"/$bunfs/root/chunk-s9m231fk.js";import{pvr,aen,len,gvr}from"/$bunfs/root/chunk-kt4703ww.js";var d=14,f=10;async function hHe(){try{let e=Rpn();if(e===void 0)return[];if(R0()!==null)return[];let{enabled:s}=await e;if(s.length===0)return[];let u=Eh(),l=aT(),c=ce().numStartups,g=Date.now(),r=[];for(let n of s){let{marketplace:o}=rr(n.repository);if(!o||bp(o))continue;if(gvr(n,u,l)!=="user-install")continue;if(p(n))continue;let i=aen(n.repository);if(!i)continue;if(pvr(n.repository))continue;let{sessionsSinceLastUse:m,daysSinceLastUse:a}=len(i,c,g);if(a>=d&&m>=f)r.push({pluginId:n.repository,name:n.name,daysSinceLastUse:a})}return r.sort((n,o)=>o.daysSinceLastUse-n.daysSinceLastUse),r}catch(e){return t(`plugin-disuse tip: failed to compute disused plugins: ${e}`,{level:"error"}),[]}}function ulo(e){if(R0()!==null)return null;let s=aen(e);if(!s)return null;if(pvr(e))return 0;return len(s,ce().numStartups,Date.now()).daysSinceLastUse}function p(e){return Boolean(e.themesPath||e.themesPaths?.length||e.outputStylesPath||e.outputStylesPaths?.length||e.monitors?.length||e.workflowsPath||e.workflowsPaths?.length)}
export{hHe,ulo};
