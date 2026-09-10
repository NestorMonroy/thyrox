// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{_e,mE,Fse}from"/$bunfs/root/chunk-b1z7jvb2.js";import{Xn}from"/$bunfs/root/chunk-ycrs8y50.js";import{AsyncLocalStorage as n}from"async_hooks";var e=new n;function uW(t,r){return e.run({cwd:Xn(t)},r)}function L3(t,r){return uW(t??ne(),r)}function ACe(){return e.getStore()!==void 0}function $xn(t){let r=e.getStore();if(r)r.cwd=Xn(t);else Fse(t)}function Mxn(){return e.getStore()?.cwd??mE()}function ne(){try{return Mxn()}catch{return _e()}}
export{uW,L3,ACe,$xn,Mxn,ne};
