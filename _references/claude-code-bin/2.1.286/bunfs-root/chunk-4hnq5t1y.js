// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{w}from"/$bunfs/root/chunk-beptw75w.js";import{Jt,n}from"/$bunfs/root/chunk-fsx1dvsr.js";import{zle,$an,ZS,le,C,T,g,D}from"/$bunfs/root/chunk-mqace48v.js";import{B}from"/$bunfs/root/chunk-b5ctwkv7.js";import{e}from"/$bunfs/root/chunk-9av83rwa.js";import{S}from"/$bunfs/root/chunk-qr34qg3p.js";function K2(i){let u=w(2),{via:o}=i;if(o==="native"){let r;if(u[0]===S)r=e(n,{color:"success",children:"(Copied!)"}),u[0]=r;else r=u[0];return r}if(o===null){let r;if(u[1]===S)r=e(n,{dimColor:!0,children:e(B,{chord:"c",action:"copy",parens:!0})}),u[1]=r;else r=u[1];return r}return null}function Y2(i){let u=w(2),{via:o}=i;if(o==="tmux-buffer"){let r;if(u[0]===S)r=e(n,{dimColor:!0,children:"(Copied to tmux buffer \xB7 select the URL manually if paste fails)"}),u[0]=r;else r=u[0];return r}if(o==="osc52"){let r;if(u[1]===S)r=e(n,{dimColor:!0,children:"(Sent via OSC 52 \xB7 select the URL manually if paste fails)"}),u[1]=r;else r=u[1];return r}return null}D();var P=2000,R=2000;function XQ(i){let o=Jt(),[u,r]=g(null),t=T(null),c=T(null),l=T(null),a=T(0),s=T(!0),p=le(()=>{a.current+=1,l.current?.(),l.current=null,c.current=null,t.current?.(),t.current=null,r(null)},[]);C(()=>{if(p(),i!==null)$an()},[i,p]),C(()=>(s.current=!0,()=>{s.current=!1,l.current?.(),l.current=null,c.current=null,t.current?.(),t.current=null}),[]);let y=le((d)=>{if(c.current===d)return;c.current=d,l.current?.(),l.current=o.setTimeout(()=>{l.current=null,c.current=null},P);let f=zle(),h=a.current;ZS(d).then((m)=>{if(!s.current||h!==a.current)return;if(m)process.stdout.write(m);if(t.current?.(),t.current=null,r(f),f==="native")t.current=o.setTimeout(()=>{t.current=null,r(null)},R)})},[o]);return{copiedVia:u,copy:y,reset:p}}
export{K2,Y2,XQ};
