// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{H5}from"/$bunfs/root/chunk-t6pwageh.js";import{w}from"/$bunfs/root/chunk-z1q97ckh.js";import{s,n,bt}from"/$bunfs/root/chunk-mtq6m3s7.js";import{ic}from"/$bunfs/root/chunk-36z0c2km.js";import{Eo}from"/$bunfs/root/chunk-jh897rng.js";import{e,r}from"/$bunfs/root/chunk-s81ftaa6.js";import{C,g,L}from"/$bunfs/root/chunk-8fdrzdn0.js";import{S}from"/$bunfs/root/chunk-ghttqp33.js";L();function T(c,I){let p=c.match(b);if(!p){return e(n,{dimColor:!0,children:c},I)}let h=p[0];let B=p.index??0;let q=c.slice(0,B);let v=c.slice(B+h.length);return r(n,{dimColor:!0,children:[q,e(bt,{url:h,children:h}),v]},I)}var b=/https?:\/\/\S+/;function P1e(){let u=w(10),y;if(u[0]===S)y=H5.getInstance().getStatus(),u[0]=y;else y=u[0];let[t,Y]=g(y),A,k;if(u[1]===S)A=()=>H5.getInstance().subscribe(Y),k=[],u[1]=A,u[2]=k;else A=u[1],k=u[2];if(C(A,k),!t.isAuthenticating&&!t.error&&t.output.length===0){return null}if(!t.isAuthenticating&&!t.error){return null}let a;if(u[3]!==t.output)a=t.output.length>0&&e(s,{flexDirection:"column",children:t.output.slice(-5).map(T)}),u[3]=t.output,u[4]=a;else a=u[4];let l;if(u[5]!==t.error)l=t.error&&e(Eo,{error:t.error}),u[5]=t.error,u[6]=l;else l=u[6];let R;if(u[7]!==a||u[8]!==l)R=e(s,{marginY:1,children:r(ic,{color:"permission",title:"Authentication",children:[a,l]})}),u[7]=a,u[8]=l,u[9]=R;else R=u[9];return R}
export{P1e};
