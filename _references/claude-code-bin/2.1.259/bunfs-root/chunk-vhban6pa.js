// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{y}from"/$bunfs/root/chunk-szxazvwk.js";import{dN}from"/$bunfs/root/chunk-x722nt0q.js";import{o,n,ht}from"/$bunfs/root/chunk-h8z84shc.js";import{Li}from"/$bunfs/root/chunk-mh64xv2r.js";import{qr}from"/$bunfs/root/chunk-qh3n16ma.js";import{e,r}from"/$bunfs/root/chunk-g3erx2ps.js";import{v,d,j}from"/$bunfs/root/chunk-w71cs9yg.js";import{p}from"/$bunfs/root/chunk-qyvz15br.js";j();function P(f,L){let b=f.match(S);if(!b){return e(n,{dimColor:!0,children:f},L)}let A=b[0];let N=b.index??0;let H=f.slice(0,N);let J=f.slice(N+A.length);return r(n,{dimColor:!0,children:[H,e(ht,{url:A,children:A}),J]},L)}var S=/https?:\/\/\S+/;function V_e(){let i=y(10),C;if(i[0]===p)C=dN.getInstance().getStatus(),i[0]=C;else C=i[0];let[t,G]=d(C),I,B;if(i[1]===p)I=()=>dN.getInstance().subscribe(G),B=[],i[1]=I,i[2]=B;else I=i[1],B=i[2];if(v(I,B),!t.isAuthenticating&&!t.error&&t.output.length===0){return null}if(!t.isAuthenticating&&!t.error){return null}let a;if(i[3]!==t.output)a=t.output.length>0&&e(o,{flexDirection:"column",children:t.output.slice(-5).map(P)}),i[3]=t.output,i[4]=a;else a=i[4];let l;if(i[5]!==t.error)l=t.error&&e(qr,{error:t.error}),i[5]=t.error,i[6]=l;else l=i[6];let D;if(i[7]!==a||i[8]!==l)D=e(o,{marginY:1,children:r(Li,{color:"permission",title:"Authentication",children:[a,l]})}),i[7]=a,i[8]=l,i[9]=D;else D=i[9];return D}
export{V_e};
