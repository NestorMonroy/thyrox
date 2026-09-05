// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{XE as C,_E as q}from"/$bunfs/root/_296.js";import{L8a as v,O8a as j}from"/$bunfs/root/_481.js";import{F$a as u,bab as B,h$a as f,k$a as t}from"/$bunfs/root/_483.js";import{jcb as L,kcb as z}from"/$bunfs/root/_493.js";import{mcb as e,ncb as i,ocb as D}from"/$bunfs/root/_494.js";import{vSb as d,ySb as A}from"/$bunfs/root/_593.js";import{Pcd as m,Rcd as k}from"/$bunfs/root/_814.js";import{Axd as b,yxd as p}from"/$bunfs/root/_837.js";A();B();j();k();q();D();z();function F(V){let o=L(17),{Wizard:g,cancelledEvent:x,onDone:y}=V,P=u(),R=C(),[s,Y]=d(null),T;if(o[0]!==P||o[1]!==R)T=()=>{P.exit();let{proactivityLevel:Z,toolPermissionContext:w}=R.getState();import("/$bunfs/root/chunk-nftw6tnz.js").then((oo)=>oo.execRelaunch({proactivity:{proactivityLevel:Z,toolPermissionContext:w}}))},o[0]=P,o[1]=R,o[2]=T;else T=o[2];const _=s!==null;let X;if(o[3]!==_)X={context:"Confirmation",isActive:_},o[3]=_,o[4]=X;else X=o[4];if(v("confirm:yes",T,X),s!==null){let n;if(o[5]!==s)n=e(t,{color:"success",children:s}),o[5]=s,o[6]=n;else n=o[6];let r;if(o[7]===p)r=i(t,{dimColor:!0,children:["Press ",e(t,{bold:!0,children:"Enter"})," to restart Claude Code."]}),o[7]=r;else r=o[7];let c;if(o[8]!==n)c=i(f,{flexDirection:"column",gap:1,marginTop:1,children:[n,r]}),o[8]=n,o[9]=c;else c=o[9];return c}let n;if(o[10]===p)n=(eo)=>Y(eo),o[10]=n;else n=o[10];let r;if(o[11]!==x||o[12]!==y)r=()=>{m(x,{}),y()},o[11]=x,o[12]=y,o[13]=r;else r=o[13];let c;if(o[14]!==g||o[15]!==r)c=e(g,{onComplete:n,onCancel:r}),o[14]=g,o[15]=r,o[16]=c;else c=o[16];return c}
export{F as Qh};
