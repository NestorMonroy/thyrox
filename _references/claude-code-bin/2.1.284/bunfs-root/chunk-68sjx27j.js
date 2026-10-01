// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{q,Gs}from"/$bunfs/root/chunk-d37h8mav.js";import{Z}from"/$bunfs/root/chunk-bz96yhka.js";async function J3(){try{let s=t();if(s.length>0)await Promise.race([Promise.allSettled(s),Z(200)]),s.length=0;let[{settle1PEventLoggingBeforeExit:e,shutdown1PEventLogging:r},{shutdownDatadog:n},{shutdownErrorTracking:i}]=await Promise.all([import("/$bunfs/root/chunk-2n7bgpsk.js"),import("/$bunfs/root/chunk-kdqvxxcw.js"),import("/$bunfs/root/chunk-1r33nyhq.js")]),a=e(),l=[r(),n(),i()];await Promise.race([Promise.all(l),Z(500)]),await a}catch{}}class o{tasks=[]}var c=new q(()=>new o);function t(){return Gs(c).tasks}function WNr(s){t().push(s.catch(()=>{}))}
export{J3,WNr};
