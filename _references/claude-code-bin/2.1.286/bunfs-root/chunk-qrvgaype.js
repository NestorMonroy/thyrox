// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Ee,zf,tx,tWe}from"/$bunfs/root/chunk-hbjpbz2q.js";import{xn}from"/$bunfs/root/chunk-4dvekan0.js";import{AsyncLocalStorage as n}from"async_hooks";var e=new n;function Ak(t,r){return e.run({cwd:xn(t)},r)}function kSe(t,r){return Ak(t??oe(),r)}function Que(){return e.getStore()!==void 0}function gGt(t){let r=e.getStore();if(r)r.cwd=xn(t);else tWe(t)}function hGt(){return e.getStore()?.cwd??tx()}function ym(){if(e.getStore()?.cwd===void 0&&zf()===null)return null;return oe()}function oe(){try{return hGt()}catch{return Ee()}}
export{Ak,kSe,Que,gGt,hGt,ym,oe};
