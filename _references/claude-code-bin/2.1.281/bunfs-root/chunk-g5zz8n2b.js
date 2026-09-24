// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{P1t}from"/$bunfs/root/chunk-q4rbv927.js";import{_t}from"/$bunfs/root/chunk-5wq5hbjb.js";import{w}from"/$bunfs/root/chunk-q93sw3mb.js";import{hv,H$}from"/$bunfs/root/chunk-b8sc2vbx.js";import{G,e}from"/$bunfs/root/chunk-srmsc891.js";import{Vt,cn,D}from"/$bunfs/root/chunk-av0brfrs.js";D();import{PassThrough as u}from"stream";function m(){}var JYe=Vt(!1);function eA(r){let i=w(5),{children:t}=r,{exit:n}=hv(),a,o;if(i[0]!==n)a=()=>{let d=setTimeout(n,0);return()=>clearTimeout(d)},o=[n],i[0]=n,i[1]=a,i[2]=o;else a=i[1],o=i[2];cn(a,o);let c;if(i[3]!==t)c=e(G,{children:t}),i[3]=t,i[4]=c;else c=i[4];return c}async function YH(r,t){r.render(e(eA,{children:t})),await r.waitUntilExit()}async function CCe(r,{columns:t,storageV5:n}){let i="",a=!1,o=new u;if(t!==void 0)o.columns=t;return o.on("data",(c)=>{if(a)return;a=!0,i=c.toString()}),await(await H$(e(eA,{children:e(JYe.Provider,{value:!0,children:e(P1t,{value:m,children:r})})}),{stdout:o,patchConsole:!1},{storageV5:n})).waitUntilExit(),i}async function YBt(r,t){let n=await CCe(r,t);return _t(n)}
export{JYe,eA,YH,CCe,YBt};
