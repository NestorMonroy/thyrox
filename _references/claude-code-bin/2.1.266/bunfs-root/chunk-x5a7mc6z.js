// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{ne}from"/$bunfs/root/chunk-btbsn9s4.js";import{t}from"/$bunfs/root/chunk-fy3j7rz0.js";import{dT,Mt}from"/$bunfs/root/chunk-0wfwszb8.js";import{cP}from"/$bunfs/root/chunk-pg7f51gn.js";import{fm,rgn,Ght,qht,sgn}from"/$bunfs/root/chunk-yw4jc948.js";import{ql,jn}from"/$bunfs/root/chunk-hzw08x3w.js";var d=14,f=10;async function pue(){try{let e=Mt().pluginLoadCacheOnly;if(e===void 0)return[];if(cP()!==null)return[];let{enabled:s}=await e;if(s.length===0)return[];let u=fm(),l=dT(),g=ne().numStartups,c=Date.now(),r=[];for(let n of s){let{marketplace:o}=jn(n.repository);if(!o||ql(o))continue;if(sgn(n,u,l)!=="user-install")continue;if(p(n))continue;let i=Ght(n.repository);if(!i)continue;if(rgn(n.repository))continue;let{sessionsSinceLastUse:m,daysSinceLastUse:a}=qht(i,g,c);if(a>=d&&m>=f)r.push({pluginId:n.repository,name:n.name,daysSinceLastUse:a})}return r.sort((n,o)=>o.daysSinceLastUse-n.daysSinceLastUse),r}catch(e){return t(`plugin-disuse tip: failed to compute disused plugins: ${e}`,{level:"error"}),[]}}function zWn(e){if(cP()!==null)return null;let s=Ght(e);if(!s)return null;if(rgn(e))return 0;return qht(s,ne().numStartups,Date.now()).daysSinceLastUse}function p(e){return Boolean(e.themesPath||e.themesPaths?.length||e.outputStylesPath||e.outputStylesPaths?.length||e.monitors?.length||e.workflowsPath||e.workflowsPaths?.length)}
export{pue,zWn};
