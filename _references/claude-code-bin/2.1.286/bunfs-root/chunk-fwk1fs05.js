// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Zt}from"/$bunfs/root/chunk-pn8bw28z.js";import{K5t}from"/$bunfs/root/chunk-q9anr44a.js";import{Ft,on,D}from"/$bunfs/root/chunk-mqace48v.js";import{w}from"/$bunfs/root/chunk-beptw75w.js";import{HE,pB}from"/$bunfs/root/chunk-fsx1dvsr.js";import{K,e}from"/$bunfs/root/chunk-9av83rwa.js";D();import{PassThrough as u}from"stream";function m(){}var $Ze=Ft(!1);function IC(r){let i=w(5),{children:t}=r,{exit:n}=HE(),a,o;if(i[0]!==n)a=()=>{let d=setTimeout(n,0);return()=>clearTimeout(d)},o=[n],i[0]=n,i[1]=a,i[2]=o;else a=i[1],o=i[2];on(a,o);let c;if(i[3]!==t)c=e(K,{children:t}),i[3]=t,i[4]=c;else c=i[4];return c}async function DH(r,t){r.render(e(IC,{children:t})),await r.waitUntilExit()}async function lMe(r,{columns:t,storageV5:n}){let i="",a=!1,o=new u;if(t!==void 0)o.columns=t;return o.on("data",(c)=>{if(a)return;a=!0,i=c.toString()}),await(await pB(e(IC,{children:e($Ze.Provider,{value:!0,children:e(K5t,{value:m,children:r})})}),{stdout:o,patchConsole:!1},{storageV5:n})).waitUntilExit(),i}async function Z4t(r,t){let n=await lMe(r,t);return Zt(n)}
export{$Ze,IC,DH,lMe,Z4t};
