// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{w}from"/$bunfs/root/chunk-776wf6tq.js";import{Zt,n}from"/$bunfs/root/chunk-k0qnyh4a.js";import{ele,brn,MS,ie,A,k,g,D}from"/$bunfs/root/chunk-bqbammwz.js";import{F}from"/$bunfs/root/chunk-aeeennxe.js";import{e}from"/$bunfs/root/chunk-ne6sbmea.js";import{S}from"/$bunfs/root/chunk-675ch139.js";function wG(i){let u=w(2),{via:o}=i;if(o==="native"){let r;if(u[0]===S)r=e(n,{color:"success",children:"(Copied!)"}),u[0]=r;else r=u[0];return r}if(o===null){let r;if(u[1]===S)r=e(n,{dimColor:!0,children:e(F,{chord:"c",action:"copy",parens:!0})}),u[1]=r;else r=u[1];return r}return null}function vG(i){let u=w(2),{via:o}=i;if(o==="tmux-buffer"){let r;if(u[0]===S)r=e(n,{dimColor:!0,children:"(Copied to tmux buffer \xB7 select the URL manually if paste fails)"}),u[0]=r;else r=u[0];return r}if(o==="osc52"){let r;if(u[1]===S)r=e(n,{dimColor:!0,children:"(Sent via OSC 52 \xB7 select the URL manually if paste fails)"}),u[1]=r;else r=u[1];return r}return null}D();var h=2000,P=2000;function gQ(i){let o=Zt(),[u,r]=g(null),t=k(null),c=k(null),l=k(null),a=k(0),s=k(!0),p=ie(()=>{a.current+=1,l.current?.(),l.current=null,c.current=null,t.current?.(),t.current=null,r(null)},[]);A(()=>{if(p(),i!==null)brn()},[i,p]),A(()=>(s.current=!0,()=>{s.current=!1,l.current?.(),l.current=null,c.current=null,t.current?.(),t.current=null}),[]);let b=ie((d)=>{if(c.current===d)return;c.current=d,l.current?.(),l.current=o.setTimeout(()=>{l.current=null,c.current=null},h);let f=ele(),y=a.current;MS(d).then((C)=>{if(!s.current||y!==a.current)return;if(C)process.stdout.write(C);if(t.current?.(),t.current=null,r(f),f==="native")t.current=o.setTimeout(()=>{t.current=null,r(null)},P)})},[o]);return{copiedVia:u,copy:b,reset:p}}
export{wG,vG,gQ};
