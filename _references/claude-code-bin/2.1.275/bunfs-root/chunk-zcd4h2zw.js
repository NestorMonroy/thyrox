// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{As}from"/$bunfs/root/chunk-tq3hyhj9.js";import{Wl,CI,Nnt,zU}from"/$bunfs/root/chunk-s09hj0q3.js";import{w}from"/$bunfs/root/chunk-cb4swk6a.js";import{e}from"/$bunfs/root/chunk-4m6y8tt1.js";import{De,bme,D}from"/$bunfs/root/chunk-347kpssc.js";D();function uJ(b){let d=w(13),{children:u,mouseTracking:P,surface:c}=b,m=P===void 0?"full":P,F=De(CI),t=De(zU),r=De(Nnt),R,x;if(d[0]!==r||d[1]!==c||d[2]!==t)R=()=>{if(!t||!c){return}return t(r.set("surface",c)),()=>{t(r.reset("surface"))}},x=[t,r,c],d[0]=r,d[1]=c,d[2]=t,d[3]=R,d[4]=x;else R=d[3],x=d[4];bme(R,x);let g,k;if(d[5]!==r||d[6]!==m||d[7]!==t)g=()=>{let n=As().get(process.stdout);if(!t){return}return t(r.set("altScreen")+r.set("mouse",m)+(n?.nativeCursorSeq??"")),n?.setAltScreenActive(!0,m),()=>{n?.setAltScreenActive(!1),n?.clearTextSelection();let G=r.reset("mouse");let q=r.reset("altScreen");let C=q!==""&&!n?.hasUnmounted;let H=C?r.reassert("extendedKeys"):"";let J=C?n?.nativeCursorSeq??"":"";t(G+q+H+J)}},k=[t,r,m],d[5]=r,d[6]=m,d[7]=t,d[8]=g,d[9]=k;else g=d[8],k=d[9];bme(g,k);const S=F?.rows??24;let T;if(d[10]!==u||d[11]!==S)T=e(Wl,{flexDirection:"column",height:S,width:"100%",flexShrink:0,children:u}),d[10]=u,d[11]=S,d[12]=T;else T=d[12];return T}
export{uJ};
