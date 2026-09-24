// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{he,zI,BNe}from"/$bunfs/root/chunk-cqc88nqm.js";import{Hn}from"/$bunfs/root/chunk-35k7s716.js";import{AsyncLocalStorage as n}from"async_hooks";var e=new n;function gB(t,r){return e.run({cwd:Hn(t)},r)}function wae(t,r){return gB(t??ne(),r)}function mNe(){return e.getStore()!==void 0}function BDt(t){let r=e.getStore();if(r)r.cwd=Hn(t);else BNe(t)}function E0r(){return e.getStore()?.cwd??zI()}function ne(){try{return E0r()}catch{return he()}}
export{gB,wae,mNe,BDt,E0r,ne};
