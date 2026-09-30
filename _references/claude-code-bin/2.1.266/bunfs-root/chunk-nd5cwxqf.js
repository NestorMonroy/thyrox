// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{UE}from"/$bunfs/root/chunk-5zps47bf.js";import{Qe}from"/$bunfs/root/chunk-x3fj7evb.js";import{Gr}from"/$bunfs/root/chunk-aak0gf59.js";import{AH}from"/$bunfs/root/chunk-a575crte.js";import{Kh}from"/$bunfs/root/chunk-wde0bk59.js";import{re,q,d,L}from"/$bunfs/root/chunk-v21q572m.js";L();function cs(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i),a=q(()=>({"app:interrupt":n,"app:exit":t}),[n,t]);return Qe(a,{context:"Global",isActive:e}),o}function Brn(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i);return{entries:q(()=>e?[{action:"app:interrupt",run:n},{action:"app:exit",run:t}]:[],[e,n,t]),exitState:o}}function c(i,r){let{exit:e}=UE(),[n,t]=d({pending:!1,keyName:null}),o=q(()=>r??e,[r,e]),a=Kh(),l=Gr("app:interrupt","Global","Ctrl-C"),p=Gr("app:exit","Global","Ctrl-D"),m=a&&l?l:"Ctrl-C",y=a&&p?p:"Ctrl-D",u=AH((s)=>t({pending:s,keyName:m}),o),x=AH((s)=>t({pending:s,keyName:y}),o),b=re(()=>{if(i?.())return;u()},[u,i]),C=re(()=>{x()},[x]);return{handleInterrupt:b,handleExit:C,exitState:n}}
export{cs,Brn};
