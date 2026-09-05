// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{dR}from"/$bunfs/root/chunk-h8z84shc.js";import{pt,cL}from"/$bunfs/root/chunk-0y8vm6va.js";import{So}from"/$bunfs/root/chunk-1hjsy6d2.js";import{Zy}from"/$bunfs/root/chunk-g162cr20.js";import{U,K,d,j}from"/$bunfs/root/chunk-w71cs9yg.js";j();function Pi(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i),a=K(()=>({"app:interrupt":n,"app:exit":t}),[n,t]);return pt(a,{context:"Global",isActive:e}),o}function Stn(i,r,e=!0){let{handleInterrupt:n,handleExit:t,exitState:o}=c(r,i);return{entries:K(()=>e?[{action:"app:interrupt",run:n},{action:"app:exit",run:t}]:[],[e,n,t]),exitState:o}}function c(i,r){let{exit:e}=dR(),[n,t]=d({pending:!1,keyName:null}),o=K(()=>r??e,[r,e]),a=Zy(),l=So("app:interrupt","Global","Ctrl-C"),p=So("app:exit","Global","Ctrl-D"),m=a&&l?l:"Ctrl-C",y=a&&p?p:"Ctrl-D",u=cL((s)=>t({pending:s,keyName:m}),o),x=cL((s)=>t({pending:s,keyName:y}),o),b=U(()=>{if(i?.())return;u()},[u,i]),C=U(()=>{x()},[x]);return{handleInterrupt:b,handleExit:C,exitState:n}}
export{Pi,Stn};
