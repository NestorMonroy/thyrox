// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{y}from"/$bunfs/root/chunk-kvcekd78.js";import{ye}from"/$bunfs/root/chunk-66gr7x48.js";import{we}from"/$bunfs/root/chunk-hyqdn9c0.js";import{t}from"/$bunfs/root/chunk-fqnz5baq.js";import{En}from"/$bunfs/root/chunk-28k074ac.js";import{de}from"/$bunfs/root/chunk-zgvjnwh0.js";import{e,r}from"/$bunfs/root/chunk-gbn257vp.js";import{f}from"/$bunfs/root/chunk-934z9d80.js";function _xt(T){let n=y(17),{customApiKeyTruncated:a,onDone:c}=T,{storageV5:d}=ye(),b;if(n[0]!==a||n[1]!==c||n[2]!==d)b=function o(E){bb2:switch(E){case"yes":{we((R)=>({...R,customApiKeyResponses:{...R.customApiKeyResponses,approved:[...R.customApiKeyResponses?.approved??[],a]}}),d),c(!0);break bb2}case"no":{we((g)=>({...g,customApiKeyResponses:{...g.customApiKeyResponses,rejected:[...g.customApiKeyResponses?.rejected??[],a]}}),d),c(!1)}}},n[0]=a,n[1]=c,n[2]=d,n[3]=b;else b=n[3];let o=b,m;if(n[4]!==o)m=()=>o("no"),n[4]=o,n[5]=m;else m=n[5];let P;if(n[6]===f)P=e(t,{bold:!0,children:"ANTHROPIC_API_KEY"}),n[6]=P;else P=n[6];let l;if(n[7]!==a)l=r(t,{children:[P,r(t,{children:[": sk-ant-...",a]})]}),n[7]=a,n[8]=l;else l=n[8];let I;if(n[9]===f)I=e(t,{children:"Do you want to use this API key?"}),n[9]=I;else I=n[9];let K;if(n[10]===f)K=r(t,{children:["No (",e(t,{bold:!0,children:"recommended"}),")"]}),n[10]=K;else K=n[10];let u;if(n[11]!==o)u=e(En,{hideIndexes:!0,focus:"cancel",cancelLabel:K,onConfirm:()=>o("yes"),onCancel:()=>o("no")}),n[11]=o,n[12]=u;else u=n[12];let k;if(n[13]!==m||n[14]!==l||n[15]!==u)k=r(de,{title:"Detected a custom API key in your environment",color:"warning",onCancel:m,children:[l,I,u]}),n[13]=m,n[14]=l,n[15]=u,n[16]=k;else k=n[16];return k}
export{_xt};
