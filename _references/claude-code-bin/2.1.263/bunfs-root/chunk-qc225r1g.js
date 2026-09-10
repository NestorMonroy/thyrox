// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{j,Si}from"/$bunfs/root/chunk-k6vqz9fa.js";import{Z}from"/$bunfs/root/chunk-r8601mcq.js";async function _F(){try{let s=t();if(s.length>0)await Promise.race([Promise.allSettled(s),Z(200)]),s.length=0;let[{settle1PEventLoggingBeforeExit:e,shutdown1PEventLogging:r},{shutdownDatadog:n},{shutdownErrorTracking:i}]=await Promise.all([import("/$bunfs/root/chunk-d2fvd30f.js"),import("/$bunfs/root/chunk-b8qq94nd.js"),import("/$bunfs/root/chunk-yae45r47.js")]),a=e(),l=[r(),n(),i()];await Promise.race([Promise.all(l),Z(500)]),await a}catch{}}class o{tasks=[]}var c=new j(()=>new o);function t(){return Si(c).tasks}function aun(s){t().push(s.catch(()=>{}))}
export{_F,aun};
