// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{q,MZn,N2t}from"/$bunfs/root/chunk-hbjpbz2q.js";import{U4o}from"/$bunfs/root/chunk-4dvekan0.js";import{we}from"/$bunfs/root/chunk-xz4v1m80.js";import{join as i}from"path";function xF(){return N2t()??i(RLr(),q())}function RLr(){return i(we(),"uploads")}function Ldn(t,e){return`${t}-${u(e)}`}var s=/^[A-Za-z0-9_-]{8}-/;function o(t){return U4o(t.replace(/_+$/,""))}function u(t){return o(t)?t+"_":t}function CHo(t){let e=t.replace(s,"");if(e.endsWith("_")&&o(e))return e.slice(0,-1);return e||t}var c=1024;function RHo(t,e){let n=MZn();if(!n.has(t)&&n.size>=c){let r=n.keys().next().value;if(r!==void 0)n.delete(r)}n.set(t,e)}function WLt(t){return MZn().get(t)}
export{xF,RLr,Ldn,CHo,RHo,WLt};
