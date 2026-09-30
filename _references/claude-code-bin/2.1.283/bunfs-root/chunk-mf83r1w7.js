// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{we,hm,zP,SBe}from"/$bunfs/root/chunk-nvht7ckf.js";import{xn}from"/$bunfs/root/chunk-yqm14hey.js";import{AsyncLocalStorage as n}from"async_hooks";var e=new n;function Yx(t,r){return e.run({cwd:xn(t)},r)}function S_e(t,r){return Yx(t??oe(),r)}function bde(){return e.getStore()!==void 0}function QBt(t){let r=e.getStore();if(r)r.cwd=xn(t);else SBe(t)}function ZBt(){return e.getStore()?.cwd??zP()}function fg(){if(e.getStore()?.cwd===void 0&&hm()===null)return null;return oe()}function oe(){try{return ZBt()}catch{return we()}}
export{Yx,S_e,bde,QBt,ZBt,fg,oe};
