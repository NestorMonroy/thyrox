// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{ie}from"/$bunfs/root/chunk-x722nt0q.js";import{t}from"/$bunfs/root/chunk-fzpv8ev5.js";import{AO}from"/$bunfs/root/chunk-eza32dw3.js";import{uk,Xt}from"/$bunfs/root/chunk-7bh7nxpg.js";import{jd,Ffn,Mmt,Omt,Ufn}from"/$bunfs/root/chunk-qpwbvc04.js";import{sc,Zt}from"/$bunfs/root/chunk-sm4f0pvs.js";var d=14,f=10;async function dce(){try{let e=Xt().pluginLoadCacheOnly;if(e===void 0)return[];if(AO()!==null)return[];let{enabled:s}=await e;if(s.length===0)return[];let u=jd(),l=uk(),g=ie().numStartups,c=Date.now(),r=[];for(let n of s){let{marketplace:o}=Zt(n.repository);if(!o||sc(o))continue;if(Ufn(n,u,l)!=="user-install")continue;if(p(n))continue;let i=Mmt(n.repository);if(!i)continue;if(Ffn(n.repository))continue;let{sessionsSinceLastUse:m,daysSinceLastUse:a}=Omt(i,g,c);if(a>=d&&m>=f)r.push({pluginId:n.repository,name:n.name,daysSinceLastUse:a})}return r.sort((n,o)=>o.daysSinceLastUse-n.daysSinceLastUse),r}catch(e){return t(`plugin-disuse tip: failed to compute disused plugins: ${e}`,{level:"error"}),[]}}function Vjn(e){if(AO()!==null)return null;let s=Mmt(e);if(!s)return null;if(Ffn(e))return 0;return Omt(s,ie().numStartups,Date.now()).daysSinceLastUse}function p(e){return Boolean(e.themesPath||e.themesPaths?.length||e.outputStylesPath||e.outputStylesPaths?.length||e.monitors?.length||e.workflowsPath||e.workflowsPaths?.length)}
export{dce,Vjn};
