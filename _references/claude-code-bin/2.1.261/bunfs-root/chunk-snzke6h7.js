// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{be}from"/$bunfs/root/chunk-y183t579.js";import{o,t,ud,XZ,Pd}from"/$bunfs/root/chunk-fqnz5baq.js";import{y}from"/$bunfs/root/chunk-kvcekd78.js";import{e,r}from"/$bunfs/root/chunk-gbn257vp.js";import{Qt,De,dn,v,d,F}from"/$bunfs/root/chunk-gwyyj914.js";F();function N6(ee){let p=y(10),{children:M,lock:z}=ee,te=z===void 0?"always":z,[k,re]=XZ(),{isVisible:oe}=re,{rows:E}=be(),H=v(null),O=v(0),[ne,ie]=d(0),A;if(p[0]!==k)A=(ce)=>{k(ce)},p[0]=k,p[1]=A;else A=p[1];let S=A,fe=te==="always"||!oe,C;if(p[2]!==E)C=()=>{if(!H.current){return}let{height:I}=Pd(H.current);if(I>O.current)O.current=Math.min(I,E),ie(O.current)},p[2]=E,p[3]=C;else C=p[3];dn(C);const B=fe?ne:void 0;let R;if(p[4]!==M)R=e(o,{ref:H,flexDirection:"column",children:M}),p[4]=M,p[5]=R;else R=p[5];let J;if(p[6]!==S||p[7]!==B||p[8]!==R)J=e(o,{minHeight:B,ref:S,children:R}),p[6]=S,p[7]=B,p[8]=R,p[9]=J;else J=p[9];return J}F();F();function Re(he){let w=y(11),{children:h,height:g,screenReaderLabel:x}=he;if(De(i)){return h}const G=x===void 0;let N;if(w[0]!==x||w[1]!==G)N=e(ud,{fromLeftEdge:!0,flexShrink:0,children:r(t,{"aria-hidden":G,"aria-label":x,dimColor:!0,children:["  ","\u23BF \xA0"]})}),w[0]=x,w[1]=G,w[2]=N;else N=w[2];let P;if(w[3]!==h)P=e(o,{flexShrink:1,flexGrow:1,children:h}),w[3]=h,w[4]=P;else P=w[4];let K;if(w[5]!==g||w[6]!==N||w[7]!==P)K=e(D,{children:r(o,{flexDirection:"row",height:g,overflowY:"hidden",children:[N,P]})}),w[5]=g,w[6]=N,w[7]=P,w[8]=K;else K=w[8];let b=K;if(g!==void 0){return b}let Q;if(w[9]!==b)Q=e(N6,{lock:"offscreen",children:b}),w[9]=b,w[10]=Q;else Q=w[10];return Q}var i=Qt(!1);function C_e(){return De(i)}function D(ge){let xe=y(2),{children:L}=ge,U;if(xe[0]!==L)U=e(i.Provider,{value:!0,children:L}),xe[0]=L,xe[1]=U;else U=xe[1];return U}
export{N6,Re,C_e};
