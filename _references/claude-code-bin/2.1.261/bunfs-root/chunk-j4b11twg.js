// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{ee}from"/$bunfs/root/chunk-hyqdn9c0.js";import{n}from"/$bunfs/root/chunk-y5pwxex8.js";import{Dv,Nt}from"/$bunfs/root/chunk-vtzyax4z.js";import{AI}from"/$bunfs/root/chunk-kme0t1a1.js";import{qp,rdn,lmt,cmt,sdn}from"/$bunfs/root/chunk-vd630rs0.js";import{Bl,Un}from"/$bunfs/root/chunk-g8wr27v4.js";var d=14,f=10;async function Rle(){try{let e=Nt().pluginLoadCacheOnly;if(e===void 0)return[];if(AI()!==null)return[];let{enabled:s}=await e;if(s.length===0)return[];let u=qp(),l=Dv(),g=ee().numStartups,c=Date.now(),r=[];for(let t of s){let{marketplace:o}=Un(t.repository);if(!o||Bl(o))continue;if(sdn(t,u,l)!=="user-install")continue;if(p(t))continue;let i=lmt(t.repository);if(!i)continue;if(rdn(t.repository))continue;let{sessionsSinceLastUse:m,daysSinceLastUse:a}=cmt(i,g,c);if(a>=d&&m>=f)r.push({pluginId:t.repository,name:t.name,daysSinceLastUse:a})}return r.sort((t,o)=>o.daysSinceLastUse-t.daysSinceLastUse),r}catch(e){return n(`plugin-disuse tip: failed to compute disused plugins: ${e}`,{level:"error"}),[]}}function X1n(e){if(AI()!==null)return null;let s=lmt(e);if(!s)return null;if(rdn(e))return 0;return cmt(s,ee().numStartups,Date.now()).daysSinceLastUse}function p(e){return Boolean(e.themesPath||e.themesPaths?.length||e.outputStylesPath||e.outputStylesPaths?.length||e.monitors?.length||e.workflowsPath||e.workflowsPaths?.length)}
export{Rle,X1n};
