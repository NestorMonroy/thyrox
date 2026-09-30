// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{xs}from"/$bunfs/root/chunk-zgt6j43h.js";import{Wl,Yw,E_t,Fj}from"/$bunfs/root/chunk-ydffmpsy.js";import{Kyt}from"/$bunfs/root/chunk-w9m96fzn.js";import{w}from"/$bunfs/root/chunk-z1q97ckh.js";import{e}from"/$bunfs/root/chunk-s81ftaa6.js";import{Ie,BEe,L}from"/$bunfs/root/chunk-8fdrzdn0.js";L();function Pre(b){let u=w(16),{children:p,mouseTracking:x,surface:m}=b,c=x===void 0?"full":x,G=Ie(Yw),t=Ie(Fj),r=Ie(E_t),v,F;if(u[0]!==r||u[1]!==m||u[2]!==t)v=()=>{if(!t||!m){return}let A=xs().get(process.stdout);let D=r.set("surface",m);if(!A?.keepForNextFrame(D))t(D);return()=>{let M=r.reset("surface");if(!A?.keepForNextFrame(M))t(M)}},F=[t,r,m],u[0]=r,u[1]=m,u[2]=t,u[3]=v,u[4]=F;else v=u[3],F=u[4];BEe(v,F);let N,P;if(u[5]!==r||u[6]!==c||u[7]!==t)N=()=>{let n=xs().get(process.stdout);if(!t){return}let C=r.set("altScreen")+r.set("mouse",c)+(n?.nativeCursorSeq??"");if(!n?.keepForNextFrame(C))t(C);return n?.setAltScreenActive(!0,c),()=>{n?.setAltScreenActive(!1),n?.clearTextSelection();let J=r.reset("mouse");let q=r.reset("altScreen");let z=q!==""&&!n?.hasUnmounted;let O=z?r.reassert("extendedKeys"):"";let Q=z?n?.nativeCursorSeq??"":"";t(J+q+O+Q)}},P=[t,r,c],u[5]=r,u[6]=c,u[7]=t,u[8]=N,u[9]=P;else N=u[8],P=u[9];BEe(N,P);const d=G?.rows??24,k=c==="full";let f;if(u[10]!==p||u[11]!==k)f=e(Kyt,{value:k,children:p}),u[10]=p,u[11]=k,u[12]=f;else f=u[12];let W;if(u[13]!==d||u[14]!==f)W=e(Wl,{flexDirection:"column",height:d,width:"100%",flexShrink:0,children:f}),u[13]=d,u[14]=f,u[15]=W;else W=u[15];return W}
export{Pre};
