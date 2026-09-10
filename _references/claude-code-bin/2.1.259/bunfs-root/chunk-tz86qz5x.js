// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{He}from"/$bunfs/root/chunk-tgjjqfz6.js";import{o,n,Hd,jee,dh}from"/$bunfs/root/chunk-h8z84shc.js";import{y}from"/$bunfs/root/chunk-szxazvwk.js";import{e,r}from"/$bunfs/root/chunk-g3erx2ps.js";import{_n,U,ze,Mn,k,d,j}from"/$bunfs/root/chunk-w71cs9yg.js";j();function uY(te){let p=y(10),{children:D,lock:q}=te,re=q===void 0?"always":q,[M,oe]=jee(),{isVisible:ne}=oe,{rows:E}=He(),H=k(null),O=k(0),[ie,ce]=d(0),z;if(p[0]!==M)z=(fe)=>{M(fe)},p[0]=M,p[1]=z;else z=p[1];let S=z,ae=re==="always"||!ne,A;if(p[2]!==E)A=()=>{if(!H.current){return}let{height:F}=dh(H.current);if(F>O.current)O.current=Math.min(F,E),ce(O.current)},p[2]=E,p[3]=A;else A=p[3];Mn(A);const B=ae?ie:void 0;let R;if(p[4]!==D)R=e(o,{ref:H,flexDirection:"column",children:D}),p[4]=D,p[5]=R;else R=p[5];let I;if(p[6]!==S||p[7]!==B||p[8]!==R)I=e(o,{minHeight:B,ref:S,children:R}),p[6]=S,p[7]=B,p[8]=R,p[9]=I;else I=p[9];return I}j();j();function xe(he){let w=y(11),{children:h,height:g,screenReaderLabel:x}=he;if(ze(i)){return h}const C=x===void 0;let N;if(w[0]!==x||w[1]!==C)N=e(Hd,{fromLeftEdge:!0,flexShrink:0,children:r(n,{"aria-hidden":C,"aria-label":x,dimColor:!0,children:["  ","\u23BF \xA0"]})}),w[0]=x,w[1]=C,w[2]=N;else N=w[2];let b;if(w[3]!==h)b=e(o,{flexShrink:1,flexGrow:1,children:h}),w[3]=h,w[4]=b;else b=w[4];let J;if(w[5]!==g||w[6]!==N||w[7]!==b)J=e(v,{children:r(o,{flexDirection:"row",height:g,overflowY:"hidden",children:[N,b]})}),w[5]=g,w[6]=N,w[7]=b,w[8]=J;else J=w[8];let P=J;if(g!==void 0){return P}let K;if(w[9]!==P)K=e(uY,{lock:"offscreen",children:P}),w[9]=P,w[10]=K;else K=w[10];return K}var i=_n(!1);function K_e(){return ze(i)}function v(ge){let we=y(2),{children:G}=ge,Q;if(we[0]!==G)Q=e(i.Provider,{value:!0,children:G}),we[0]=G,we[1]=Q;else Q=we[1];return Q}
export{uY,xe,K_e};
