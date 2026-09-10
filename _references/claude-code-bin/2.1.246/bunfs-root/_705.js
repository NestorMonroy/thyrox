// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{gIc as n,hIc as a,iIc as l,jIc as d,kIc as r,mIc as c,nIc as _}from"/$bunfs/root/_706.js";import{xxd as S}from"/$bunfs/root/_837.js";import{execFile as P}from"child_process";class R{promise=null;start(){if(this.promise)return;this.promise=p()}reset(){this.promise=null}}function i(t,e){return new Promise((s)=>{try{P(t,e,{encoding:"utf-8",timeout:d,windowsHide:!0},(o,u)=>{s({stdout:u??"",code:o?1:0})})}catch{s({stdout:"",code:1})}})}function p(){return(async()=>{if(c()){let[t,e]=await Promise.all([i(r,["query",n,"/v",l]),i(r,["query",a,"/v",l])]);return{plistStdouts:null,hklmStdout:t.code===0?t.stdout:null,hkcuStdout:e.code===0?e.stdout:null}}return{plistStdouts:null,hklmStdout:null,hkcuStdout:null}})()}function x(){m.start()}function g(){return m.promise}var m;var h=S(()=>{_();m=new R});
export{m as bIc,p as cIc,x as dIc,g as eIc,h as fIc};
