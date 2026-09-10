// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{cR}from"/$bunfs/root/chunk-tj5q8vxd.js";import{ft,pL}from"/$bunfs/root/chunk-9y11wjvq.js";import{go}from"/$bunfs/root/chunk-26q2tsna.js";import{Xy}from"/$bunfs/root/chunk-ab2jdyjd.js";import{U,V,d,j}from"/$bunfs/root/chunk-db688wrz.js";j();function Ri(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i),a=V(()=>({"app:interrupt":n,"app:exit":t}),[n,t]);return ft(a,{context:"Global",isActive:e}),o}function nln(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i);return{entries:V(()=>e?[{action:"app:interrupt",run:n},{action:"app:exit",run:t}]:[],[e,n,t]),exitState:o}}function c(i,r){let{exit:e}=cR(),[n,t]=d({pending:!1,keyName:null}),o=V(()=>r??e,[r,e]),a=Xy(),l=go("app:interrupt","Global","Ctrl-C"),p=go("app:exit","Global","Ctrl-D"),m=a&&l?l:"Ctrl-C",y=a&&p?p:"Ctrl-D",u=pL((s)=>t({pending:s,keyName:m}),o),x=pL((s)=>t({pending:s,keyName:y}),o),b=U(()=>{if(i?.())return;u()},[u,i]),C=U(()=>{x()},[x]);return{handleInterrupt:b,handleExit:C,exitState:n}}
export{Ri,nln};
