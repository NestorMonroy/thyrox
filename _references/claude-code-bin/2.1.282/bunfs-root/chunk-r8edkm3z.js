// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{t5}from"/$bunfs/root/chunk-wbbthbh9.js";import{w}from"/$bunfs/root/chunk-0a23e6xe.js";import{s,n,bt}from"/$bunfs/root/chunk-29mppvsc.js";import{Kl}from"/$bunfs/root/chunk-50gf7keq.js";import{mo}from"/$bunfs/root/chunk-j8cnx6fp.js";import{e,r}from"/$bunfs/root/chunk-rygnxyqy.js";import{A,g,D}from"/$bunfs/root/chunk-cvh5tjew.js";import{b}from"/$bunfs/root/chunk-j14wpeqn.js";D();function T(c,I){let p=c.match(d);if(!p){return e(n,{dimColor:!0,children:c},I)}let h=p[0];let B=p.index??0;let q=c.slice(0,B);let v=c.slice(B+h.length);return r(n,{dimColor:!0,children:[q,e(bt,{url:h,children:h}),v]},I)}var d=/https?:\/\/\S+/;function CUe(){let u=w(10),y;if(u[0]===b)y=t5.getInstance().getStatus(),u[0]=y;else y=u[0];let[t,Y]=g(y),k,R;if(u[1]===b)k=()=>t5.getInstance().subscribe(Y),R=[],u[1]=k,u[2]=R;else k=u[1],R=u[2];if(A(k,R),!t.isAuthenticating&&!t.error&&t.output.length===0){return null}if(!t.isAuthenticating&&!t.error){return null}let a;if(u[3]!==t.output)a=t.output.length>0&&e(s,{flexDirection:"column",children:t.output.slice(-5).map(T)}),u[3]=t.output,u[4]=a;else a=u[4];let l;if(u[5]!==t.error)l=t.error&&e(mo,{error:t.error}),u[5]=t.error,u[6]=l;else l=u[6];let C;if(u[7]!==a||u[8]!==l)C=e(s,{marginY:1,children:r(Kl,{color:"permission",title:"Authentication",children:[a,l]})}),u[7]=a,u[8]=l,u[9]=C;else C=u[9];return C}
export{CUe};
