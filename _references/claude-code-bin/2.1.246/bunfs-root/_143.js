// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{or as R}from"/$bunfs/root/_170.js";import{rw as v,tw as F}from"/$bunfs/root/_204.js";import{bab as O,h$a as w,k$a as m,v$a as x,w$a as N}from"/$bunfs/root/_483.js";import{jcb as L,kcb as T}from"/$bunfs/root/_493.js";import{mcb as o,ocb as D}from"/$bunfs/root/_494.js";import{OVb as M,PVb as q}from"/$bunfs/root/_609.js";import{vzc as g,yzc as A}from"/$bunfs/root/_683.js";import{Dvd as h,dwd as z}from"/$bunfs/root/_832.js";A();N();O();z();q();F();D();T();function E(l,s,r=!1){if(l.trim()==="")return"Details empty.";let e=l.split(`
`),n=Math.max(1,s-6),i=e.flatMap((t)=>R(t,n).lines.map((a)=>a.text));return[r?`Draft preview, ${e.length} ${h(e.length,"line")}:`:`${e.length} ${h(e.length,"line")}:`,...i.map((t)=>`> ${t}`),r?"End of preview. Review the full draft with /feedback.":"End of details."].join(`
`)}function B(l,s,r){let e=[],n=0;for(let i of l.split(`
`)){let t=R(i,Math.max(1,s)).lines;if(n+t.length<=r){e.push(i),n+=t.length;continue}let a=r-n;if(a>0){let f=t[a]?.startOffset;e.push(f===void 0?i:i.slice(0,f).trimEnd())}return e.push("\u2026"),e.join(`
`)}return l}function G(W){let X=L(8),{value:k,bold:d,dim:u,columns:c,maxRows:b,preview:y}=W,p=x(),S;if(X[0]!==d||X[1]!==c||X[2]!==u||X[3]!==p||X[4]!==b||X[5]!==y||X[6]!==k){let j=M(k);let C=b===void 0?j:B(j,Math.max(1,c-2),b);S=o(w,{borderStyle:p?void 0:"single",borderLeft:!0,borderTop:!1,borderBottom:!1,borderRight:!1,borderDimColor:!0,paddingLeft:p?0:1,flexDirection:"column",children:p?o(m,{bold:d,dimColor:u,wrap:"wrap",children:E(C,c,y)}):g.level===0?o(m,{bold:d,dimColor:u,wrap:"wrap",children:C}):o(v,{promptMode:!0,skipTokenCache:!0,children:C})});X[0]=d,X[1]=c,X[2]=u,X[3]=p,X[4]=b,X[5]=y,X[6]=k,X[7]=S}else S=X[7];return S}
export{G as ap};
