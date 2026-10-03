// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Ee,Hf,BR,B1e}from"/$bunfs/root/chunk-bxhyh54r.js";import{Cn}from"/$bunfs/root/chunk-actz3rxp.js";import{AsyncLocalStorage as n}from"async_hooks";var e=new n;function hk(t,r){return e.run({cwd:Cn(t)},r)}function Tbe(t,r){return hk(t??oe(),r)}function hue(){return e.getStore()!==void 0}function iWt(t){let r=e.getStore();if(r)r.cwd=Cn(t);else B1e(t)}function aWt(){return e.getStore()?.cwd??BR()}function nm(){if(e.getStore()?.cwd===void 0&&Hf()===null)return null;return oe()}function oe(){try{return aWt()}catch{return Ee()}}
export{hk,Tbe,hue,iWt,aWt,nm,oe};
