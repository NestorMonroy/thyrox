// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{S}from"/$bunfs/root/chunk-6vt364z5.js";import{ve}from"/$bunfs/root/chunk-0wavkbxr.js";import{ke}from"/$bunfs/root/chunk-27bj2wbx.js";import{n}from"/$bunfs/root/chunk-x41kazpn.js";import{On}from"/$bunfs/root/chunk-ydfjxbj9.js";import{he}from"/$bunfs/root/chunk-ps7d1vbp.js";import{e,r}from"/$bunfs/root/chunk-kd9k0apc.js";import{y}from"/$bunfs/root/chunk-3z5w4bh8.js";function L3t(x){let t=S(17),{customApiKeyTruncated:a,onDone:c}=x,{storageV5:d}=ve(),v;if(t[0]!==a||t[1]!==c||t[2]!==d)v=function o(T){bb2:switch(T){case"yes":{ke((A)=>({...A,customApiKeyResponses:{...A.customApiKeyResponses,approved:[...A.customApiKeyResponses?.approved??[],a]}}),d),c(!0);break bb2}case"no":{ke((R)=>({...R,customApiKeyResponses:{...R.customApiKeyResponses,rejected:[...R.customApiKeyResponses?.rejected??[],a]}}),d),c(!1)}}},t[0]=a,t[1]=c,t[2]=d,t[3]=v;else v=t[3];let o=v,m;if(t[4]!==o)m=()=>o("no"),t[4]=o,t[5]=m;else m=t[5];let b;if(t[6]===y)b=e(n,{bold:!0,children:"ANTHROPIC_API_KEY"}),t[6]=b;else b=t[6];let f;if(t[7]!==a)f=r(n,{children:[b,r(n,{children:[": sk-ant-...",a]})]}),t[7]=a,t[8]=f;else f=t[8];let P;if(t[9]===y)P=e(n,{children:"Do you want to use this API key?"}),t[9]=P;else P=t[9];let I;if(t[10]===y)I=r(n,{children:["No (",e(n,{bold:!0,children:"recommended"}),")"]}),t[10]=I;else I=t[10];let l;if(t[11]!==o)l=e(On,{hideIndexes:!0,focus:"cancel",cancelLabel:I,onConfirm:()=>o("yes"),onCancel:()=>o("no")}),t[11]=o,t[12]=l;else l=t[12];let K;if(t[13]!==m||t[14]!==f||t[15]!==l)K=r(he,{title:"Detected a custom API key in your environment",color:"warning",onCancel:m,children:[f,P,l]}),t[13]=m,t[14]=f,t[15]=l,t[16]=K;else K=t[16];return K}
export{L3t};
