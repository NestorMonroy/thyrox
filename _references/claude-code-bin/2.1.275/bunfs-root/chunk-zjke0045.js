// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{w}from"/$bunfs/root/chunk-cb4swk6a.js";import{jJe,uq}from"/$bunfs/root/chunk-8syy9k0k.js";import{n,gt}from"/$bunfs/root/chunk-0hefd0r9.js";import{e}from"/$bunfs/root/chunk-4m6y8tt1.js";function FU(A){let m=w(10),{children:o,color:x,bold:h,linkHref:u}=A,t;if(m[0]!==o||m[1]!==u){t=[];let l=0;for(const i of o.matchAll(jJe)){let R=uq(i[0]);let g=u===void 0?R:u(R);if(g===void 0){continue}if(i.index>l)t.push(o.slice(l,i.index));t.push(e(gt,{url:g,children:g},i.index)),l=i.index+R.length}let c;if(m[3]!==o||m[4]!==l)c=o.slice(l),m[3]=o,m[4]=l,m[5]=c;else c=m[5];t.push(c);m[0]=o,m[1]=u,m[2]=t}else t=m[2];let c;if(m[6]!==h||m[7]!==x||m[8]!==t)c=e(n,{color:x,bold:h,children:t}),m[6]=h,m[7]=x,m[8]=t,m[9]=c;else c=m[9];return c}
export{FU};
