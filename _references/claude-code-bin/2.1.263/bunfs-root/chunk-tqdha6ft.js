// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{Cat}from"/$bunfs/root/chunk-gkqebe2m.js";import{ft}from"/$bunfs/root/chunk-te0qwtpy.js";import{y}from"/$bunfs/root/chunk-y1h9ee0c.js";import{cE,Nx}from"/$bunfs/root/chunk-ne2fkdm9.js";import{N,e}from"/$bunfs/root/chunk-kwtapczy.js";import{Qt,dn,F}from"/$bunfs/root/chunk-1c6mq242.js";F();import{PassThrough as R}from"stream";function l(){}var hxe=Qt(!1);function GS(k){let u=y(5),{children:s}=k,{exit:a}=cE(),m,p;if(u[0]!==a)m=()=>{let h=setTimeout(a,0);return()=>clearTimeout(h)},p=[a],u[0]=a,u[1]=m,u[2]=p;else m=u[1],p=u[2];dn(m,p);let f;if(u[3]!==s)f=e(N,{children:s}),u[3]=s,u[4]=f;else f=u[4];return f}async function _k(r,t){r.render(e(GS,{children:t})),await r.waitUntilExit()}async function dle(r,{columns:t,storageV5:n}){let i="",c=!1,o=new R;if(t!==void 0)o.columns=t;return o.on("data",(d)=>{if(c)return;c=!0,i=d.toString()}),await(await Nx(e(GS,{children:e(hxe.Provider,{value:!0,children:e(Cat,{value:l,children:r})})}),{stdout:o,patchConsole:!1},{storageV5:n})).waitUntilExit(),i}async function eat(r,t){let n=await dle(r,t);return ft(n)}
export{hxe,GS,_k,dle,eat};
