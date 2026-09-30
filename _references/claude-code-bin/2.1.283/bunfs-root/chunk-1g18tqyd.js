// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{q,di}from"/$bunfs/root/chunk-nvht7ckf.js";import{Q}from"/$bunfs/root/chunk-jxwbd5gq.js";async function _5(){try{let s=t();if(s.length>0)await Promise.race([Promise.allSettled(s),Q(200)]),s.length=0;let[{settle1PEventLoggingBeforeExit:e,shutdown1PEventLogging:r},{shutdownDatadog:n},{shutdownErrorTracking:i}]=await Promise.all([import("/$bunfs/root/chunk-qzrtqz9f.js"),import("/$bunfs/root/chunk-whf4ntbr.js"),import("/$bunfs/root/chunk-d6y853pf.js")]),a=e(),l=[r(),n(),i()];await Promise.race([Promise.all(l),Q(500)]),await a}catch{}}class o{tasks=[]}var c=new q(()=>new o);function t(){return di(c).tasks}function NMr(s){t().push(s.catch(()=>{}))}
export{_5,NMr};
