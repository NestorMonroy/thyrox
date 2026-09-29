// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Hs}from"/$bunfs/root/chunk-0dfxm50d.js";import{Kl,ib,CSt,uW}from"/$bunfs/root/chunk-qhpftar7.js";import{Qbt}from"/$bunfs/root/chunk-kp2b9300.js";import{w}from"/$bunfs/root/chunk-2bpvr3fa.js";import{e}from"/$bunfs/root/chunk-fr6qx5c3.js";import{Ce,sAe,L}from"/$bunfs/root/chunk-68gegf2j.js";L();function Aoe(G){let u=w(16),{children:d,mouseTracking:x,surface:c}=G,a=x===void 0?"full":x,J=Ce(ib),t=Ce(uW),r=Ce(CSt),v,F;if(u[0]!==r||u[1]!==c||u[2]!==t)v=()=>{if(!t||!c){return}let A=Hs().get(process.stdout);let D=r.set("surface",c);if(!A?.keepForNextFrame(D))t(D);return()=>{let M=r.reset("surface");if(!A?.keepForNextFrame(M))t(M)}},F=[t,r,c],u[0]=r,u[1]=c,u[2]=t,u[3]=v,u[4]=F;else v=u[3],F=u[4];sAe(v,F);let N,P;if(u[5]!==r||u[6]!==a||u[7]!==t)N=()=>{let n=Hs().get(process.stdout);if(!t){return}let C=r.set("altScreen")+r.set("mouse",a)+(n?.nativeCursorSeq??"");if(!n?.keepForNextFrame(C))t(C);return n?.setAltScreenActive(!0,a),()=>{let O=n?.setAltScreenActive(!1)??"";n?.clearTextSelection();let Q=r.reset("mouse");let b=r.reset("altScreen");let q=b!==""&&!n?.hasUnmounted;let V=q?r.reassert("extendedKeys"):"";let X=q?n?.nativeCursorSeq??"":"";t(O+Q+b+V+X)}},P=[t,r,a],u[5]=r,u[6]=a,u[7]=t,u[8]=N,u[9]=P;else N=u[8],P=u[9];sAe(N,P);const k=J?.rows??24,p=a==="full";let f;if(u[10]!==d||u[11]!==p)f=e(Qbt,{value:p,children:d}),u[10]=d,u[11]=p,u[12]=f;else f=u[12];let z;if(u[13]!==k||u[14]!==f)z=e(Kl,{flexDirection:"column",height:k,width:"100%",flexShrink:0,children:f}),u[13]=k,u[14]=f,u[15]=z;else z=u[15];return z}
export{Aoe};
