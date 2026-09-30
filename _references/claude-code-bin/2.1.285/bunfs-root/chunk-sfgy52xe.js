// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{V,AJn,vzt}from"/$bunfs/root/chunk-bxhyh54r.js";import{rGo}from"/$bunfs/root/chunk-actz3rxp.js";import{we}from"/$bunfs/root/chunk-v34cw0y6.js";import{join as i}from"path";function v3(){return vzt()??i($Ir(),V())}function $Ir(){return i(we(),"uploads")}function yAo(t,e){return`${t}-${u(e)}`}var s=/^[A-Za-z0-9_-]{8}-/;function o(t){return rGo(t.replace(/_+$/,""))}function u(t){return o(t)?t+"_":t}function _Ao(t){let e=t.replace(s,"");if(e.endsWith("_")&&o(e))return e.slice(0,-1);return e||t}var c=1024;function bAo(t,e){let n=AJn();if(!n.has(t)&&n.size>=c){let r=n.keys().next().value;if(r!==void 0)n.delete(r)}n.set(t,e)}function OMt(t){return AJn().get(t)}
export{v3,$Ir,yAo,_Ao,bAo,OMt};
