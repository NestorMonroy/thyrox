// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{he,uA,N_e}from"/$bunfs/root/chunk-t8q7n4ta.js";import{Wn}from"/$bunfs/root/chunk-a7esebzw.js";import{AsyncLocalStorage as n}from"async_hooks";var e=new n;function hL(t,r){return e.run({cwd:Wn(t)},r)}function nY(t,r){return hL(t??Q(),r)}function OIe(){return e.getStore()!==void 0}function DDn(t){let r=e.getStore();if(r)r.cwd=Wn(t);else N_e(t)}function LDn(){return e.getStore()?.cwd??uA()}function Q(){try{return LDn()}catch{return he()}}
export{hL,nY,OIe,DDn,LDn,Q};
