// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{nw as N,ow as D}from"/$bunfs/root/_203.js";import{pw as U,qw as z}from"/$bunfs/root/_204.js";import{LLa as K,MLa as M,NLa as b,_La as v}from"/$bunfs/root/_441.js";import{bab as q,k$a as l,p$a as F}from"/$bunfs/root/_483.js";import{jcb as T,kcb as C}from"/$bunfs/root/_493.js";import{mcb as i,ncb as y,ocb as B}from"/$bunfs/root/_494.js";import{xxd as h,zxd as x}from"/$bunfs/root/_837.js";function J(P){let{index:w}=P;return w!==-1}function H(P){let R=T(33),{children:o,color:r,bold:n}=P,k=U(),m,e,E,a,s,u;if(R[0]!==n||R[1]!==o||R[2]!==r||R[3]!==k){u=x;bb0:{let _;if(R[10]!==o)_=(t)=>{let{url:j,marker:G}=t;return{url:j,marker:G,index:o.indexOf(G)}},R[10]=o,R[11]=_;else _=R[11];e=S.map(_).find(J);if(!k||e===void 0){let t;if(R[12]!==n||R[13]!==o||R[14]!==r)t=i(N,{color:r,bold:n,children:o}),R[12]=n,R[13]=o,R[14]=r,R[15]=t;else t=R[15];u=t;break bb0}m=l;E=r;a=n;s=o.slice(0,e.index)}R[0]=n,R[1]=o,R[2]=r,R[3]=k,R[4]=m,R[5]=e,R[6]=E,R[7]=a,R[8]=s,R[9]=u}else m=R[4],e=R[5],E=R[6],a=R[7],s=R[8],u=R[9];if(u!==x)return u;let _;if(R[16]!==n||R[17]!==r)_=i(l,{color:r,bold:n,underline:!0,children:"learn more"}),R[16]=n,R[17]=r,R[18]=_;else _=R[18];let t;if(R[19]!==e.url||R[20]!==_)t=i(F,{url:e.url,children:_}),R[19]=e.url,R[20]=_,R[21]=t;else t=R[21];let c;if(R[22]!==o||R[23]!==e.index||R[24]!==e.marker.length)c=o.slice(e.index+e.marker.length),R[22]=o,R[23]=e.index,R[24]=e.marker.length,R[25]=c;else c=R[25];let I;if(R[26]!==m||R[27]!==E||R[28]!==a||R[29]!==s||R[30]!==t||R[31]!==c)I=y(m,{color:E,bold:a,children:[s,t,c]}),R[26]=m,R[27]=E,R[28]=a,R[29]=s,R[30]=t,R[31]=c,R[32]=I;else I=R[32];return I}var S;var Q=h(()=>{z();q();v();D();B();C();S=[M,b,K].map((L)=>({url:L,marker:`learn more: ${L}`}))});
export{H as jw,Q as kw};
