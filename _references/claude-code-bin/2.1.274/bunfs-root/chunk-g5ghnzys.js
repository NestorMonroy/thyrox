// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{W,Qs}from"/$bunfs/root/chunk-ja309z9r.js";import{Z}from"/$bunfs/root/chunk-akpzg2yh.js";async function AW(){try{let s=t();if(s.length>0)await Promise.race([Promise.allSettled(s),Z(200)]),s.length=0;let[{settle1PEventLoggingBeforeExit:e,shutdown1PEventLogging:r},{shutdownDatadog:n},{shutdownErrorTracking:i}]=await Promise.all([import("/$bunfs/root/chunk-7x08zss2.js"),import("/$bunfs/root/chunk-9y4en2bk.js"),import("/$bunfs/root/chunk-b3wwnc7d.js")]),a=e(),l=[r(),n(),i()];await Promise.race([Promise.all(l),Z(500)]),await a}catch{}}class o{tasks=[]}var c=new W(()=>new o);function t(){return Qs(c).tasks}function d6n(s){t().push(s.catch(()=>{}))}
export{AW,d6n};
