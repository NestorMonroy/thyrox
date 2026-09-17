// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{rn}from"/$bunfs/root/chunk-r2c9k9kh.js";import{S}from"/$bunfs/root/chunk-6vt364z5.js";import{gf}from"/$bunfs/root/chunk-hf9yhhhe.js";import{yt}from"/$bunfs/root/chunk-qk2a968b.js";import{s,n}from"/$bunfs/root/chunk-x41kazpn.js";import{Ee}from"/$bunfs/root/chunk-964y2ne1.js";import{xe}from"/$bunfs/root/chunk-44st6mqy.js";import{Aw,t6}from"/$bunfs/root/chunk-65n4yf6e.js";import{e,r}from"/$bunfs/root/chunk-kd9k0apc.js";import{Ft}from"/$bunfs/root/chunk-fw78ggy4.js";import{y}from"/$bunfs/root/chunk-3z5w4bh8.js";var w=5,W=5;function Zle(ee){let o=S(27),{output:z,fullOutput:P,elapsedTimeSeconds:b,totalLines:j,totalBytes:C,timeoutMs:h,verbose:A}=ee,{columns:E}=Ee(),G;if(o[0]!==E||o[1]!==z||o[2]!==A)G=A?null:O(z,E),o[0]=E,o[1]=z,o[2]=A,o[3]=G;else G=o[3];let R=G,H;if(o[4]!==P||o[5]!==R)H=R?R.text:yt(P.trim()),o[4]=P,o[5]=R,o[6]=H;else H=o[6];let k=H;if(!k){let d;if(o[7]===y)d=e(n,{dimColor:!0,children:"Running\u2026 "}),o[7]=d;else d=o[7];let a;if(o[8]!==b||o[9]!==h)a=e(xe,{children:r(Aw,{children:[d,e(t6,{elapsedTimeSeconds:b,timeoutMs:h})]})}),o[8]=b,o[9]=h,o[10]=a;else a=o[10];return a}let te=R?w:rn(P,`
`)+1,N=(j?Math.max(0,j-te):0)+(R?.dropped??0),T="";if(C&&j)T=`~${j} lines`;else if(N>0)T=`+${N} lines`;let d;if(o[11]!==k)d=e(n,{dimColor:!0,children:k}),o[11]=k,o[12]=d;else d=o[12];let a;if(o[13]!==T)a=T?e(n,{dimColor:!0,children:T}):null,o[13]=T,o[14]=a;else a=o[14];let D;if(o[15]!==b||o[16]!==h)D=e(t6,{elapsedTimeSeconds:b,timeoutMs:h}),o[15]=b,o[16]=h,o[17]=D;else D=o[17];let I;if(o[18]!==C)I=C?e(n,{dimColor:!0,children:Ft(C)}):null,o[18]=C,o[19]=I;else I=o[19];let L;if(o[20]!==a||o[21]!==D||o[22]!==I)L=r(s,{flexDirection:"row",gap:1,children:[a,D,I]}),o[20]=a,o[21]=D,o[22]=I,o[23]=L;else L=o[23];let U;if(o[24]!==d||o[25]!==L)U=e(xe,{children:e(Aw,{children:r(s,{flexDirection:"column",children:[d,L]})})}),o[24]=d,o[25]=L,o[26]=U;else U=o[26];return U}function pCn({output:g,fullOutput:m,totalLines:u},t){if(!m.trim())return!1;return(u??0)>w||O(g,t).clipped}function O(g,m){let u=Math.max(1,m-W),t=yt(g.trim()).replace(/\r\n?/g,`
`).split(`
`).filter((f)=>f),i=[],c=0,l=t.length;while(l>0&&c<w){let f=t[--l],p=gf(f,u,{hard:!0,trim:!1}).split(`
`),x=w-c;if(p.length>x)return i.unshift(p.slice(-x).join("").replace(/^ /,"")),{text:i.join(`
`),clipped:!0,dropped:l};i.unshift(f),c+=p.length}return{text:i.join(`
`),clipped:l>0,dropped:l}}
export{Zle,pCn};
