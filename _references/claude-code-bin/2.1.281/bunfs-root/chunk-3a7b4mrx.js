// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{S4}from"/$bunfs/root/chunk-5khn4tvf.js";import{w}from"/$bunfs/root/chunk-q93sw3mb.js";import{s,n,bt}from"/$bunfs/root/chunk-b8sc2vbx.js";import{Vl}from"/$bunfs/root/chunk-w7vg23vh.js";import{po}from"/$bunfs/root/chunk-fkps6jy5.js";import{e,r}from"/$bunfs/root/chunk-srmsc891.js";import{A,g,D}from"/$bunfs/root/chunk-av0brfrs.js";import{_}from"/$bunfs/root/chunk-0dapr5gw.js";D();function P(c,C){let p=c.match(b);if(!p){return e(n,{dimColor:!0,children:c},C)}let h=p[0];let I=p.index??0;let Y=c.slice(0,I);let q=c.slice(I+h.length);return r(n,{dimColor:!0,children:[Y,e(bt,{url:h,children:h}),q]},C)}var b=/https?:\/\/\S+/;function nFe(){let u=w(10),S;if(u[0]===_)S=S4.getInstance().getStatus(),u[0]=S;else S=u[0];let[t,T]=g(S),y,k;if(u[1]===_)y=()=>S4.getInstance().subscribe(T),k=[],u[1]=y,u[2]=k;else y=u[1],k=u[2];if(A(y,k),!t.isAuthenticating&&!t.error&&t.output.length===0){return null}if(!t.isAuthenticating&&!t.error){return null}let a;if(u[3]!==t.output)a=t.output.length>0&&e(s,{flexDirection:"column",children:t.output.slice(-5).map(P)}),u[3]=t.output,u[4]=a;else a=u[4];let l;if(u[5]!==t.error)l=t.error&&e(po,{error:t.error}),u[5]=t.error,u[6]=l;else l=u[6];let R;if(u[7]!==a||u[8]!==l)R=e(s,{marginY:1,children:r(Vl,{color:"permission",title:"Authentication",children:[a,l]})}),u[7]=a,u[8]=l,u[9]=R;else R=u[9];return R}
export{nFe};
