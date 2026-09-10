// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{bab as K,k$a as o}from"/$bunfs/root/_483.js";import{jcb as Y,kcb as B}from"/$bunfs/root/_493.js";import{mcb as n,ncb as _,ocb as T}from"/$bunfs/root/_494.js";import{b1b as H,c1b as v}from"/$bunfs/root/_624.js";import{Avd as a,dwd as q}from"/$bunfs/root/_832.js";import{xxd as j,zxd as d}from"/$bunfs/root/_837.js";function z(W){let R=Y(17),{ratio:k,width:c,fillColor:L,emptyColor:i,variant:A}=W,C=A===void 0?"block":A,u,h,P,y,b,M;if(R[0]!==i||R[1]!==L||R[2]!==k||R[3]!==C||R[4]!==c){M=d;bb0:{let S=I(k);if(C==="pill"){let{fill:Z,empty:w}=G();let V=Math.round(S*c);M=_(o,{children:[n(o,{color:L,children:a(Z,V)}),n(o,{color:i,dimColor:i===void 0,children:a(w,c-V)})]});break bb0}u=o;h=L;P=i;y=`${Math.round(S*100)}%`;b=E(S,c)}R[0]=i,R[1]=L,R[2]=k,R[3]=C,R[4]=c,R[5]=u,R[6]=h,R[7]=P,R[8]=y,R[9]=b,R[10]=M}else u=R[5],h=R[6],P=R[7],y=R[8],b=R[9],M=R[10];if(M!==d)return M;let X;if(R[11]!==u||R[12]!==h||R[13]!==P||R[14]!==y||R[15]!==b)X=n(u,{color:h,backgroundColor:P,"aria-label":y,children:b}),R[11]=u,R[12]=h,R[13]=P,R[14]=y,R[15]=b,R[16]=X;else X=R[16];return X}var p,N,O,G=()=>H.hasGeometricShapesInkBleedBug()?O:N,I=(s)=>Math.min(1,Math.max(0,s)),E=(s,t)=>{let e=Math.floor(s*t),r=[a(p.at(-1),e)];if(e<t){let f=s*t-e,m=Math.floor(f*(p.length-1));r.push(p[m]);let l=t-e-1;if(l>0)r.push(p[0].repeat(l))}return r.join("")};var D=j(()=>{v();K();q();T();B();p=[" ","\u258F","\u258E","\u258D","\u258C","\u258B","\u258A","\u2589","\u2588"],N={fill:"\u25B0",empty:"\u25B1"},O={fill:"\u2588",empty:"\u2591"}});
export{z as uC,D as vC};
