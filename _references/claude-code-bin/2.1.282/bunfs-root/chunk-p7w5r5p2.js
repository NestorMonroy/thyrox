// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Y,CKn,IFt}from"/$bunfs/root/chunk-zwm3fybx.js";import{dOo}from"/$bunfs/root/chunk-f8tyjwrg.js";import{ve}from"/$bunfs/root/chunk-37swe2q7.js";import{join as i}from"path";function g4(){return IFt()??i(QEr(),Y())}function QEr(){return i(ve(),"uploads")}function Dyo(t,e){return`${t}-${u(e)}`}var s=/^[A-Za-z0-9_-]{8}-/;function o(t){return dOo(t.replace(/_+$/,""))}function u(t){return o(t)?t+"_":t}function Lyo(t){let e=t.replace(s,"");if(e.endsWith("_")&&o(e))return e.slice(0,-1);return e||t}var c=1024;function Nyo(t,e){let n=CKn();if(!n.has(t)&&n.size>=c){let r=n.keys().next().value;if(r!==void 0)n.delete(r)}n.set(t,e)}function BIt(t){return CKn().get(t)}
export{g4,QEr,Dyo,Lyo,Nyo,BIt};
