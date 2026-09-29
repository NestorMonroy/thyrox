// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{jt}from"/$bunfs/root/chunk-k6n2tyj0.js";import{w}from"/$bunfs/root/chunk-2bpvr3fa.js";import{Et}from"/$bunfs/root/chunk-3xxkkv4v.js";import{s,n}from"/$bunfs/root/chunk-gjfhbdvy.js";import{xg}from"/$bunfs/root/chunk-1ncqkxvy.js";import{De}from"/$bunfs/root/chunk-x24k3gbw.js";import{e,r}from"/$bunfs/root/chunk-fr6qx5c3.js";import{Mr}from"/$bunfs/root/chunk-80c80ykq.js";var Q7e=10;function Gnr(i){if(typeof i==="string")return T(i,9);if(!Array.isArray(i))return!1;let t=0;for(let o of i){if(t+=1,t>10)return!0;if(o.type!=="text")continue;let m=o.text,a=0;while(t<=10){if(a=m.indexOf(`
`,a),a===-1)break;a++,t++}if(t>10)return!0}return!1}function T(i,t){let o=0;for(let m=0;m<=t;m++){if(o=i.indexOf(`
`,o),o===-1)return!1;o++}return!0}function yWe(i){return i.replace(/<sandbox_violations>[\s\S]*?<\/sandbox_violations>/g,"")}function Xp(i){let p=w(25),{result:t,verbose:o,verbatim:m}=i,a=m===void 0?!1:m,E,b,d,_,x,g,L;if(p[0]!==t||p[1]!==a||p[2]!==o){let f;if(typeof t!=="string")f="Tool execution failed";else{let c=(a?Et(t):yWe(Et(Mr(t,"tool_use_error")??t)).replace(/<\/?error>/g,"")).trim();if(!o&&!a&&c.startsWith("InputValidationError: "))f="Invalid tool parameters";else if(c.startsWith("Error: ")||c.startsWith("Cancelled: "))f=c;else f=`Error: ${c}`}_=jt(f,`
`)+1-Q7e;d=De;b=s;L="column";E=n;x="error";g=o?f:f.split(`
`).slice(0,Q7e).join(`
`);p[0]=t,p[1]=a,p[2]=o,p[3]=E,p[4]=b,p[5]=d,p[6]=_,p[7]=x,p[8]=g,p[9]=L}else E=p[3],b=p[4],d=p[5],_=p[6],x=p[7],g=p[8],L=p[9];let v;if(p[10]!==E||p[11]!==x||p[12]!==g)v=e(E,{color:x,children:g}),p[10]=E,p[11]=x,p[12]=g,p[13]=v;else v=p[13];let A;if(p[14]!==_||p[15]!==o)A=!o&&e(xg,{count:_,expandable:!0}),p[14]=_,p[15]=o,p[16]=A;else A=p[16];let N;if(p[17]!==b||p[18]!==L||p[19]!==v||p[20]!==A)N=r(b,{flexDirection:L,children:[v,A]}),p[17]=b,p[18]=L,p[19]=v,p[20]=A,p[21]=N;else N=p[21];let D;if(p[22]!==d||p[23]!==N)D=e(d,{children:N}),p[22]=d,p[23]=N,p[24]=D;else D=p[24];return D}
export{Q7e,Gnr,yWe,Xp};
