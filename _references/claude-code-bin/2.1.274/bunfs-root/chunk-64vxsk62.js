// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{AT}from"/$bunfs/root/chunk-x41kazpn.js";import{st,uD}from"/$bunfs/root/chunk-n53nwbvq.js";import{ko}from"/$bunfs/root/chunk-t1acbf19.js";import{z_}from"/$bunfs/root/chunk-xfc6eada.js";import{re,X,m,L}from"/$bunfs/root/chunk-s59wj17y.js";L();function Ds(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i),a=X(()=>({"app:interrupt":n,"app:exit":t}),[n,t]);return st(a,{context:"Global",isActive:e}),o}function VRn(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i);return{entries:X(()=>e?[{action:"app:interrupt",run:n},{action:"app:exit",run:t}]:[],[e,n,t]),exitState:o}}function c(i,r){let{exit:e}=AT(),[n,t]=m({pending:!1,keyName:null}),o=X(()=>r??e,[r,e]),a=z_(),l=ko("app:interrupt","Global","Ctrl-C"),p=ko("app:exit","Global","Ctrl-D"),d=a&&l?l:"Ctrl-C",y=a&&p?p:"Ctrl-D",u=uD((s)=>t({pending:s,keyName:d}),o),x=uD((s)=>t({pending:s,keyName:y}),o),b=re(()=>{if(i?.())return;u()},[u,i]),C=re(()=>{x()},[x]);return{handleInterrupt:b,handleExit:C,exitState:n}}
export{Ds,VRn};
