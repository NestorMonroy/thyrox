// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{d6}from"/$bunfs/root/chunk-swk3rjnt.js";import{w}from"/$bunfs/root/chunk-2bpvr3fa.js";import{s,n,vt}from"/$bunfs/root/chunk-gjfhbdvy.js";import{pc}from"/$bunfs/root/chunk-9wdrvj9f.js";import{Ao}from"/$bunfs/root/chunk-c8k2s3v7.js";import{e,r}from"/$bunfs/root/chunk-fr6qx5c3.js";import{C,g,L}from"/$bunfs/root/chunk-68gegf2j.js";import{S}from"/$bunfs/root/chunk-2dxhgqgt.js";L();function T(c,I){let p=c.match(b);if(!p){return e(n,{dimColor:!0,children:c},I)}let h=p[0];let B=p.index??0;let q=c.slice(0,B);let v=c.slice(B+h.length);return r(n,{dimColor:!0,children:[q,e(vt,{url:h,children:h}),v]},I)}var b=/https?:\/\/\S+/;function Yje(){let u=w(10),y;if(u[0]===S)y=d6.getInstance().getStatus(),u[0]=y;else y=u[0];let[t,Y]=g(y),A,k;if(u[1]===S)A=()=>d6.getInstance().subscribe(Y),k=[],u[1]=A,u[2]=k;else A=u[1],k=u[2];if(C(A,k),!t.isAuthenticating&&!t.error&&t.output.length===0){return null}if(!t.isAuthenticating&&!t.error){return null}let a;if(u[3]!==t.output)a=t.output.length>0&&e(s,{flexDirection:"column",children:t.output.slice(-5).map(T)}),u[3]=t.output,u[4]=a;else a=u[4];let l;if(u[5]!==t.error)l=t.error&&e(Ao,{error:t.error}),u[5]=t.error,u[6]=l;else l=u[6];let R;if(u[7]!==a||u[8]!==l)R=e(s,{marginY:1,children:r(pc,{color:"permission",title:"Authentication",children:[a,l]})}),u[7]=a,u[8]=l,u[9]=R;else R=u[9];return R}
export{Yje};
