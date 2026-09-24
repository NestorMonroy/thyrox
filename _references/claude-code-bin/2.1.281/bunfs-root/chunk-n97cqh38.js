// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{w}from"/$bunfs/root/chunk-q93sw3mb.js";import{n,$t,kr}from"/$bunfs/root/chunk-b8sc2vbx.js";import{Al}from"/$bunfs/root/chunk-kgypcp0y.js";import{Umn,_i,De}from"/$bunfs/root/chunk-gwmysnkk.js";import{e}from"/$bunfs/root/chunk-srmsc891.js";import{g,D}from"/$bunfs/root/chunk-av0brfrs.js";D();var z=500;function bft(L=z){let r=Al();return kr(L,r)}function zn(L){let a=w(32),{onConfirm:r,onCancel:o,confirmLabel:y,cancelLabel:P,cancelFirst:V,focus:X,hideIndexes:Y,refuseInput:M,openedAt:F,windowMs:Z,armAfterMs:I}=L,s=y===void 0?"Yes":y,i=P===void 0?"No":P,v=V===void 0?!1:V,j=X===void 0?"confirm":X,x=Y===void 0?!1:Y,[N]=g(j),l=bft(I??null)||I===void 0;if($t()){const c=Z??I;let t;if(a[0]!==i||a[1]!==s||a[2]!==o||a[3]!==r||a[4]!==F||a[5]!==M||a[6]!==c)t=e(Umn,{confirmLabel:s,cancelLabel:i,onConfirm:r,onCancel:o,refuseInput:M,openedAt:F,windowMs:c}),a[0]=i,a[1]=s,a[2]=o,a[3]=r,a[4]=F,a[5]=M,a[6]=c,a[7]=t;else t=a[7];return t}let c;if(a[8]!==s||a[9]!==l)c=l?s:e(n,{dimColor:!0,children:s}),a[8]=s,a[9]=l,a[10]=c;else c=a[10];let t;if(a[11]!==c)t={label:c,value:"confirm"},a[11]=c,a[12]=t;else t=a[12];let m=t,f;if(a[13]!==i||a[14]!==l)f=l?i:e(n,{dimColor:!0,children:i}),a[13]=i,a[14]=l,a[15]=f;else f=a[15];let k;if(a[16]!==f)k={label:f,value:"cancel"},a[16]=f,a[17]=k;else k=a[17];let d=k,u;if(a[18]!==d||a[19]!==v||a[20]!==m)u=v?[d,m]:[m,d],a[18]=d,a[19]=v,a[20]=m,a[21]=u;else u=a[21];const E=!l;let b;if(a[22]!==o||a[23]!==r)b=(ee)=>ee==="confirm"?r():o(),a[22]=o,a[23]=r,a[24]=b;else b=a[24];let q;if(a[25]!==x||a[26]!==o||a[27]!==N||a[28]!==u||a[29]!==E||a[30]!==b)q=e(De,{options:u,selectedValue:_i,hideIndexes:x,isDisabled:E,defaultFocusValue:N,onChange:b,onCancel:o}),a[25]=x,a[26]=o,a[27]=N,a[28]=u,a[29]=E,a[30]=b,a[31]=q;else q=a[31];return q}
export{bft,zn};
