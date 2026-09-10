// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Y,W}from"/$bunfs/root/chunk-b1z7jvb2.js";import{re}from"/$bunfs/root/chunk-td0fv71w.js";async function EF(){try{let t=kVn.of(W().host).tasks;if(t.length>0)await Promise.race([Promise.allSettled(t),re(200)]),t.length=0;let[{settle1PEventLoggingBeforeExit:o,shutdown1PEventLogging:s},{shutdownDatadog:e},{shutdownErrorTracking:r}]=await Promise.all([import("/$bunfs/root/chunk-bhvm877t.js"),import("/$bunfs/root/chunk-sh8z6sny.js"),import("/$bunfs/root/chunk-dwyvjgr6.js")]),i=o(),n=[s(),e(),r()];await Promise.race([Promise.all(n),re(500)]),await i}catch{}}class vVn{tasks=[]}var kVn=new Y(()=>new vVn);function acn(t){kVn.of(W().host).tasks.push(t.catch(()=>{}))}
export{EF,vVn,kVn,acn};
