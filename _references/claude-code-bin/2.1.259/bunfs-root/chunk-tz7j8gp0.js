// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{y}from"/$bunfs/root/chunk-szxazvwk.js";import{cn}from"/$bunfs/root/chunk-h8z84shc.js";import{ODt,Mi,Re}from"/$bunfs/root/chunk-rfjqgh1w.js";import{e}from"/$bunfs/root/chunk-g3erx2ps.js";import{d,j}from"/$bunfs/root/chunk-w71cs9yg.js";j();function In(Q){let t=y(25),{onConfirm:n,onCancel:o,confirmLabel:_,cancelLabel:D,cancelFirst:X,focus:Y,hideIndexes:k,refuseInput:w,openedAt:N,windowMs:v}=Q,r=_===void 0?"Yes":_,s=D===void 0?"No":D,C=X===void 0?!1:X,T=Y===void 0?"confirm":Y,A=k===void 0?!1:k,[E]=d(T);if(cn()){let c;if(t[0]!==s||t[1]!==r||t[2]!==o||t[3]!==n||t[4]!==N||t[5]!==w||t[6]!==v)c=e(ODt,{confirmLabel:r,cancelLabel:s,onConfirm:n,onCancel:o,refuseInput:w,openedAt:N,windowMs:v}),t[0]=s,t[1]=r,t[2]=o,t[3]=n,t[4]=N,t[5]=w,t[6]=v,t[7]=c;else c=t[7];return c}let c;if(t[8]!==r)c={label:r,value:"confirm"},t[8]=r,t[9]=c;else c=t[9];let i=c,q;if(t[10]!==s)q={label:s,value:"cancel"},t[10]=s,t[11]=q;else q=t[11];let l=q,f;if(t[12]!==l||t[13]!==C||t[14]!==i)f=C?[l,i]:[i,l],t[12]=l,t[13]=C,t[14]=i,t[15]=f;else f=t[15];let m;if(t[16]!==o||t[17]!==n)m=(U)=>U==="confirm"?n():o(),t[16]=o,t[17]=n,t[18]=m;else m=t[18];let z;if(t[19]!==A||t[20]!==o||t[21]!==E||t[22]!==f||t[23]!==m)z=e(Re,{options:f,selectedValue:Mi,hideIndexes:A,defaultFocusValue:E,onChange:m,onCancel:o}),t[19]=A,t[20]=o,t[21]=E,t[22]=f,t[23]=m,t[24]=z;else z=t[24];return z}
export{In};
