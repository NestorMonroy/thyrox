// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{ys}from"/$bunfs/root/chunk-68jr61g3.js";import{Dl,zx,Bet,mD}from"/$bunfs/root/chunk-6v57qk09.js";import{S}from"/$bunfs/root/chunk-6vt364z5.js";import{e}from"/$bunfs/root/chunk-kd9k0apc.js";import{Me,afe,L}from"/$bunfs/root/chunk-s59wj17y.js";L();function CX(U){let d=S(13),{children:u,mouseTracking:P,surface:c}=U,m=P===void 0?"full":P,b=Me(zx),t=Me(mD),r=Me(Bet),R,x;if(d[0]!==r||d[1]!==c||d[2]!==t)R=()=>{if(!t||!c){return}return t(r.set("surface",c)),()=>{t(r.reset("surface"))}},x=[t,r,c],d[0]=r,d[1]=c,d[2]=t,d[3]=R,d[4]=x;else R=d[3],x=d[4];afe(R,x);let g,k;if(d[5]!==r||d[6]!==m||d[7]!==t)g=()=>{let n=ys().get(process.stdout);if(!t){return}return t(r.set("altScreen")+r.set("mouse",m)+(n?.nativeCursorSeq??"")),n?.setAltScreenActive(!0,m),()=>{n?.setAltScreenActive(!1),n?.clearTextSelection();let F=r.reset("mouse");let q=r.reset("altScreen");let C=q!==""&&!n?.hasUnmounted;let G=C?r.reassert("extendedKeys"):"";let H=C?n?.nativeCursorSeq??"":"";t(F+q+G+H)}},k=[t,r,m],d[5]=r,d[6]=m,d[7]=t,d[8]=g,d[9]=k;else g=d[8],k=d[9];afe(g,k);const h=b?.rows??24;let D;if(d[10]!==u||d[11]!==h)D=e(Dl,{flexDirection:"column",height:h,width:"100%",flexShrink:0,children:u}),d[10]=u,d[11]=h,d[12]=D;else D=d[12];return D}
export{CX};
