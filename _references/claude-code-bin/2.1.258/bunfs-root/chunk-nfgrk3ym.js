// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{y}from"/$bunfs/root/chunk-m3sgv6yt.js";import{ye}from"/$bunfs/root/chunk-c2rt0e3z.js";import{He}from"/$bunfs/root/chunk-8qt7d28b.js";import{n}from"/$bunfs/root/chunk-tj5q8vxd.js";import{Tn}from"/$bunfs/root/chunk-wt3m157p.js";import{me}from"/$bunfs/root/chunk-nm89wggb.js";import{e,r}from"/$bunfs/root/chunk-pbthxwmf.js";import{p}from"/$bunfs/root/chunk-6zavqkd2.js";function JIt(T){let t=y(17),{customApiKeyTruncated:a,onDone:d}=T,{storageV5:m}=ye(),b;if(t[0]!==a||t[1]!==d||t[2]!==m)b=function o(E){bb2:switch(E){case"yes":{He((R)=>({...R,customApiKeyResponses:{...R.customApiKeyResponses,approved:[...R.customApiKeyResponses?.approved??[],a]}}),m),d(!0);break bb2}case"no":{He((g)=>({...g,customApiKeyResponses:{...g.customApiKeyResponses,rejected:[...g.customApiKeyResponses?.rejected??[],a]}}),m),d(!1)}}},t[0]=a,t[1]=d,t[2]=m,t[3]=b;else b=t[3];let o=b,f;if(t[4]!==o)f=()=>o("no"),t[4]=o,t[5]=f;else f=t[5];let P;if(t[6]===p)P=e(n,{bold:!0,children:"ANTHROPIC_API_KEY"}),t[6]=P;else P=t[6];let l;if(t[7]!==a)l=r(n,{children:[P,r(n,{children:[": sk-ant-...",a]})]}),t[7]=a,t[8]=l;else l=t[8];let I;if(t[9]===p)I=e(n,{children:"Do you want to use this API key?"}),t[9]=I;else I=t[9];let K;if(t[10]===p)K=r(n,{children:["No (",e(n,{bold:!0,children:"recommended"}),")"]}),t[10]=K;else K=t[10];let u;if(t[11]!==o)u=e(Tn,{hideIndexes:!0,focus:"cancel",cancelLabel:K,onConfirm:()=>o("yes"),onCancel:()=>o("no")}),t[11]=o,t[12]=u;else u=t[12];let k;if(t[13]!==f||t[14]!==l||t[15]!==u)k=r(me,{title:"Detected a custom API key in your environment",color:"warning",onCancel:f,children:[l,I,u]}),t[13]=f,t[14]=l,t[15]=u,t[16]=k;else k=t[16];return k}
export{JIt};
