// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{bVt}from"/$bunfs/root/chunk-ydffmpsy.js";import{wt}from"/$bunfs/root/chunk-pbnxt79v.js";import{w}from"/$bunfs/root/chunk-z1q97ckh.js";import{Jv,dU}from"/$bunfs/root/chunk-mtq6m3s7.js";import{V,e}from"/$bunfs/root/chunk-s81ftaa6.js";import{Vt,sn,L}from"/$bunfs/root/chunk-8fdrzdn0.js";L();import{PassThrough as u}from"stream";function m(){}var LJe=Vt(!1);function jA(r){let i=w(5),{children:t}=r,{exit:n}=Jv(),a,o;if(i[0]!==n)a=()=>{let d=setTimeout(n,0);return()=>clearTimeout(d)},o=[n],i[0]=n,i[1]=a,i[2]=o;else a=i[1],o=i[2];sn(a,o);let c;if(i[3]!==t)c=e(V,{children:t}),i[3]=t,i[4]=c;else c=i[4];return c}async function aM(r,t){r.render(e(jA,{children:t})),await r.waitUntilExit()}async function nPe(r,{columns:t,storageV5:n}){let i="",a=!1,o=new u;if(t!==void 0)o.columns=t;return o.on("data",(c)=>{if(a)return;a=!0,i=c.toString()}),await(await dU(e(jA,{children:e(LJe.Provider,{value:!0,children:e(bVt,{value:m,children:r})})}),{stdout:o,patchConsole:!1},{storageV5:n})).waitUntilExit(),i}async function D2t(r,t){let n=await nPe(r,t);return wt(n)}
export{LJe,jA,aM,nPe,D2t};
