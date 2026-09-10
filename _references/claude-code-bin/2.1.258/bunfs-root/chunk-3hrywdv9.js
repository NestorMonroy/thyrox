// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{Fdt}from"/$bunfs/root/chunk-65x0x96q.js";import{Ht}from"/$bunfs/root/chunk-6tm4k51s.js";import{y}from"/$bunfs/root/chunk-m3sgv6yt.js";import{cR,mL}from"/$bunfs/root/chunk-tj5q8vxd.js";import{B,e}from"/$bunfs/root/chunk-pbthxwmf.js";import{hn,Dn,j}from"/$bunfs/root/chunk-db688wrz.js";j();import{PassThrough as R}from"stream";function l(){}var XRe=hn(!1);function YS(k){let u=y(5),{children:s}=k,{exit:a}=cR(),m,p;if(u[0]!==a)m=()=>{let N=setTimeout(a,0);return()=>clearTimeout(N)},p=[a],u[0]=a,u[1]=m,u[2]=p;else m=u[1],p=u[2];Dn(m,p);let f;if(u[3]!==s)f=e(B,{children:s}),u[3]=s,u[4]=f;else f=u[4];return f}async function Ik(r,t){r.render(e(YS,{children:t})),await r.waitUntilExit()}async function Kae(r,{columns:t,storageV5:n}){let i="",c=!1,o=new R;if(t!==void 0)o.columns=t;return o.on("data",(d)=>{if(c)return;c=!0,i=d.toString()}),await(await mL(e(YS,{children:e(XRe.Provider,{value:!0,children:e(Fdt,{value:l,children:r})})}),{stdout:o,patchConsole:!1},{storageV5:n})).waitUntilExit(),i}async function Wit(r,t){let n=await Kae(r,t);return Ht(n)}
export{XRe,YS,Ik,Kae,Wit};
