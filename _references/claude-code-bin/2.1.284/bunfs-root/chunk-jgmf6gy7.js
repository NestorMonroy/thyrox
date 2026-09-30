// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{KKt}from"/$bunfs/root/chunk-qhpftar7.js";import{Et}from"/$bunfs/root/chunk-3xxkkv4v.js";import{w}from"/$bunfs/root/chunk-2bpvr3fa.js";import{gE,PU}from"/$bunfs/root/chunk-gjfhbdvy.js";import{K,e}from"/$bunfs/root/chunk-fr6qx5c3.js";import{zt,sn,L}from"/$bunfs/root/chunk-68gegf2j.js";L();import{PassThrough as u}from"stream";function m(){}var uQe=zt(!1);function rC(r){let i=w(5),{children:t}=r,{exit:n}=gE(),a,o;if(i[0]!==n)a=()=>{let d=setTimeout(n,0);return()=>clearTimeout(d)},o=[n],i[0]=n,i[1]=a,i[2]=o;else a=i[1],o=i[2];sn(a,o);let c;if(i[3]!==t)c=e(K,{children:t}),i[3]=t,i[4]=c;else c=i[4];return c}async function wM(r,t){r.render(e(rC,{children:t})),await r.waitUntilExit()}async function gOe(r,{columns:t,storageV5:n}){let i="",a=!1,o=new u;if(t!==void 0)o.columns=t;return o.on("data",(c)=>{if(a)return;a=!0,i=c.toString()}),await(await PU(e(rC,{children:e(uQe.Provider,{value:!0,children:e(KKt,{value:m,children:r})})}),{stdout:o,patchConsole:!1},{storageV5:n})).waitUntilExit(),i}async function uKt(r,t){let n=await gOe(r,t);return Et(n)}
export{uQe,rC,wM,gOe,uKt};
