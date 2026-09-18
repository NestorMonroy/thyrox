// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{ie}from"/$bunfs/root/chunk-xbd48fav.js";import{t}from"/$bunfs/root/chunk-4bbpt7sc.js";import{Ig}from"/$bunfs/root/chunk-twssyc65.js";import{vT}from"/$bunfs/root/chunk-89nes5g8.js";import{KH}from"/$bunfs/root/chunk-jrnkvm0a.js";import{dt}from"/$bunfs/root/chunk-26gtwdy5.js";import{Nzn,CNt,RNt,Uzn}from"/$bunfs/root/chunk-q2gh92k2.js";import{pu,Zn}from"/$bunfs/root/chunk-sg555dy9.js";var d=14,f=10;async function YSe(){try{let e=dt().pluginLoadCacheOnly;if(e===void 0)return[];if(KH()!==null)return[];let{enabled:s}=await e;if(s.length===0)return[];let u=Ig(),l=vT(),g=ie().numStartups,c=Date.now(),r=[];for(let n of s){let{marketplace:o}=Zn(n.repository);if(!o||pu(o))continue;if(Uzn(n,u,l)!=="user-install")continue;if(p(n))continue;let i=CNt(n.repository);if(!i)continue;if(Nzn(n.repository))continue;let{sessionsSinceLastUse:m,daysSinceLastUse:a}=RNt(i,g,c);if(a>=d&&m>=f)r.push({pluginId:n.repository,name:n.name,daysSinceLastUse:a})}return r.sort((n,o)=>o.daysSinceLastUse-n.daysSinceLastUse),r}catch(e){return t(`plugin-disuse tip: failed to compute disused plugins: ${e}`,{level:"error"}),[]}}function vEr(e){if(KH()!==null)return null;let s=CNt(e);if(!s)return null;if(Nzn(e))return 0;return RNt(s,ie().numStartups,Date.now()).daysSinceLastUse}function p(e){return Boolean(e.themesPath||e.themesPaths?.length||e.outputStylesPath||e.outputStylesPaths?.length||e.monitors?.length||e.workflowsPath||e.workflowsPaths?.length)}
export{YSe,vEr};
