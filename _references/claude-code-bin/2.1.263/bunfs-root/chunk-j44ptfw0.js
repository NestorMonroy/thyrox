// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{he,BH,Jhe}from"/$bunfs/root/chunk-k6vqz9fa.js";import{Wn}from"/$bunfs/root/chunk-8a7jwk3w.js";import{AsyncLocalStorage as n}from"async_hooks";var e=new n;function ZG(t,r){return e.run({cwd:Wn(t)},r)}function z3(t,r){return ZG(t??Q(),r)}function jCe(){return e.getStore()!==void 0}function OLn(t){let r=e.getStore();if(r)r.cwd=Wn(t);else Jhe(t)}function NLn(){return e.getStore()?.cwd??BH()}function Q(){try{return NLn()}catch{return he()}}
export{ZG,z3,jCe,OLn,NLn,Q};
