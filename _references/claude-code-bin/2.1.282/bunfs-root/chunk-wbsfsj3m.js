// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{he,mCe,lP,fFe}from"/$bunfs/root/chunk-zwm3fybx.js";import{Pn}from"/$bunfs/root/chunk-f8tyjwrg.js";import{AsyncLocalStorage as n}from"async_hooks";var e=new n;function jB(t,r){return e.run({cwd:Pn(t)},r)}function vle(t,r){return jB(t??ne(),r)}function j$e(){return e.getStore()!==void 0}function S$t(t){let r=e.getStore();if(r)r.cwd=Pn(t);else fFe(t)}function qNr(){return e.getStore()?.cwd??lP()}function F0(){if(e.getStore()?.cwd===void 0&&mCe()===null)return null;return ne()}function ne(){try{return qNr()}catch{return he()}}
export{jB,vle,j$e,S$t,qNr,F0,ne};
