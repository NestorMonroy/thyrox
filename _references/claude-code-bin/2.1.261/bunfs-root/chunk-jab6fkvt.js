// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{he,BH,Xhe}from"/$bunfs/root/chunk-annedm50.js";import{Wn}from"/$bunfs/root/chunk-dcawh0q4.js";import{AsyncLocalStorage as n}from"async_hooks";var e=new n;function QG(t,r){return e.run({cwd:Wn(t)},r)}function j3(t,r){return QG(t??Q(),r)}function jCe(){return e.getStore()!==void 0}function $Ln(t){let r=e.getStore();if(r)r.cwd=Wn(t);else Xhe(t)}function MLn(){return e.getStore()?.cwd??BH()}function Q(){try{return MLn()}catch{return he()}}
export{QG,j3,jCe,$Ln,MLn,Q};
