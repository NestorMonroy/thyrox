// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{X}from"/$bunfs/root/chunk-k6vqz9fa.js";import{b7,wve,woe,Eve,Ave}from"/$bunfs/root/chunk-s4jfa5rt.js";import{fC,GHe,VW,R_,$ue}from"/$bunfs/root/chunk-9wa0ka8p.js";import{zoe}from"/$bunfs/root/chunk-tpbaacey.js";import{cpe}from"/$bunfs/root/chunk-ksnqt1rs.js";import{jR}from"/$bunfs/root/chunk-2c0zm87n.js";import{Yye}from"/$bunfs/root/chunk-z8vany77.js";function WGe(o,e,r,i){jR("conversation_reset"),fC("conversation_reset"),R_(VW),Eve(),woe(),b7(),Ave(),wve(),cpe();let s=X();for(let t of zoe(o.sessionHooksRegistry,s))o.sessionHooksRegistry.remove(s,"Stop",t);r(),$ue(),GHe(e),Yye.of(i).emit(s,e.map((t)=>t.uuid)),o.applyMessageOp({type:"replace-all",messages:e})}
export{WGe};
