// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{ie}from"/$bunfs/root/chunk-8qt7d28b.js";import{t}from"/$bunfs/root/chunk-5nyank6v.js";import{uO}from"/$bunfs/root/chunk-pdbmw9y3.js";import{Qv,en}from"/$bunfs/root/chunk-q96fnffa.js";import{Ld,Ycn,ept,tpt,Jcn}from"/$bunfs/root/chunk-vw215j9f.js";import{tc,Yt}from"/$bunfs/root/chunk-7yszx9hr.js";var d=14,f=10;async function fle(){try{let e=en().pluginLoadCacheOnly;if(e===void 0)return[];if(uO()!==null)return[];let{enabled:s}=await e;if(s.length===0)return[];let u=Ld(),l=Qv(),g=ie().numStartups,c=Date.now(),r=[];for(let n of s){let{marketplace:o}=Yt(n.repository);if(!o||tc(o))continue;if(Jcn(n,u,l)!=="user-install")continue;if(p(n))continue;let i=ept(n.repository);if(!i)continue;if(Ycn(n.repository))continue;let{sessionsSinceLastUse:m,daysSinceLastUse:a}=tpt(i,g,c);if(a>=d&&m>=f)r.push({pluginId:n.repository,name:n.name,daysSinceLastUse:a})}return r.sort((n,o)=>o.daysSinceLastUse-n.daysSinceLastUse),r}catch(e){return t(`plugin-disuse tip: failed to compute disused plugins: ${e}`,{level:"error"}),[]}}function IBn(e){if(uO()!==null)return null;let s=ept(e);if(!s)return null;if(Ycn(e))return 0;return tpt(s,ie().numStartups,Date.now()).daysSinceLastUse}function p(e){return Boolean(e.themesPath||e.themesPaths?.length||e.outputStylesPath||e.outputStylesPaths?.length||e.monitors?.length||e.workflowsPath||e.workflowsPaths?.length)}
export{fle,IBn};
