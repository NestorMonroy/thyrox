// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Oxt}from"/$bunfs/root/chunk-s09hj0q3.js";import{_t}from"/$bunfs/root/chunk-75n2g1wh.js";import{w}from"/$bunfs/root/chunk-cb4swk6a.js";import{Qv,HD}from"/$bunfs/root/chunk-0hefd0r9.js";import{U,e}from"/$bunfs/root/chunk-4m6y8tt1.js";import{Xt,pn,D}from"/$bunfs/root/chunk-347kpssc.js";D();import{PassThrough as R}from"stream";function l(){}var uWe=Xt(!1);function Sk(y){let u=w(5),{children:s}=y,{exit:a}=Qv(),m,p;if(u[0]!==a)m=()=>{let N=setTimeout(a,0);return()=>clearTimeout(N)},p=[a],u[0]=a,u[1]=m,u[2]=p;else m=u[1],p=u[2];pn(m,p);let f;if(u[3]!==s)f=e(U,{children:s}),u[3]=s,u[4]=f;else f=u[4];return f}async function kI(r,t){r.render(e(Sk,{children:t})),await r.waitUntilExit()}async function sSe(r,{columns:t,storageV5:n}){let i="",c=!1,o=new R;if(t!==void 0)o.columns=t;return o.on("data",(d)=>{if(c)return;c=!0,i=d.toString()}),await(await HD(e(Sk,{children:e(uWe.Provider,{value:!0,children:e(Oxt,{value:l,children:r})})}),{stdout:o,patchConsole:!1},{storageV5:n})).waitUntilExit(),i}async function ext(r,t){let n=await sSe(r,t);return _t(n)}
export{uWe,Sk,kI,sSe,ext};
