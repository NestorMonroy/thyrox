// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{_e,ZC,txe}from"/$bunfs/root/chunk-ja309z9r.js";import{Jn}from"/$bunfs/root/chunk-g5h2a16k.js";import{AsyncLocalStorage as n}from"async_hooks";var e=new n;function PN(t,r){return e.run({cwd:Jn(t)},r)}function Zee(t,r){return PN(t??te(),r)}function HRe(){return e.getStore()!==void 0}function kor(t){let r=e.getStore();if(r)r.cwd=Jn(t);else txe(t)}function Aor(){return e.getStore()?.cwd??ZC()}function te(){try{return Aor()}catch{return _e()}}
export{PN,Zee,HRe,kor,Aor,te};
