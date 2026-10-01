// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{ib}from"/$bunfs/root/chunk-wzzj25ac.js";import{w}from"/$bunfs/root/chunk-776wf6tq.js";import{Xt}from"/$bunfs/root/chunk-aqx56v12.js";import{s,n,RG}from"/$bunfs/root/chunk-k0qnyh4a.js";import{Re,nn,DS,k,D}from"/$bunfs/root/chunk-bqbammwz.js";import{AU}from"/$bunfs/root/chunk-47fdh92k.js";import{e}from"/$bunfs/root/chunk-ne6sbmea.js";function fQ(i){let o=w(10),{elapsedTimeSeconds:r,timeoutMs:t}=i;if(r===void 0&&!t){return null}let l;if(o[0]!==t)l=t?Xt(t,{hideTrailingZeros:!0}):void 0,o[0]=t,o[1]=l;else l=o[1];let f=l;if(r===void 0){const m=`(timeout ${f})`;let u;if(o[2]!==m)u=e(n,{dimColor:!0,children:m}),o[2]=m,o[3]=u;else u=o[3];return u}const m=r*1000;let u;if(o[4]!==m)u=Xt(m),o[4]=m,o[5]=u;else u=o[5];let a=u;if(f){const c=`(${a} \xB7 timeout ${f})`;let d;if(o[6]!==c)d=e(n,{dimColor:!0,children:c}),o[6]=c,o[7]=d;else d=o[7];return d}const c=`(${a})`;let d;if(o[8]!==c)d=e(n,{dimColor:!0,children:c}),o[8]=c,o[9]=d;else d=o[9];return d}D();function M(){let i=Re(AU),[r,t,o,l]=RG(),f=l()??t.isVisible;return[r,f||i,o]}function gE({children:i}){let r=Re(ib),[t,o,l]=M(),f=k(i),[,m]=DS((d)=>d+1,0),u=!o;if(!u)f.current=i;let a=r?.columns,c=r?.rows;return nn(()=>{if(u&&l())m()},[a,c,u,l]),e(s,{ref:t,children:f.current})}function Moe(i){let[r,t]=M(),o=k(i);if(t)o.current=i;return[r,o.current]}
export{gE,Moe,fQ};
