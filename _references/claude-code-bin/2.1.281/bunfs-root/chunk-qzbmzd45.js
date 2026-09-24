// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Y,UGn,YLt}from"/$bunfs/root/chunk-cqc88nqm.js";import{UCo}from"/$bunfs/root/chunk-35k7s716.js";import{we}from"/$bunfs/root/chunk-8bp13hnn.js";import{join as i}from"path";function HK(){return YLt()??i(Uhr(),Y())}function Uhr(){return i(we(),"uploads")}function cdo(t,e){return`${t}-${u(e)}`}var s=/^[A-Za-z0-9_-]{8}-/;function o(t){return UCo(t.replace(/_+$/,""))}function u(t){return o(t)?t+"_":t}function ddo(t){let e=t.replace(s,"");if(e.endsWith("_")&&o(e))return e.slice(0,-1);return e||t}var c=1024;function udo(t,e){let n=UGn();if(!n.has(t)&&n.size>=c){let r=n.keys().next().value;if(r!==void 0)n.delete(r)}n.set(t,e)}function YAt(t){return UGn().get(t)}
export{HK,Uhr,cdo,ddo,udo,YAt};
