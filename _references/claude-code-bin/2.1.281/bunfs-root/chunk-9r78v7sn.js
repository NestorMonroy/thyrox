// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{le}from"/$bunfs/root/chunk-5khn4tvf.js";import{t}from"/$bunfs/root/chunk-wfscmafr.js";import{Cg}from"/$bunfs/root/chunk-gzz3t5wc.js";import{uT}from"/$bunfs/root/chunk-srdjfbee.js";import{IO}from"/$bunfs/root/chunk-s55tc6b5.js";import{ct}from"/$bunfs/root/chunk-f7f70yvv.js";import{cor,v4t,E4t,por}from"/$bunfs/root/chunk-4n4g22z6.js";import{Mu,ir}from"/$bunfs/root/chunk-wrhs39mg.js";var d=14,f=10;async function fRe(){try{let e=ct().pluginLoadCacheOnly;if(e===void 0)return[];if(IO()!==null)return[];let{enabled:s}=await e;if(s.length===0)return[];let u=Cg(),l=uT(),g=le().numStartups,c=Date.now(),r=[];for(let n of s){let{marketplace:o}=ir(n.repository);if(!o||Mu(o))continue;if(por(n,u,l)!=="user-install")continue;if(p(n))continue;let i=v4t(n.repository);if(!i)continue;if(cor(n.repository))continue;let{sessionsSinceLastUse:m,daysSinceLastUse:a}=E4t(i,g,c);if(a>=d&&m>=f)r.push({pluginId:n.repository,name:n.name,daysSinceLastUse:a})}return r.sort((n,o)=>o.daysSinceLastUse-n.daysSinceLastUse),r}catch(e){return t(`plugin-disuse tip: failed to compute disused plugins: ${e}`,{level:"error"}),[]}}function IVr(e){if(IO()!==null)return null;let s=v4t(e);if(!s)return null;if(cor(e))return 0;return E4t(s,le().numStartups,Date.now()).daysSinceLastUse}function p(e){return Boolean(e.themesPath||e.themesPaths?.length||e.outputStylesPath||e.outputStylesPaths?.length||e.monitors?.length||e.workflowsPath||e.workflowsPaths?.length)}
export{fRe,IVr};
