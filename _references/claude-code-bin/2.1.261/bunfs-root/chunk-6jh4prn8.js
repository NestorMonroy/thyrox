// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{Y}from"/$bunfs/root/chunk-annedm50.js";import{h7,Hve,Soe,wve,Eve}from"/$bunfs/root/chunk-mhmfr9pr.js";import{fC,jHe,WW,R_,Due}from"/$bunfs/root/chunk-vd630rs0.js";import{joe}from"/$bunfs/root/chunk-79bgh721.js";import{lpe}from"/$bunfs/root/chunk-jjtchkay.js";import{jR}from"/$bunfs/root/chunk-4hp4250a.js";import{Kye}from"/$bunfs/root/chunk-a63syjwt.js";function GGe(o,e,r,i){jR("conversation_reset"),fC("conversation_reset"),R_(WW),wve(),Soe(),h7(),Eve(),Hve(),lpe();let s=Y();for(let t of joe(o.sessionHooksRegistry,s))o.sessionHooksRegistry.remove(s,"Stop",t);r(),Due(),jHe(e),Kye.of(i).emit(s,e.map((t)=>t.uuid)),o.applyMessageOp({type:"replace-all",messages:e})}
export{GGe};
