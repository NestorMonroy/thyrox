// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{eCt}from"/$bunfs/root/chunk-6v57qk09.js";import{yt}from"/$bunfs/root/chunk-qk2a968b.js";import{S}from"/$bunfs/root/chunk-6vt364z5.js";import{AT,pD}from"/$bunfs/root/chunk-x41kazpn.js";import{U,e}from"/$bunfs/root/chunk-kd9k0apc.js";import{Kt,fn,L}from"/$bunfs/root/chunk-s59wj17y.js";L();import{PassThrough as R}from"stream";function l(){}var m2e=Kt(!1);function zE(y){let u=S(5),{children:s}=y,{exit:a}=AT(),m,p;if(u[0]!==a)m=()=>{let N=setTimeout(a,0);return()=>clearTimeout(N)},p=[a],u[0]=a,u[1]=m,u[2]=p;else m=u[1],p=u[2];fn(m,p);let f;if(u[3]!==s)f=e(U,{children:s}),u[3]=s,u[4]=f;else f=u[4];return f}async function Bx(r,t){r.render(e(zE,{children:t})),await r.waitUntilExit()}async function F_e(r,{columns:t,storageV5:n}){let i="",c=!1,o=new R;if(t!==void 0)o.columns=t;return o.on("data",(d)=>{if(c)return;c=!0,i=d.toString()}),await(await pD(e(zE,{children:e(m2e.Provider,{value:!0,children:e(eCt,{value:l,children:r})})}),{stdout:o,patchConsole:!1},{storageV5:n})).waitUntilExit(),i}async function wTt(r,t){let n=await F_e(r,t);return yt(n)}
export{m2e,zE,Bx,F_e,wTt};
