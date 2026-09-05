// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{yn}from"/$bunfs/root/chunk-ctshp37x.js";import{y}from"/$bunfs/root/chunk-m3sgv6yt.js";import{Ht}from"/$bunfs/root/chunk-6tm4k51s.js";import{o,n}from"/$bunfs/root/chunk-tj5q8vxd.js";import{xe}from"/$bunfs/root/chunk-2j9gsdzz.js";import{$_,MW}from"/$bunfs/root/chunk-jtt6mst7.js";import{e,r}from"/$bunfs/root/chunk-pbthxwmf.js";import{se}from"/$bunfs/root/chunk-z7cyba28.js";import{Bt}from"/$bunfs/root/chunk-m081zba5.js";import{p}from"/$bunfs/root/chunk-6zavqkd2.js";var i=5,X=5;function zZ(nt){let t=y(30),{output:U,fullOutput:T,elapsedTimeSeconds:c,totalLines:D,totalBytes:R,timeoutMs:d,verbose:M}=nt,J;if(t[0]!==T)J=Ht(T.trim()),t[0]=T,t[1]=J;else J=t[1];let j=J,q,K;if(t[2]!==U||t[3]!==j||t[4]!==M)q=z(U),K=M?j:q.slice(-i).join(`
`),t[2]=U,t[3]=j,t[4]=M,t[5]=q,t[6]=K;else q=t[5],K=t[6];let O=K;if(!O){let a;if(t[7]===p)a=e(n,{dimColor:!0,children:"Running\u2026 "}),t[7]=a;else a=t[7];let u;if(t[8]!==c||t[9]!==d)u=e(xe,{children:r($_,{children:[a,e(MW,{elapsedTimeSeconds:c,timeoutMs:d})]})}),t[8]=c,t[9]=d,t[10]=u;else u=t[10];return u}let et=M?yn(T,`
`)+1:i,Q=D?Math.max(0,D-et):0,g="";if(R&&D)g=`~${D} lines`;else if(Q>0)g=`+${Q} lines`;const a=M?void 0:Math.min(i,q.length);let u;if(t[11]!==O)u=e(n,{dimColor:!0,children:O}),t[11]=O,t[12]=u;else u=t[12];let P;if(t[13]!==a||t[14]!==u)P=e(o,{height:a,flexDirection:"column",overflow:"hidden",children:u}),t[13]=a,t[14]=u,t[15]=P;else P=t[15];let W;if(t[16]!==g)W=g?e(n,{dimColor:!0,children:g}):null,t[16]=g,t[17]=W;else W=t[17];let w;if(t[18]!==c||t[19]!==d)w=e(MW,{elapsedTimeSeconds:c,timeoutMs:d}),t[18]=c,t[19]=d,t[20]=w;else w=t[20];let F;if(t[21]!==R)F=R?e(n,{dimColor:!0,children:Bt(R)}):null,t[21]=R,t[22]=F;else F=t[22];let k;if(t[23]!==W||t[24]!==w||t[25]!==F)k=r(o,{flexDirection:"row",gap:1,children:[W,w,F]}),t[23]=W,t[24]=w,t[25]=F,t[26]=k;else k=t[26];let V;if(t[27]!==P||t[28]!==k)V=e(xe,{children:e($_,{children:r(o,{flexDirection:"column",children:[P,k]})})}),t[27]=P,t[28]=k,t[29]=V;else V=t[29];return V}function dQt({output:l,fullOutput:s,totalLines:h},m){if(!s.trim())return!1;if((h??0)>i)return!0;let f=m-X;return z(l).some((x)=>se(x)>f)}function z(l){return Ht(l.trim()).split(`
`).filter((s)=>s)}
export{zZ,dQt};
