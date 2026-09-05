// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{ui}from"/$bunfs/root/chunk-xjg0359x.js";import{Ej,L9,mv,WKe,hSe,Ya,uR,gL}from"/$bunfs/root/chunk-65x0x96q.js";import{SF,PY}from"/$bunfs/root/chunk-7gz0y85z.js";import{y}from"/$bunfs/root/chunk-m3sgv6yt.js";import{e}from"/$bunfs/root/chunk-pbthxwmf.js";import{We,Fce,j}from"/$bunfs/root/chunk-db688wrz.js";j();function w4(D){let d=y(11),{children:m,mouseTracking:w,background:s}=D,n=w===void 0?"full":w,F=We(uR),t=We(gL),A,S;if(d[0]!==s||d[1]!==t)A=()=>{let p=ui().get(process.stdout);if(!t||!s){return}return t(WKe(s)),p?.setAltScreenBackground(s),()=>{if(p?!p.isAltScreenActive:!1){return}p?.setAltScreenBackground(void 0),t(hSe())}},S=[t,s],d[0]=s,d[1]=t,d[2]=A,d[3]=S;else A=d[2],S=d[3];Fce(A,S);let v,P;if(d[4]!==n||d[5]!==t)v=()=>{let f=ui().get(process.stdout);if(!t){return}return t(L9()+PY(n)),f?.setAltScreenActive(!0,n),()=>{let H=f?!f.isAltScreenActive:!1;if(f?.setAltScreenActive(!1),f?.clearTextSelection(),H){t(n!=="off"?SF:"");return}t((n!=="off"?SF:"")+mv()+(f?.hasUnmounted?"":Ej()))}},P=[t,n],d[4]=n,d[5]=t,d[6]=v,d[7]=P;else v=d[6],P=d[7];Fce(v,P);const a=F?.rows??24;let x;if(d[8]!==m||d[9]!==a)x=e(Ya,{flexDirection:"column",height:a,width:"100%",flexShrink:0,children:m}),d[8]=m,d[9]=a,d[10]=x;else x=d[10];return x}
export{w4};
