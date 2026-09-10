// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{y}from"/$bunfs/root/chunk-wqpa7cjn.js";import{i}from"/$bunfs/root/chunk-74qghvre.js";import{o,n,UE}from"/$bunfs/root/chunk-5zps47bf.js";import{Ne}from"/$bunfs/root/chunk-x3fj7evb.js";import{er}from"/$bunfs/root/chunk-c6x7scb2.js";import{e,r}from"/$bunfs/root/chunk-zhg3ync1.js";import{d,L}from"/$bunfs/root/chunk-v21q572m.js";import{p}from"/$bunfs/root/chunk-7sg5wrey.js";L();function lqe(A){let t=y(17),{Wizard:u,cancelledEvent:v,onDone:C}=A,g=UE(),x=er(),[a,B]=d(null),J;if(t[0]!==g||t[1]!==x)J=()=>{g.exit();let{proactivityLevel:j,toolPermissionContext:q}=x.getState();import("/$bunfs/root/chunk-q94dcv5k.js").then((F)=>F.execRelaunch({proactivity:{proactivityLevel:j,toolPermissionContext:q}}))},t[0]=g,t[1]=x,t[2]=J;else J=t[2];const P=a!==null;let M;if(t[3]!==P)M={context:"Confirmation",isActive:P},t[3]=P,t[4]=M;else M=t[4];if(Ne("confirm:yes",J,M),a!==null){let s;if(t[5]!==a)s=e(n,{color:"success",children:a}),t[5]=a,t[6]=s;else s=t[6];let c;if(t[7]===p)c=r(n,{dimColor:!0,children:["Press ",e(n,{bold:!0,children:"Enter"})," to restart Claude Code."]}),t[7]=c;else c=t[7];let l;if(t[8]!==s)l=r(o,{flexDirection:"column",gap:1,marginTop:1,children:[s,c]}),t[8]=s,t[9]=l;else l=t[9];return l}let s;if(t[10]===p)s=(G)=>B(G),t[10]=s;else s=t[10];let c;if(t[11]!==v||t[12]!==C)c=()=>{i(v,{}),C()},t[11]=v,t[12]=C,t[13]=c;else c=t[13];let l;if(t[14]!==u||t[15]!==c)l=e(u,{onComplete:s,onCancel:c}),t[14]=u,t[15]=c,t[16]=l;else l=t[16];return l}
export{lqe};
