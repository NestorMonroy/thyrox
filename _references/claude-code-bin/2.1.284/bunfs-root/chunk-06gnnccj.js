// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{ce}from"/$bunfs/root/chunk-swk3rjnt.js";import{t}from"/$bunfs/root/chunk-6b6gfk00.js";import{yp,rr}from"/$bunfs/root/chunk-pegpck1h.js";import{uh}from"/$bunfs/root/chunk-c6yk6epa.js";import{Vk}from"/$bunfs/root/chunk-f1swfy5b.js";import{l0}from"/$bunfs/root/chunk-m2xq3y2f.js";import{Ndn}from"/$bunfs/root/chunk-d7rqjb9q.js";import{_br,SQt,wQt,wbr}from"/$bunfs/root/chunk-77kn462z.js";var d=14,f=10;async function gHe(){try{let e=Ndn();if(e===void 0)return[];if(l0()!==null)return[];let{enabled:s}=await e;if(s.length===0)return[];let u=uh(),l=Vk(),c=ce().numStartups,g=Date.now(),r=[];for(let n of s){let{marketplace:o}=rr(n.repository);if(!o||yp(o))continue;if(wbr(n,u,l)!=="user-install")continue;if(p(n))continue;let i=SQt(n.repository);if(!i)continue;if(_br(n.repository))continue;let{sessionsSinceLastUse:m,daysSinceLastUse:a}=wQt(i,c,g);if(a>=d&&m>=f)r.push({pluginId:n.repository,name:n.name,daysSinceLastUse:a})}return r.sort((n,o)=>o.daysSinceLastUse-n.daysSinceLastUse),r}catch(e){return t(`plugin-disuse tip: failed to compute disused plugins: ${e}`,{level:"error"}),[]}}function _ro(e){if(l0()!==null)return null;let s=SQt(e);if(!s)return null;if(_br(e))return 0;return wQt(s,ce().numStartups,Date.now()).daysSinceLastUse}function p(e){return Boolean(e.themesPath||e.themesPaths?.length||e.outputStylesPath||e.outputStylesPaths?.length||e.monitors?.length||e.workflowsPath||e.workflowsPaths?.length)}
export{gHe,_ro};
