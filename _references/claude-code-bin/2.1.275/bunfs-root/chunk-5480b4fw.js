// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{w}from"/$bunfs/root/chunk-cb4swk6a.js";import{i}from"/$bunfs/root/chunk-bkjq2ptm.js";import{s,n,Qv}from"/$bunfs/root/chunk-0hefd0r9.js";import{Ue}from"/$bunfs/root/chunk-sjex7s6v.js";import{hr}from"/$bunfs/root/chunk-3m04gsj3.js";import{e,r}from"/$bunfs/root/chunk-4m6y8tt1.js";import{g,D}from"/$bunfs/root/chunk-347kpssc.js";import{y}from"/$bunfs/root/chunk-sr6jf0k1.js";D();function Met(k){let o=w(17),{Wizard:d,cancelledEvent:f,onDone:u}=k,v=Qv(),C=hr(),[a,A]=g(null),E;if(o[0]!==v||o[1]!==C)E=()=>{v.exit();let{proactivityLevel:B,toolPermissionContext:j}=C.getState();import("/$bunfs/root/chunk-00wjvvhc.js").then((q)=>q.execRelaunch({proactivity:{proactivityLevel:B,toolPermissionContext:j}}))},o[0]=v,o[1]=C,o[2]=E;else E=o[2];const x=a!==null;let J;if(o[3]!==x)J={context:"Confirmation",isActive:x},o[3]=x,o[4]=J;else J=o[4];if(Ue("confirm:yes",E,J),a!==null){let t;if(o[5]!==a)t=e(n,{color:"success",children:a}),o[5]=a,o[6]=t;else t=o[6];let c;if(o[7]===y)c=r(n,{dimColor:!0,children:["Press ",e(n,{bold:!0,children:"Enter"})," to restart Claude Code."]}),o[7]=c;else c=o[7];let l;if(o[8]!==t)l=r(s,{flexDirection:"column",gap:1,marginTop:1,children:[t,c]}),o[8]=t,o[9]=l;else l=o[9];return l}let t;if(o[10]===y)t=(F)=>A(F),o[10]=t;else t=o[10];let c;if(o[11]!==f||o[12]!==u)c=()=>{i(f,{}),u()},o[11]=f,o[12]=u,o[13]=c;else c=o[13];let l;if(o[14]!==d||o[15]!==c)l=e(d,{onComplete:t,onCancel:c}),o[14]=d,o[15]=c,o[16]=l;else l=o[16];return l}
export{Met};
