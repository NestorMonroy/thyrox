// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{op}from"/$bunfs/root/chunk-gbjaaczn.js";import{y}from"/$bunfs/root/chunk-wqpa7cjn.js";import{I}from"/$bunfs/root/chunk-btbsn9s4.js";import{n}from"/$bunfs/root/chunk-5zps47bf.js";import{e,r}from"/$bunfs/root/chunk-zhg3ync1.js";import{D}from"/$bunfs/root/chunk-y1keqvk9.js";var Ect={success:{icon:D.tick,color:"success",ariaLabel:"done:"},error:{icon:D.cross,color:"error",ariaLabel:"failed:"},warning:{icon:D.warning,color:"warning",ariaLabel:"warning:"},info:{icon:D.info,color:"suggestion",ariaLabel:"note:"},pending:{icon:D.circle,color:void 0,ariaLabel:"pending:"},loading:{icon:"\u2026",color:void 0,ariaLabel:"loading:"}};function rt(m){let d=y(8),{status:L,withSpace:u}=m,S=u===void 0?!1:u,o=Ect[L];const c=!o.color;let t;if(d[0]!==o.ariaLabel||d[1]!==o.icon)t=e(n,{"aria-label":o.ariaLabel,children:o.icon}),d[0]=o.ariaLabel,d[1]=o.icon,d[2]=t;else t=d[2];const s=S&&" ";let f;if(d[3]!==o.color||d[4]!==c||d[5]!==t||d[6]!==s)f=r(n,{color:o.color,dimColor:c,children:[t,s]}),d[3]=o.color,d[4]=c,d[5]=t,d[6]=s,d[7]=f;else f=d[7];return f}function yu(i){if(i)return!0;return op()&&I("tengu_cedar_marsh",!1)}
export{Ect,rt,yu};
