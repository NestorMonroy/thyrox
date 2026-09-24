// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{tn}from"/$bunfs/root/chunk-nqsdwfmt.js";import{w}from"/$bunfs/root/chunk-q93sw3mb.js";import{_t}from"/$bunfs/root/chunk-5wq5hbjb.js";import{vu}from"/$bunfs/root/chunk-a22am1vw.js";import{s,n}from"/$bunfs/root/chunk-b8sc2vbx.js";import{ve}from"/$bunfs/root/chunk-hncbthj7.js";import{Le}from"/$bunfs/root/chunk-f68tdm3t.js";import{fv,lX}from"/$bunfs/root/chunk-x2vjece2.js";import{e,r}from"/$bunfs/root/chunk-srmsc891.js";import{Lt}from"/$bunfs/root/chunk-9hfc9ag5.js";import{_}from"/$bunfs/root/chunk-0dapr5gw.js";var x=5,F=5;function The(b){let t=w(27),{output:m,fullOutput:p,elapsedTimeSeconds:i,totalLines:l,totalBytes:u,timeoutMs:o,verbose:a}=b,{columns:c}=ve(),I;if(t[0]!==c||t[1]!==m||t[2]!==a)I=a?null:C(m,c),t[0]=c,t[1]=m,t[2]=a,t[3]=I;else I=t[3];let g=I,z;if(t[4]!==p||t[5]!==g)z=g?g.text:_t(p.trim()),t[4]=p,t[5]=g,t[6]=z;else z=t[6];let y=z;if(!y){let d;if(t[7]===_)d=e(n,{dimColor:!0,children:"Running\u2026 "}),t[7]=d;else d=t[7];let f;if(t[8]!==i||t[9]!==o)f=e(Le,{children:r(fv,{children:[d,e(lX,{elapsedTimeSeconds:i,timeoutMs:o})]})}),t[8]=i,t[9]=o,t[10]=f;else f=t[10];return f}let W=g?x:tn(p,`
`)+1,A=(l?Math.max(0,l-W):0)+(g?.dropped??0),L="";if(u&&l)L=`~${l} lines`;else if(A>0)L=`+${A} lines`;let d;if(t[11]!==y)d=e(n,{dimColor:!0,children:y}),t[11]=y,t[12]=d;else d=t[12];let f;if(t[13]!==L)f=L?e(n,{dimColor:!0,children:L}):null,t[13]=L,t[14]=f;else f=t[14];let M;if(t[15]!==i||t[16]!==o)M=e(lX,{elapsedTimeSeconds:i,timeoutMs:o}),t[15]=i,t[16]=o,t[17]=M;else M=t[17];let B;if(t[18]!==u)B=u?e(n,{dimColor:!0,children:Lt(u)}):null,t[18]=u,t[19]=B;else B=t[19];let O;if(t[20]!==f||t[21]!==M||t[22]!==B)O=r(s,{flexDirection:"row",gap:1,children:[f,M,B]}),t[20]=f,t[21]=M,t[22]=B,t[23]=O;else O=t[23];let E;if(t[24]!==d||t[25]!==O)E=e(Le,{children:e(fv,{children:r(s,{flexDirection:"column",children:[d,O]})})}),t[24]=d,t[25]=O,t[26]=E;else E=t[26];return E}function w5n({output:b,fullOutput:m,totalLines:p},i){if(!m.trim())return!1;return(p??0)>x||C(b,i).clipped}function C(b,m){let p=Math.max(1,m-F),i=_t(b.trim()).replace(/\r\n?/g,`
`).split(`
`).filter((a)=>a),l=[],u=0,o=i.length;while(o>0&&u<x){let a=i[--o],c=vu(a,p,{hard:!0,trim:!1}).split(`
`),t=x-u;if(c.length>t)return l.unshift(c.slice(-t).join("").replace(/^ /,"")),{text:l.join(`
`),clipped:!0,dropped:o};l.unshift(a),u+=c.length}return{text:l.join(`
`),clipped:o>0,dropped:o}}
export{The,w5n};
