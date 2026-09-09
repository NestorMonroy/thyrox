// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Zct}from"/$bunfs/root/chunk-gbjaaczn.js";import{ft}from"/$bunfs/root/chunk-knsrg480.js";import{y}from"/$bunfs/root/chunk-wqpa7cjn.js";import{UE,TH}from"/$bunfs/root/chunk-5zps47bf.js";import{U,e}from"/$bunfs/root/chunk-zhg3ync1.js";import{Kt,fn,L}from"/$bunfs/root/chunk-v21q572m.js";L();import{PassThrough as R}from"stream";function l(){}var b0e=Kt(!1);function gw(k){let u=y(5),{children:s}=k,{exit:a}=UE(),m,p;if(u[0]!==a)m=()=>{let N=setTimeout(a,0);return()=>clearTimeout(N)},p=[a],u[0]=a,u[1]=m,u[2]=p;else m=u[1],p=u[2];fn(m,p);let f;if(u[3]!==s)f=e(U,{children:s}),u[3]=s,u[4]=f;else f=u[4];return f}async function WT(r,t){r.render(e(gw,{children:t})),await r.waitUntilExit()}async function Wce(r,{columns:t,storageV5:n}){let i="",c=!1,o=new R;if(t!==void 0)o.columns=t;return o.on("data",(d)=>{if(c)return;c=!0,i=d.toString()}),await(await TH(e(gw,{children:e(b0e.Provider,{value:!0,children:e(Zct,{value:l,children:r})})}),{stdout:o,patchConsole:!1},{storageV5:n})).waitUntilExit(),i}async function vct(r,t){let n=await Wce(r,t);return ft(n)}
export{b0e,gw,WT,Wce,vct};
