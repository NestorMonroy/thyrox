// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{y}from"/$bunfs/root/chunk-szxazvwk.js";import{s}from"/$bunfs/root/chunk-9f9fskgc.js";import{o,n,dR}from"/$bunfs/root/chunk-h8z84shc.js";import{We}from"/$bunfs/root/chunk-0y8vm6va.js";import{jn}from"/$bunfs/root/chunk-pg32k5cc.js";import{e,r}from"/$bunfs/root/chunk-g3erx2ps.js";import{d,j}from"/$bunfs/root/chunk-w71cs9yg.js";import{p}from"/$bunfs/root/chunk-qyvz15br.js";j();function RWe(k){let t=y(17),{Wizard:u,cancelledEvent:v,onDone:C}=k,g=dR(),x=jn(),[a,A]=d(null),E;if(t[0]!==g||t[1]!==x)E=()=>{g.exit();let{proactivityLevel:B,toolPermissionContext:q}=x.getState();import("/$bunfs/root/chunk-kc2am1ga.js").then((F)=>F.execRelaunch({proactivity:{proactivityLevel:B,toolPermissionContext:q}}))},t[0]=g,t[1]=x,t[2]=E;else E=t[2];const P=a!==null;let J;if(t[3]!==P)J={context:"Confirmation",isActive:P},t[3]=P,t[4]=J;else J=t[4];if(We("confirm:yes",E,J),a!==null){let i;if(t[5]!==a)i=e(n,{color:"success",children:a}),t[5]=a,t[6]=i;else i=t[6];let c;if(t[7]===p)c=r(n,{dimColor:!0,children:["Press ",e(n,{bold:!0,children:"Enter"})," to restart Claude Code."]}),t[7]=c;else c=t[7];let l;if(t[8]!==i)l=r(o,{flexDirection:"column",gap:1,marginTop:1,children:[i,c]}),t[8]=i,t[9]=l;else l=t[9];return l}let i;if(t[10]===p)i=(G)=>A(G),t[10]=i;else i=t[10];let c;if(t[11]!==v||t[12]!==C)c=()=>{s(v,{}),C()},t[11]=v,t[12]=C,t[13]=c;else c=t[13];let l;if(t[14]!==u||t[15]!==c)l=e(u,{onComplete:i,onCancel:c}),t[14]=u,t[15]=c,t[16]=l;else l=t[16];return l}
export{RWe};
