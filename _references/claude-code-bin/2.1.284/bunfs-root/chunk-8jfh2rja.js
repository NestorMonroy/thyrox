// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{we,Em,aO,$1e}from"/$bunfs/root/chunk-d37h8mav.js";import{En}from"/$bunfs/root/chunk-zy97v06w.js";import{AsyncLocalStorage as n}from"async_hooks";var e=new n;function aP(t,r){return e.run({cwd:En(t)},r)}function Cbe(t,r){return aP(t??oe(),r)}function hue(){return e.getStore()!==void 0}function AWt(t){let r=e.getStore();if(r)r.cwd=En(t);else $1e(t)}function CWt(){return e.getStore()?.cwd??aO()}function om(){if(e.getStore()?.cwd===void 0&&Em()===null)return null;return oe()}function oe(){try{return CWt()}catch{return we()}}
export{aP,Cbe,hue,AWt,CWt,om,oe};
