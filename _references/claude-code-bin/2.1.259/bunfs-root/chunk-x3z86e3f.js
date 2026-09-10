// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{V,vs}from"/$bunfs/root/chunk-x1rrg5j2.js";import{re}from"/$bunfs/root/chunk-1mrhsd7s.js";async function NF(){try{let s=o();if(s.length>0)await Promise.race([Promise.allSettled(s),re(200)]),s.length=0;let[{settle1PEventLoggingBeforeExit:t,shutdown1PEventLogging:e},{shutdownDatadog:r},{shutdownErrorTracking:n}]=await Promise.all([import("/$bunfs/root/chunk-jbv27yhx.js"),import("/$bunfs/root/chunk-18t8egf3.js"),import("/$bunfs/root/chunk-7073sdbm.js")]),i=t(),a=[e(),r(),n()];await Promise.race([Promise.all(a),re(500)]),await i}catch{}}class D4n{tasks=[]}var cHr=new V(()=>new D4n);function o(){return vs(cHr).tasks}function Kdn(s){o().push(s.catch(()=>{}))}
export{NF,D4n,cHr,Kdn};
