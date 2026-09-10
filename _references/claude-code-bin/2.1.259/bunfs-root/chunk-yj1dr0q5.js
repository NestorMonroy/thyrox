// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{y}from"/$bunfs/root/chunk-szxazvwk.js";import{ije,rZ}from"/$bunfs/root/chunk-5t2g7ar8.js";import{n,ht}from"/$bunfs/root/chunk-h8z84shc.js";import{e}from"/$bunfs/root/chunk-g3erx2ps.js";function dM(g){let m=y(9),{children:o,color:f,bold:x}=g,t;if(m[0]!==o){t=[];let l=0;for(const a of o.matchAll(ije)){let u=rZ(a[0]);if(a.index>l)t.push(o.slice(l,a.index));t.push(e(ht,{url:u,children:u},a.index)),l=a.index+u.length}let c;if(m[2]!==o||m[3]!==l)c=o.slice(l),m[2]=o,m[3]=l,m[4]=c;else c=m[4];t.push(c);m[0]=o,m[1]=t}else t=m[1];let c;if(m[5]!==x||m[6]!==f||m[7]!==t)c=e(n,{color:f,bold:x,children:t}),m[5]=x,m[6]=f,m[7]=t,m[8]=c;else c=m[8];return c}
export{dM};
