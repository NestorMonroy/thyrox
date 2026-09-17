// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{S}from"/$bunfs/root/chunk-6vt364z5.js";import{s,n}from"/$bunfs/root/chunk-x41kazpn.js";import{xe}from"/$bunfs/root/chunk-44st6mqy.js";import{e,r}from"/$bunfs/root/chunk-kd9k0apc.js";import{Ft}from"/$bunfs/root/chunk-fw78ggy4.js";function E5t(){return e(xe,{height:1,children:e(n,{dimColor:!0,children:"Fetching\u2026"})})}function xje(P){let g=S(7),{bytes:u,status:R}=P,a;if(g[0]!==u)a=Ft(u),g[0]=u,g[1]=a;else a=g[1];let m;if(g[2]!==a)m=e(n,{bold:!0,children:a}),g[2]=a,g[3]=m;else m=g[3];const i=R!==void 0&&` (${R})`;let y;if(g[4]!==m||g[5]!==i)y=e(xe,{height:1,children:r(n,{children:["Received ",m,i]})}),g[4]=m,g[5]=i,g[6]=y;else y=g[6];return y}function epr({bytes:t,code:o,codeText:c,result:l},d,{verbose:f}){let p=e(xje,{bytes:t,status:`${o} ${c}`});if(f)return r(s,{flexDirection:"column",children:[p,e(s,{flexDirection:"column",children:e(n,{children:l})})]});return p}
export{E5t,xje,epr};
