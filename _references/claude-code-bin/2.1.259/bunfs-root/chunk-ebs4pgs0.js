// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Uat}from"/$bunfs/root/chunk-p97n3qf8.js";import{Ht}from"/$bunfs/root/chunk-7xxnrgeg.js";import{y}from"/$bunfs/root/chunk-szxazvwk.js";import{dR,uL}from"/$bunfs/root/chunk-h8z84shc.js";import{B,e}from"/$bunfs/root/chunk-g3erx2ps.js";import{_n,Mn,j}from"/$bunfs/root/chunk-w71cs9yg.js";j();import{PassThrough as R}from"stream";function l(){}var _Le=_n(!1);function oH(k){let u=y(5),{children:s}=k,{exit:a}=dR(),m,p;if(u[0]!==a)m=()=>{let N=setTimeout(a,0);return()=>clearTimeout(N)},p=[a],u[0]=a,u[1]=m,u[2]=p;else m=u[1],p=u[2];Mn(m,p);let f;if(u[3]!==s)f=e(B,{children:s}),u[3]=s,u[4]=f;else f=u[4];return f}async function Uk(r,t){r.render(e(oH,{children:t})),await r.waitUntilExit()}async function jle(r,{columns:t,storageV5:n}){let i="",c=!1,o=new R;if(t!==void 0)o.columns=t;return o.on("data",(d)=>{if(c)return;c=!0,i=d.toString()}),await(await uL(e(oH,{children:e(_Le.Provider,{value:!0,children:e(Uat,{value:l,children:r})})}),{stdout:o,patchConsole:!1},{storageV5:n})).waitUntilExit(),i}async function gat(r,t){let n=await jle(r,t);return Ht(n)}
export{_Le,oH,Uk,jle,gat};
