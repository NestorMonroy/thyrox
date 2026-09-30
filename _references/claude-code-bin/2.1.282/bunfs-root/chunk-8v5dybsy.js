// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{ws}from"/$bunfs/root/chunk-vv47c4c8.js";import{Il,kw,oht,_1}from"/$bunfs/root/chunk-1mfrrmkr.js";import{w}from"/$bunfs/root/chunk-0a23e6xe.js";import{e}from"/$bunfs/root/chunk-rygnxyqy.js";import{Vt,Ie,Fwe,D}from"/$bunfs/root/chunk-cvh5tjew.js";D();D();var g1t=Vt(null);function zte(G){let u=w(16),{children:p,mouseTracking:x,surface:a}=G,c=x===void 0?"full":x,J=Ie(kw),t=Ie(_1),r=Ie(oht),v,F;if(u[0]!==r||u[1]!==a||u[2]!==t)v=()=>{if(!t||!a){return}let C=ws().get(process.stdout);let A=r.set("surface",a);if(!C?.keepForNextFrame(A))t(A);return()=>{let M=r.reset("surface");if(!C?.keepForNextFrame(M))t(M)}},F=[t,r,a],u[0]=r,u[1]=a,u[2]=t,u[3]=v,u[4]=F;else v=u[3],F=u[4];Fwe(v,F);let N,P;if(u[5]!==r||u[6]!==c||u[7]!==t)N=()=>{let n=ws().get(process.stdout);if(!t){return}let q=r.set("altScreen")+r.set("mouse",c)+(n?.nativeCursorSeq??"");if(!n?.keepForNextFrame(q))t(q);return n?.setAltScreenActive(!0,c),()=>{n?.setAltScreenActive(!1),n?.clearTextSelection();let L=r.reset("mouse");let z=r.reset("altScreen");let H=z!==""&&!n?.hasUnmounted;let O=H?r.reassert("extendedKeys"):"";let Q=H?n?.nativeCursorSeq??"":"";t(L+z+O+Q)}},P=[t,r,c],u[5]=r,u[6]=c,u[7]=t,u[8]=N,u[9]=P;else N=u[8],P=u[9];Fwe(N,P);const d=J?.rows??24,k=c==="full";let l;if(u[10]!==p||u[11]!==k)l=e(g1t,{value:k,children:p}),u[10]=p,u[11]=k,u[12]=l;else l=u[12];let W;if(u[13]!==d||u[14]!==l)W=e(Il,{flexDirection:"column",height:d,width:"100%",flexShrink:0,children:l}),u[13]=d,u[14]=l,u[15]=W;else W=u[15];return W}
export{g1t,zte};
