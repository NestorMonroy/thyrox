// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{_e,CE,Lae}from"/$bunfs/root/chunk-x1rrg5j2.js";import{Xn}from"/$bunfs/root/chunk-jdw11prg.js";import{AsyncLocalStorage as n}from"async_hooks";var e=new n;function DW(t,r){return e.run({cwd:Xn(t)},r)}function f6(t,r){return DW(t??ne(),r)}function BIe(){return e.getStore()!==void 0}function $Dn(t){let r=e.getStore();if(r)r.cwd=Xn(t);else Lae(t)}function MDn(){return e.getStore()?.cwd??CE()}function ne(){try{return MDn()}catch{return _e()}}
export{DW,f6,BIe,$Dn,MDn,ne};
