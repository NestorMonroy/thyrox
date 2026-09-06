// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{Hs}from"/$bunfs/root/chunk-aq0yyrpd.js";import{ga,BR,SWe,Bx}from"/$bunfs/root/chunk-gkqebe2m.js";import{y}from"/$bunfs/root/chunk-y1h9ee0c.js";import{e}from"/$bunfs/root/chunk-kwtapczy.js";import{De,ute,F}from"/$bunfs/root/chunk-1c6mq242.js";F();function F4(U){let a=y(13),{children:d,mouseTracking:M,background:n}=U,c=M===void 0?"full":M,j=De(BR),r=De(Bx),t=De(SWe),P,R;if(a[0]!==n||a[1]!==t||a[2]!==r)P=()=>{if(!r||!n){return}return r(t.set("background",n)),()=>{r(t.reset("background"))}},R=[r,t,n],a[0]=n,a[1]=t,a[2]=r,a[3]=P,a[4]=R;else P=a[3],R=a[4];ute(P,R);let g,k;if(a[5]!==t||a[6]!==c||a[7]!==r)g=()=>{let f=Hs().get(process.stdout);if(!r){return}return r(t.set("altScreen")+t.set("mouse",c)),f?.setAltScreenActive(!0,c),()=>{f?.setAltScreenActive(!1),f?.clearTextSelection();let q=t.reset("mouse");let x=t.reset("altScreen");let C=x&&!f?.hasUnmounted?t.reassert("extendedKeys"):"";r(q+x+C)}},k=[r,t,c],a[5]=t,a[6]=c,a[7]=r,a[8]=g,a[9]=k;else g=a[8],k=a[9];ute(g,k);const u=j?.rows??24;let v;if(a[10]!==d||a[11]!==u)v=e(ga,{flexDirection:"column",height:u,width:"100%",flexShrink:0,children:d}),a[10]=d,a[11]=u,a[12]=v;else v=a[12];return v}
export{F4};
