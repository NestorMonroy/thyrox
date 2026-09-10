// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{gn}from"/$bunfs/root/chunk-ras23w04.js";import{y}from"/$bunfs/root/chunk-szxazvwk.js";import{Af}from"/$bunfs/root/chunk-7y5wjz4e.js";import{Ht}from"/$bunfs/root/chunk-7xxnrgeg.js";import{o,n}from"/$bunfs/root/chunk-h8z84shc.js";import{He}from"/$bunfs/root/chunk-tgjjqfz6.js";import{xe}from"/$bunfs/root/chunk-tz86qz5x.js";import{W_,az}from"/$bunfs/root/chunk-8d5gh9xq.js";import{e,r}from"/$bunfs/root/chunk-g3erx2ps.js";import{Bt}from"/$bunfs/root/chunk-yex5z6jz.js";import{p}from"/$bunfs/root/chunk-qyvz15br.js";var M=5,W=5;function vee(ee){let i=y(27),{output:z,fullOutput:S,elapsedTimeSeconds:h,totalLines:j,totalBytes:P,timeoutMs:R,verbose:A}=ee,{columns:E}=He(),G;if(i[0]!==E||i[1]!==z||i[2]!==A)G=A?null:O(z,E),i[0]=E,i[1]=z,i[2]=A,i[3]=G;else G=i[3];let T=G,H;if(i[4]!==S||i[5]!==T)H=T?T.text:Ht(S.trim()),i[4]=S,i[5]=T,i[6]=H;else H=i[6];let k=H;if(!k){let a;if(i[7]===p)a=e(n,{dimColor:!0,children:"Running\u2026 "}),i[7]=a;else a=i[7];let g;if(i[8]!==h||i[9]!==R)g=e(xe,{children:r(W_,{children:[a,e(az,{elapsedTimeSeconds:h,timeoutMs:R})]})}),i[8]=h,i[9]=R,i[10]=g;else g=i[10];return g}let te=T?M:gn(S,`
`)+1,N=(j?Math.max(0,j-te):0)+(T?.dropped??0),w="";if(P&&j)w=`~${j} lines`;else if(N>0)w=`+${N} lines`;let a;if(i[11]!==k)a=e(n,{dimColor:!0,children:k}),i[11]=k,i[12]=a;else a=i[12];let g;if(i[13]!==w)g=w?e(n,{dimColor:!0,children:w}):null,i[13]=w,i[14]=g;else g=i[14];let D;if(i[15]!==h||i[16]!==R)D=e(az,{elapsedTimeSeconds:h,timeoutMs:R}),i[15]=h,i[16]=R,i[17]=D;else D=i[17];let I;if(i[18]!==P)I=P?e(n,{dimColor:!0,children:Bt(P)}):null,i[18]=P,i[19]=I;else I=i[19];let L;if(i[20]!==g||i[21]!==D||i[22]!==I)L=r(o,{flexDirection:"row",gap:1,children:[g,D,I]}),i[20]=g,i[21]=D,i[22]=I,i[23]=L;else L=i[23];let U;if(i[24]!==a||i[25]!==L)U=e(xe,{children:e(W_,{children:r(o,{flexDirection:"column",children:[a,L]})})}),i[24]=a,i[25]=L,i[26]=U;else U=i[26];return U}function ten({output:x,fullOutput:u,totalLines:c},t){if(!u.trim())return!1;return(c??0)>M||O(x,t).clipped}function O(x,u){let c=Math.max(1,u-W),t=Ht(x.trim()).replace(/\r\n?/g,`
`).split(`
`).filter((d)=>d),s=[],f=0,m=t.length;while(m>0&&f<M){let d=t[--m],l=Af(d,c,{hard:!0,trim:!1}).split(`
`),b=M-f;if(l.length>b)return s.unshift(l.slice(-b).join("").replace(/^ /,"")),{text:s.join(`
`),clipped:!0,dropped:m};s.unshift(d),f+=l.length}return{text:s.join(`
`),clipped:m>0,dropped:m}}
export{vee,ten};
