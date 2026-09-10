// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{y}from"/$bunfs/root/chunk-m3sgv6yt.js";import{n}from"/$bunfs/root/chunk-tj5q8vxd.js";import{r}from"/$bunfs/root/chunk-pbthxwmf.js";function Uh(m){let u=y(10),{added:o,removed:t,bold:f}=m;if(o===0&&t===0){return null}let p;if(u[0]!==o||u[1]!==f)p=o>0&&r(n,{color:"diffAddedWord",bold:f,children:["+",o]}),u[0]=o,u[1]=f,u[2]=p;else p=u[2];const R=o>0&&t>0&&" ";let b;if(u[3]!==f||u[4]!==t)b=t>0&&r(n,{color:"diffRemovedWord",bold:f,children:["-",t]}),u[3]=f,u[4]=t,u[5]=b;else b=u[5];let d;if(u[6]!==p||u[7]!==R||u[8]!==b)d=r(n,{children:[p,R,b]}),u[6]=p,u[7]=R,u[8]=b,u[9]=d;else d=u[9];return d}
export{Uh};
