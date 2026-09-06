// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{y}from"/$bunfs/root/chunk-y1h9ee0c.js";import{o,t}from"/$bunfs/root/chunk-ne2fkdm9.js";import{Re}from"/$bunfs/root/chunk-5ecc20p7.js";import{e,r}from"/$bunfs/root/chunk-kwtapczy.js";import{Ot}from"/$bunfs/root/chunk-a7yj38h2.js";function oPt(){return e(Re,{height:1,children:e(t,{dimColor:!0,children:"Fetching\u2026"})})}function GIe(h){let g=y(7),{bytes:u,status:R}=h,n;if(g[0]!==u)n=Ot(u),g[0]=u,g[1]=n;else n=g[1];let m;if(g[2]!==n)m=e(t,{bold:!0,children:n}),g[2]=n,g[3]=m;else m=g[3];const i=R!==void 0&&` (${R})`;let d;if(g[4]!==m||g[5]!==i)d=e(Re,{height:1,children:r(t,{children:["Received ",m,i]})}),g[4]=m,g[5]=i,g[6]=d;else d=g[6];return d}function HBn({bytes:a,code:s,codeText:c,result:l},x,{verbose:f}){let p=e(GIe,{bytes:a,status:`${s} ${c}`});if(f)return r(o,{flexDirection:"column",children:[p,e(o,{flexDirection:"column",children:e(t,{children:l})})]});return p}
export{oPt,GIe,HBn};
