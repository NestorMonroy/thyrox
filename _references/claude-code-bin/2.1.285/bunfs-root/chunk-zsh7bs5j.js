// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{q,_s}from"/$bunfs/root/chunk-bxhyh54r.js";import{Z}from"/$bunfs/root/chunk-dmpcy5p5.js";async function qq(){try{let s=t();if(s.length>0)await Promise.race([Promise.allSettled(s),Z(200)]),s.length=0;let[{settle1PEventLoggingBeforeExit:e,shutdown1PEventLogging:r},{shutdownDatadog:n},{shutdownErrorTracking:i}]=await Promise.all([import("/$bunfs/root/chunk-1p9a014d.js"),import("/$bunfs/root/chunk-s2wr34e6.js"),import("/$bunfs/root/chunk-etagzjaz.js")]),a=e(),l=[r(),n(),i()];await Promise.race([Promise.all(l),Z(500)]),await a}catch{}}class o{tasks=[]}var c=new q(()=>new o);function t(){return _s(c).tasks}function HNr(s){t().push(s.catch(()=>{}))}
export{qq,HNr};
