// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{hs as a,is as M,ls as m,ms as O,qt as u,st as v}from"/$bunfs/root/_184.js";import{RQa as n,SQa as L}from"/$bunfs/root/_441.js";import{bab as R,h$a as s}from"/$bunfs/root/_483.js";import{jcb as S,kcb as P}from"/$bunfs/root/_493.js";import{mcb as e,ncb as i,ocb as y}from"/$bunfs/root/_494.js";import{wxd as x,xxd as T}from"/$bunfs/root/_837.js";var z={};x(z,{BashModeProgress:()=>b});function b(q){let c=S(8),{input:w,progress:t,verbose:r}=q;const d=`<bash-input>${w}</bash-input>`;let p;if(c[0]!==d)p=e(a,{addMargin:!1,param:{text:d,type:"text"}}),c[0]=d,c[1]=p;else p=c[1];let l;if(c[2]!==t||c[3]!==r)l=t?e(m,{fullOutput:t.fullOutput,output:t.output,elapsedTimeSeconds:t.elapsedTimeSeconds,totalLines:t.totalLines,verbose:r}):u(n,"renderToolUseProgressMessage")?.([],{verbose:r,tools:[],terminalSize:void 0}),c[2]=t,c[3]=r,c[4]=l;else l=c[4];let h;if(c[5]!==p||c[6]!==l)h=i(s,{flexDirection:"column",marginTop:1,children:[p,l]}),c[5]=p,c[6]=l,c[7]=h;else h=c[7];return h}var B=T(()=>{R();L();M();O();v();y();P()});
export{b as es,z as fs,B as gs};
