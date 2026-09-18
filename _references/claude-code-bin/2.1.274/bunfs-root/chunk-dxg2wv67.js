// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{ie}from"/$bunfs/root/chunk-27bj2wbx.js";import{t}from"/$bunfs/root/chunk-r2c9k9kh.js";import{_g}from"/$bunfs/root/chunk-mr16m2ca.js";import{XA}from"/$bunfs/root/chunk-7x6cw1x6.js";import{NO}from"/$bunfs/root/chunk-z432q6s1.js";import{lt}from"/$bunfs/root/chunk-hhj7f7ny.js";import{nUn,DMt,LMt,sUn}from"/$bunfs/root/chunk-ayyj05ne.js";import{uu,Yn}from"/$bunfs/root/chunk-n9knan2b.js";var d=14,f=10;async function Abe(){try{let e=lt().pluginLoadCacheOnly;if(e===void 0)return[];if(NO()!==null)return[];let{enabled:s}=await e;if(s.length===0)return[];let u=_g(),l=XA(),g=ie().numStartups,c=Date.now(),r=[];for(let n of s){let{marketplace:o}=Yn(n.repository);if(!o||uu(o))continue;if(sUn(n,u,l)!=="user-install")continue;if(p(n))continue;let i=DMt(n.repository);if(!i)continue;if(nUn(n.repository))continue;let{sessionsSinceLastUse:m,daysSinceLastUse:a}=LMt(i,g,c);if(a>=d&&m>=f)r.push({pluginId:n.repository,name:n.name,daysSinceLastUse:a})}return r.sort((n,o)=>o.daysSinceLastUse-n.daysSinceLastUse),r}catch(e){return t(`plugin-disuse tip: failed to compute disused plugins: ${e}`,{level:"error"}),[]}}function Yyr(e){if(NO()!==null)return null;let s=DMt(e);if(!s)return null;if(nUn(e))return 0;return LMt(s,ie().numStartups,Date.now()).daysSinceLastUse}function p(e){return Boolean(e.themesPath||e.themesPaths?.length||e.outputStylesPath||e.outputStylesPaths?.length||e.monitors?.length||e.workflowsPath||e.workflowsPaths?.length)}
export{Abe,Yyr};
