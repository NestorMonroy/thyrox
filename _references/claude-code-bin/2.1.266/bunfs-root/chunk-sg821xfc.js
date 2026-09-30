// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{y}from"/$bunfs/root/chunk-wqpa7cjn.js";import{o,n}from"/$bunfs/root/chunk-5zps47bf.js";import{xe}from"/$bunfs/root/chunk-07nxs6zw.js";import{e,r}from"/$bunfs/root/chunk-zhg3ync1.js";import{xt}from"/$bunfs/root/chunk-4t77cyf6.js";function ZOt(){return e(xe,{height:1,children:e(n,{dimColor:!0,children:"Fetching\u2026"})})}function GHe(h){let g=y(7),{bytes:u,status:R}=h,a;if(g[0]!==u)a=xt(u),g[0]=u,g[1]=a;else a=g[1];let m;if(g[2]!==a)m=e(n,{bold:!0,children:a}),g[2]=a,g[3]=m;else m=g[3];const i=R!==void 0&&` (${R})`;let d;if(g[4]!==m||g[5]!==i)d=e(xe,{height:1,children:r(n,{children:["Received ",m,i]})}),g[4]=m,g[5]=i,g[6]=d;else d=g[6];return d}function nzn({bytes:t,code:s,codeText:c,result:l},x,{verbose:f}){let p=e(GHe,{bytes:t,status:`${s} ${c}`});if(f)return r(o,{flexDirection:"column",children:[p,e(o,{flexDirection:"column",children:e(n,{children:l})})]});return p}
export{ZOt,GHe,nzn};
