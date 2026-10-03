// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Qt}from"/$bunfs/root/chunk-rg63yke9.js";import{w}from"/$bunfs/root/chunk-776wf6tq.js";import{aM}from"/$bunfs/root/chunk-thv2q2wm.js";import{s,n}from"/$bunfs/root/chunk-k0qnyh4a.js";import{xg}from"/$bunfs/root/chunk-pnctjgj7.js";import{Ne}from"/$bunfs/root/chunk-rnf9hmd3.js";import{e,r}from"/$bunfs/root/chunk-ne6sbmea.js";import{Mr}from"/$bunfs/root/chunk-jzeaw09v.js";var G7e=10;function bnr(t){if(typeof t==="string")return P(t,9);if(!Array.isArray(t))return!1;let o=0;for(let i of t){if(o+=1,o>10)return!0;if(!B(i))continue;let l=i.text,a=0;while(o<=10){if(a=l.indexOf(`
`,a),a===-1)break;a++,o++}if(o>10)return!0}return!1}function B(t){return typeof t==="object"&&t!==null&&"type"in t&&t.type==="text"&&"text"in t&&typeof t.text==="string"}function P(t,o){let i=0;for(let l=0;l<=o;l++){if(i=t.indexOf(`
`,i),i===-1)return!1;i++}return!0}function gWe(t){return t.replace(/<sandbox_violations>[\s\S]*?<\/sandbox_violations>/g,"")}var C=/^\s*<tool_use_error>([\s\S]*)<\/tool_use_error>\s*$/i,j=/<\/?tool_use_error\b/i;function D(t){let o=t.flatMap((i)=>{if(!B(i))return[];let l=aM(i.text),a=C.exec(l)?.[1];return[a!==void 0&&!j.test(a)?a:l]}).join(`
`);return o.trim()===""?void 0:o}function Gp(t){let p=w(28),{result:o,verbose:i,verbatim:l}=t,a=l===void 0?!1:l,x,E,L,g,b,A,y;if(p[0]!==o||p[1]!==a||p[2]!==i){let m;let T=Array.isArray(o);let f;if(p[10]!==T||p[11]!==o)f=typeof o==="string"?o:T?D(o):void 0,p[10]=T,p[11]=o,p[12]=f;else f=p[12];let O=f;let k=a||T;if(O===void 0)m="Tool execution failed";else{let R=(k?aM(O):gWe(aM(Mr(O,"tool_use_error")??O)).replace(/<\/?error>/g,"")).trim();if(!i&&!k&&R.startsWith("InputValidationError: "))m="Invalid tool parameters";else if(R.startsWith("Error: ")||R.startsWith("Cancelled: "))m=R;else m=`Error: ${R}`}g=Qt(m,`
`)+1-G7e;L=Ne;E=s;y="column";x=n;b="error";A=i?m:m.split(`
`).slice(0,G7e).join(`
`);p[0]=o,p[1]=a,p[2]=i,p[3]=x,p[4]=E,p[5]=L,p[6]=g,p[7]=b,p[8]=A,p[9]=y}else x=p[3],E=p[4],L=p[5],g=p[6],b=p[7],A=p[8],y=p[9];let f;if(p[13]!==x||p[14]!==b||p[15]!==A)f=e(x,{color:b,children:A}),p[13]=x,p[14]=b,p[15]=A,p[16]=f;else f=p[16];let v;if(p[17]!==g||p[18]!==i)v=!i&&e(xg,{count:g,expandable:!0}),p[17]=g,p[18]=i,p[19]=v;else v=p[19];let N;if(p[20]!==E||p[21]!==y||p[22]!==f||p[23]!==v)N=r(E,{flexDirection:y,children:[f,v]}),p[20]=E,p[21]=y,p[22]=f,p[23]=v,p[24]=N;else N=p[24];let M;if(p[25]!==L||p[26]!==N)M=e(L,{children:N}),p[25]=L,p[26]=N,p[27]=M;else M=p[27];return M}
export{G7e,bnr,gWe,Gp};
