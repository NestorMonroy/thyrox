// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Dr}from"/$bunfs/root/chunk-b93xrf5w.js";import{w}from"/$bunfs/root/chunk-q93sw3mb.js";import{ie}from"/$bunfs/root/chunk-a22am1vw.js";import{n}from"/$bunfs/root/chunk-b8sc2vbx.js";import{e,r}from"/$bunfs/root/chunk-srmsc891.js";import{X}from"/$bunfs/root/chunk-7grzwhk6.js";var Hft={success:{icon:X.tick,color:"success",ariaLabel:"done:"},error:{icon:X.cross,color:"error",ariaLabel:"failed:"},warning:{icon:X.warning,color:"warning",ariaLabel:"warning:"},info:{icon:X.info,color:"suggestion",ariaLabel:"note:"},pending:{icon:X.circle,color:void 0,ariaLabel:"pending:"},loading:{icon:"\u2026",color:void 0,ariaLabel:"loading:"},running:{icon:Dr,color:void 0,ariaLabel:"running:"},on:{icon:X.tick,color:"success",ariaLabel:"on:"},off:{icon:X.circle,color:void 0,ariaLabel:"off:"}};function J3n(){return Math.max(...Object.values(Hft).map((c)=>ie(c.icon)))}function st(c){let u=w(8),{status:L,"aria-label":m,withSpace:g}=c,S=g===void 0?!1:g,o=Hft[L];const t=!o.color,s=m??o.ariaLabel;let i;if(u[0]!==o.icon||u[1]!==s)i=e(n,{"aria-label":s,children:o.icon}),u[0]=o.icon,u[1]=s,u[2]=i;else i=u[2];const l=S&&" ";let f;if(u[3]!==o.color||u[4]!==t||u[5]!==i||u[6]!==l)f=r(n,{color:o.color,dimColor:t,children:[i,l]}),u[3]=o.color,u[4]=t,u[5]=i,u[6]=l,u[7]=f;else f=u[7];return f}
export{Hft,J3n,st};
