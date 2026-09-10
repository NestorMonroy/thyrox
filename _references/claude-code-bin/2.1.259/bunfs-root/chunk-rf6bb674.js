// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Q}from"/$bunfs/root/chunk-x1rrg5j2.js";import{cQ,Wke,Eie,zke,Vke}from"/$bunfs/root/chunk-nh5b9j9c.js";import{sV,ob,DC,qde}from"/$bunfs/root/chunk-qpwbvc04.js";import{Aoe}from"/$bunfs/root/chunk-xz3v8y7y.js";import{ame}from"/$bunfs/root/chunk-qpqhpjnf.js";import{mR}from"/$bunfs/root/chunk-9bm3jpvn.js";function IWe(o,s,t){mR("conversation_reset"),DC("conversation_reset"),ob(sV),zke(),Eie(),cQ(),Vke(),Wke(),ame();let e=Q();for(let r of Aoe(o.sessionHooksRegistry,e))o.sessionHooksRegistry.remove(e,"Stop",r);t(),qde(),o.applyMessageOp({type:"replace-all",messages:s})}
export{IWe};
