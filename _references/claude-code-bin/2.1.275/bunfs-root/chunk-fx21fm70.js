// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{ye,AR,CIe}from"/$bunfs/root/chunk-4qqe0nh4.js";import{Xn}from"/$bunfs/root/chunk-gfewy5rb.js";import{AsyncLocalStorage as n}from"async_hooks";var e=new n;function t$(t,r){return e.run({cwd:Xn(t)},r)}function Kte(t,r){return t$(t??ne(),r)}function rIe(){return e.getStore()!==void 0}function _cr(t){let r=e.getStore();if(r)r.cwd=Xn(t);else CIe(t)}function bcr(){return e.getStore()?.cwd??AR()}function ne(){try{return bcr()}catch{return ye()}}
export{t$,Kte,rIe,_cr,bcr,ne};
