// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{NB as v,OB as O}from"/$bunfs/root/_259.js";import{w8a as u,x8a as L}from"/$bunfs/root/_478.js";import{bab as H,k$a as o}from"/$bunfs/root/_483.js";import{fcb as A,gcb as E}from"/$bunfs/root/_492.js";import{jcb as I,kcb as C}from"/$bunfs/root/_493.js";import{mcb as e,ncb as s,ocb as g}from"/$bunfs/root/_494.js";import{Lvc as x,luc as a}from"/$bunfs/root/_668.js";import{yxd as c}from"/$bunfs/root/_837.js";H();E();x();O();L();g();C();function T(J){let p=I(17),{customApiKeyTruncated:i,onDone:y}=J,{storageV5:d}=A(),D;if(p[0]!==i||p[1]!==y||p[2]!==d)D=function t(M){bb2:switch(M){case"yes":{a((k)=>({...k,customApiKeyResponses:{...k.customApiKeyResponses,approved:[...k.customApiKeyResponses?.approved??[],i]}}),d),y(!0);break bb2}case"no":{a((b)=>({...b,customApiKeyResponses:{...b.customApiKeyResponses,rejected:[...b.customApiKeyResponses?.rejected??[],i]}}),d),y(!1)}}},p[0]=i,p[1]=y,p[2]=d,p[3]=D;else D=p[3];let t=D,f;if(p[4]!==t)f=()=>t("no"),p[4]=t,p[5]=f;else f=p[5];let N;if(p[6]===c)N=e(o,{bold:!0,children:"ANTHROPIC_API_KEY"}),p[6]=N;else N=p[6];let R;if(p[7]!==i)R=s(o,{children:[N,s(o,{children:[": sk-ant-...",i]})]}),p[7]=i,p[8]=R;else R=p[8];let w;if(p[9]===c)w=e(o,{children:"Do you want to use this API key?"}),p[9]=w;else w=p[9];let _;if(p[10]===c)_=s(o,{children:["No (",e(o,{bold:!0,children:"recommended"}),")"]}),p[10]=_;else _=p[10];let l;if(p[11]!==t)l=e(v,{focus:"cancel",cancelLabel:_,onConfirm:()=>t("yes"),onCancel:()=>t("no")}),p[11]=t,p[12]=l;else l=p[12];let j;if(p[13]!==f||p[14]!==R||p[15]!==l)j=s(u,{title:"Detected a custom API key in your environment",color:"warning",onCancel:f,children:[R,w,l]}),p[13]=f,p[14]=R,p[15]=l,p[16]=j;else j=p[16];return j}
export{T as Xb};
