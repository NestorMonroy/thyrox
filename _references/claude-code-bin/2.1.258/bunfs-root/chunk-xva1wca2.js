// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Cf}from"/$bunfs/root/chunk-65x0x96q.js";import{y}from"/$bunfs/root/chunk-m3sgv6yt.js";import{L}from"/$bunfs/root/chunk-8qt7d28b.js";import{n}from"/$bunfs/root/chunk-tj5q8vxd.js";import{e,r}from"/$bunfs/root/chunk-pbthxwmf.js";import{N}from"/$bunfs/root/chunk-tb0rqh1q.js";var zit={success:{icon:N.tick,color:"success",ariaLabel:"done:"},error:{icon:N.cross,color:"error",ariaLabel:"failed:"},warning:{icon:N.warning,color:"warning",ariaLabel:"warning:"},info:{icon:N.info,color:"suggestion",ariaLabel:"note:"},pending:{icon:N.circle,color:void 0,ariaLabel:"pending:"},loading:{icon:"\u2026",color:void 0,ariaLabel:"loading:"}};function rt(m){let d=y(8),{status:S,withSpace:u}=m,w=u===void 0?!1:u,o=zit[S];const c=!o.color;let t;if(d[0]!==o.ariaLabel||d[1]!==o.icon)t=e(n,{"aria-label":o.ariaLabel,children:o.icon}),d[0]=o.ariaLabel,d[1]=o.icon,d[2]=t;else t=d[2];const s=w&&" ";let f;if(d[3]!==o.color||d[4]!==c||d[5]!==t||d[6]!==s)f=r(n,{color:o.color,dimColor:c,children:[t,s]}),d[3]=o.color,d[4]=c,d[5]=t,d[6]=s,d[7]=f;else f=d[7];return f}function dd(i){if(i)return!0;return Cf()&&L("tengu_cedar_marsh",!1)}
export{zit,rt,dd};
