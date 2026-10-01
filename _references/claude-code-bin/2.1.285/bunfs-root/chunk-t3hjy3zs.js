// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{DKt}from"/$bunfs/root/chunk-wzzj25ac.js";import{Ft,nn,D}from"/$bunfs/root/chunk-bqbammwz.js";import{Vt}from"/$bunfs/root/chunk-thv2q2wm.js";import{w}from"/$bunfs/root/chunk-776wf6tq.js";import{_E,PU}from"/$bunfs/root/chunk-k0qnyh4a.js";import{K,e}from"/$bunfs/root/chunk-ne6sbmea.js";D();import{PassThrough as u}from"stream";function m(){}var pQe=Ft(!1);function fC(r){let i=w(5),{children:t}=r,{exit:n}=_E(),a,o;if(i[0]!==n)a=()=>{let d=setTimeout(n,0);return()=>clearTimeout(d)},o=[n],i[0]=n,i[1]=a,i[2]=o;else a=i[1],o=i[2];nn(a,o);let c;if(i[3]!==t)c=e(K,{children:t}),i[3]=t,i[4]=c;else c=i[4];return c}async function SM(r,t){r.render(e(fC,{children:t})),await r.waitUntilExit()}async function lOe(r,{columns:t,storageV5:n}){let i="",a=!1,o=new u;if(t!==void 0)o.columns=t;return o.on("data",(c)=>{if(a)return;a=!0,i=c.toString()}),await(await PU(e(fC,{children:e(pQe.Provider,{value:!0,children:e(DKt,{value:m,children:r})})}),{stdout:o,patchConsole:!1},{storageV5:n})).waitUntilExit(),i}async function eKt(r,t){let n=await lOe(r,t);return Vt(n)}
export{pQe,fC,SM,lOe,eKt};
