// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{w}from"/$bunfs/root/chunk-2bpvr3fa.js";import{s,n}from"/$bunfs/root/chunk-gjfhbdvy.js";import{De}from"/$bunfs/root/chunk-x24k3gbw.js";import{e,r}from"/$bunfs/root/chunk-fr6qx5c3.js";import{Bt}from"/$bunfs/root/chunk-rs4a40mr.js";function mkn(){return e(De,{height:1,children:e(n,{dimColor:!0,children:"Fetching\u2026"})})}function J7e(g){let u=w(7),{bytes:a,status:p}=g,m;if(u[0]!==a)m=Bt(a),u[0]=a,u[1]=m;else m=u[1];let t;if(u[2]!==m)t=e(n,{bold:!0,children:m}),u[2]=m,u[3]=t;else t=u[3];const o=p!==void 0&&` (${p})`;let c;if(u[4]!==t||u[5]!==o)c=e(De,{height:1,children:r(n,{children:["Received ",t,o]})}),u[4]=t,u[5]=o,u[6]=c;else c=u[6];return c}function l7r({bytes:g,code:a,codeText:p,result:u},m,{verbose:t}){let o=e(J7e,{bytes:g,status:`${a} ${p}`});if(t)return r(s,{flexDirection:"column",children:[o,e(s,{flexDirection:"column",children:e(n,{children:u})})]});return o}
export{mkn,J7e,l7r};
