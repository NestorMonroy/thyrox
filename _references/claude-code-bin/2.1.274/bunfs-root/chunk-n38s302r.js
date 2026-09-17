// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{S}from"/$bunfs/root/chunk-6vt364z5.js";import{H9e,PG}from"/$bunfs/root/chunk-qfxegd6m.js";import{n,ft}from"/$bunfs/root/chunk-x41kazpn.js";import{e}from"/$bunfs/root/chunk-kd9k0apc.js";function nU(A){let m=S(10),{children:o,color:x,bold:h,linkHref:u}=A,t;if(m[0]!==o||m[1]!==u){t=[];let l=0;for(const i of o.matchAll(H9e)){let R=PG(i[0]);let g=u===void 0?R:u(R);if(g===void 0){continue}if(i.index>l)t.push(o.slice(l,i.index));t.push(e(ft,{url:g,children:g},i.index)),l=i.index+R.length}let c;if(m[3]!==o||m[4]!==l)c=o.slice(l),m[3]=o,m[4]=l,m[5]=c;else c=m[5];t.push(c);m[0]=o,m[1]=u,m[2]=t}else t=m[2];let c;if(m[6]!==h||m[7]!==x||m[8]!==t)c=e(n,{color:x,bold:h,children:t}),m[6]=h,m[7]=x,m[8]=t,m[9]=c;else c=m[9];return c}
export{nU};
