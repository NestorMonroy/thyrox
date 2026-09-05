// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Gca as c,Wma as p,Xca as d,pna as f,xna as l}from"/$bunfs/root/_441.js";import{cid as n,nid as g}from"/$bunfs/root/_824.js";l();d();g();function C(e,o,r){if(!o)return e;if(n())return e;if(r?.strictMcpConfig&&o.source!=="flagSettings"||f())return e;let t=c(o);if(Object.keys(t).length===0)return e;let{allowed:s,blocked:i}=p(t);if(i.length>0)r?.onBlocked?.(i);return{...s,...e}}
export{C as Rb};
