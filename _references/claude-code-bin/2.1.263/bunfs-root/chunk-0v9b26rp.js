// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{Qd}from"/$bunfs/root/chunk-gkqebe2m.js";import{y}from"/$bunfs/root/chunk-y1h9ee0c.js";import{I}from"/$bunfs/root/chunk-32f2qmtc.js";import{t}from"/$bunfs/root/chunk-ne2fkdm9.js";import{e,r}from"/$bunfs/root/chunk-kwtapczy.js";import{M}from"/$bunfs/root/chunk-awwpp4fv.js";var tat={success:{icon:M.tick,color:"success",ariaLabel:"done:"},error:{icon:M.cross,color:"error",ariaLabel:"failed:"},warning:{icon:M.warning,color:"warning",ariaLabel:"warning:"},info:{icon:M.info,color:"suggestion",ariaLabel:"note:"},pending:{icon:M.circle,color:void 0,ariaLabel:"pending:"},loading:{icon:"\u2026",color:void 0,ariaLabel:"loading:"}};function et(m){let d=y(8),{status:L,withSpace:u}=m,S=u===void 0?!1:u,o=tat[L];const c=!o.color;let i;if(d[0]!==o.ariaLabel||d[1]!==o.icon)i=e(t,{"aria-label":o.ariaLabel,children:o.icon}),d[0]=o.ariaLabel,d[1]=o.icon,d[2]=i;else i=d[2];const s=S&&" ";let f;if(d[3]!==o.color||d[4]!==c||d[5]!==i||d[6]!==s)f=r(t,{color:o.color,dimColor:c,children:[i,s]}),d[3]=o.color,d[4]=c,d[5]=i,d[6]=s,d[7]=f;else f=d[7];return f}function lu(a){if(a)return!0;return Qd()&&I("tengu_cedar_marsh",!1)}
export{tat,et,lu};
