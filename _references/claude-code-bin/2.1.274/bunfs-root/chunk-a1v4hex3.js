// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{S}from"/$bunfs/root/chunk-6vt364z5.js";import{n}from"/$bunfs/root/chunk-x41kazpn.js";import{e,r}from"/$bunfs/root/chunk-kd9k0apc.js";import{N}from"/$bunfs/root/chunk-x7szm81w.js";var vTt={success:{icon:N.tick,color:"success",ariaLabel:"done:"},error:{icon:N.cross,color:"error",ariaLabel:"failed:"},warning:{icon:N.warning,color:"warning",ariaLabel:"warning:"},info:{icon:N.info,color:"suggestion",ariaLabel:"note:"},pending:{icon:N.circle,color:void 0,ariaLabel:"pending:"},loading:{icon:"\u2026",color:void 0,ariaLabel:"loading:"}};function ht(L){let d=S(8),{status:w,withSpace:g}=L,m=g===void 0?!1:g,o=vTt[w];const c=!o.color;let i;if(d[0]!==o.ariaLabel||d[1]!==o.icon)i=e(n,{"aria-label":o.ariaLabel,children:o.icon}),d[0]=o.ariaLabel,d[1]=o.icon,d[2]=i;else i=d[2];const t=m&&" ";let u;if(d[3]!==o.color||d[4]!==c||d[5]!==i||d[6]!==t)u=r(n,{color:o.color,dimColor:c,children:[i,t]}),d[3]=o.color,d[4]=c,d[5]=i,d[6]=t,d[7]=u;else u=d[7];return u}
export{vTt,ht};
