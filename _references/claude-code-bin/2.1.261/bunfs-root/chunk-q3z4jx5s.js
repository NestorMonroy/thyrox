// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{y}from"/$bunfs/root/chunk-kvcekd78.js";import{i}from"/$bunfs/root/chunk-838r2s0v.js";import{o,t,cE}from"/$bunfs/root/chunk-fqnz5baq.js";import{Oe}from"/$bunfs/root/chunk-fhtdy19s.js";import{Yn}from"/$bunfs/root/chunk-z0dggj7a.js";import{e,r}from"/$bunfs/root/chunk-gbn257vp.js";import{d,F}from"/$bunfs/root/chunk-gwyyj914.js";import{f}from"/$bunfs/root/chunk-934z9d80.js";F();function zGe(k){let n=y(17),{Wizard:u,cancelledEvent:v,onDone:C}=k,g=cE(),x=Yn(),[a,A]=d(null),E;if(n[0]!==g||n[1]!==x)E=()=>{g.exit();let{proactivityLevel:B,toolPermissionContext:j}=x.getState();import("/$bunfs/root/chunk-7qkc4hky.js").then((q)=>q.execRelaunch({proactivity:{proactivityLevel:B,toolPermissionContext:j}}))},n[0]=g,n[1]=x,n[2]=E;else E=n[2];const P=a!==null;let J;if(n[3]!==P)J={context:"Confirmation",isActive:P},n[3]=P,n[4]=J;else J=n[4];if(Oe("confirm:yes",E,J),a!==null){let s;if(n[5]!==a)s=e(t,{color:"success",children:a}),n[5]=a,n[6]=s;else s=n[6];let c;if(n[7]===f)c=r(t,{dimColor:!0,children:["Press ",e(t,{bold:!0,children:"Enter"})," to restart Claude Code."]}),n[7]=c;else c=n[7];let l;if(n[8]!==s)l=r(o,{flexDirection:"column",gap:1,marginTop:1,children:[s,c]}),n[8]=s,n[9]=l;else l=n[9];return l}let s;if(n[10]===f)s=(G)=>A(G),n[10]=s;else s=n[10];let c;if(n[11]!==v||n[12]!==C)c=()=>{i(v,{}),C()},n[11]=v,n[12]=C,n[13]=c;else c=n[13];let l;if(n[14]!==u||n[15]!==c)l=e(u,{onComplete:s,onCancel:c}),n[14]=u,n[15]=c,n[16]=l;else l=n[16];return l}
export{zGe};
