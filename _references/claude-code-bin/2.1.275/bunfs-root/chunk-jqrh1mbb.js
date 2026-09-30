// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{en}from"/$bunfs/root/chunk-4bbpt7sc.js";import{w}from"/$bunfs/root/chunk-cb4swk6a.js";import{wf}from"/$bunfs/root/chunk-qwxqekf7.js";import{_t}from"/$bunfs/root/chunk-75n2g1wh.js";import{s,n}from"/$bunfs/root/chunk-0hefd0r9.js";import{Ee}from"/$bunfs/root/chunk-7v7hydcr.js";import{Ie}from"/$bunfs/root/chunk-hdpv13yk.js";import{Bw,U6}from"/$bunfs/root/chunk-m46ff3tf.js";import{e,r}from"/$bunfs/root/chunk-4m6y8tt1.js";import{$t}from"/$bunfs/root/chunk-ym0yb6nw.js";import{y}from"/$bunfs/root/chunk-sr6jf0k1.js";var M=5,W=5;function sue(ee){let o=w(27),{output:z,fullOutput:S,elapsedTimeSeconds:b,totalLines:j,totalBytes:P,timeoutMs:h,verbose:A}=ee,{columns:E}=Ee(),G;if(o[0]!==E||o[1]!==z||o[2]!==A)G=A?null:O(z,E),o[0]=E,o[1]=z,o[2]=A,o[3]=G;else G=o[3];let R=G,H;if(o[4]!==S||o[5]!==R)H=R?R.text:_t(S.trim()),o[4]=S,o[5]=R,o[6]=H;else H=o[6];let k=H;if(!k){let d;if(o[7]===y)d=e(n,{dimColor:!0,children:"Running\u2026 "}),o[7]=d;else d=o[7];let a;if(o[8]!==b||o[9]!==h)a=e(Ie,{children:r(Bw,{children:[d,e(U6,{elapsedTimeSeconds:b,timeoutMs:h})]})}),o[8]=b,o[9]=h,o[10]=a;else a=o[10];return a}let te=R?M:en(S,`
`)+1,N=(j?Math.max(0,j-te):0)+(R?.dropped??0),T="";if(P&&j)T=`~${j} lines`;else if(N>0)T=`+${N} lines`;let d;if(o[11]!==k)d=e(n,{dimColor:!0,children:k}),o[11]=k,o[12]=d;else d=o[12];let a;if(o[13]!==T)a=T?e(n,{dimColor:!0,children:T}):null,o[13]=T,o[14]=a;else a=o[14];let D;if(o[15]!==b||o[16]!==h)D=e(U6,{elapsedTimeSeconds:b,timeoutMs:h}),o[15]=b,o[16]=h,o[17]=D;else D=o[17];let I;if(o[18]!==P)I=P?e(n,{dimColor:!0,children:$t(P)}):null,o[18]=P,o[19]=I;else I=o[19];let L;if(o[20]!==a||o[21]!==D||o[22]!==I)L=r(s,{flexDirection:"row",gap:1,children:[a,D,I]}),o[20]=a,o[21]=D,o[22]=I,o[23]=L;else L=o[23];let U;if(o[24]!==d||o[25]!==L)U=e(Ie,{children:e(Bw,{children:r(s,{flexDirection:"column",children:[d,L]})})}),o[24]=d,o[25]=L,o[26]=U;else U=o[26];return U}function RPn({output:g,fullOutput:m,totalLines:u},t){if(!m.trim())return!1;return(u??0)>M||O(g,t).clipped}function O(g,m){let u=Math.max(1,m-W),t=_t(g.trim()).replace(/\r\n?/g,`
`).split(`
`).filter((f)=>f),i=[],c=0,l=t.length;while(l>0&&c<M){let f=t[--l],p=wf(f,u,{hard:!0,trim:!1}).split(`
`),x=M-c;if(p.length>x)return i.unshift(p.slice(-x).join("").replace(/^ /,"")),{text:i.join(`
`),clipped:!0,dropped:l};i.unshift(f),c+=p.length}return{text:i.join(`
`),clipped:l>0,dropped:l}}
export{sue,RPn};
