// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{ue}from"/$bunfs/root/chunk-5bxxc6dq.js";import{ZBt,i3}from"/$bunfs/root/chunk-j50wvkgy.js";import{yln}from"/$bunfs/root/chunk-nsnsjnjr.js";var a=new Map(Object.entries({keyword:ue.blue,built_in:ue.cyan,type:ue.cyan.dim,literal:ue.blue,number:ue.green,regexp:ue.red,string:ue.red,subst:ue.reset,symbol:ue.reset,class:ue.blue,function:ue.yellow,title:ue.reset,"title.function":ue.yellow,"title.class":ue.blue,params:ue.reset,comment:ue.green,doctag:ue.green,meta:ue.grey,"meta-keyword":ue.reset,"meta-string":ue.reset,"meta.keyword":ue.reset,"meta.string":ue.reset,section:ue.reset,tag:ue.grey,name:ue.blue,attr:ue.cyan,attribute:ue.reset,variable:ue.reset,bullet:ue.reset,code:ue.reset,emphasis:ue.italic,strong:ue.bold,link:ue.underline,quote:ue.reset,addition:ue.green,deletion:ue.red}));function u(e){let t=e.replace(/^hljs-/,"");for(;;){let r=a.get(t);if(r)return r;let n=t.lastIndexOf(".");if(n<0)return;t=t.slice(0,n)}}function c(e){let t=[],r=[];l(e,t,r);let n=yln(r);if(n===r)return;t.forEach(({siblings:i,at:s},o)=>{i[s]=n[o]})}function l(e,t,r){e.children.forEach((n,i)=>{if(typeof n==="string")t.push({siblings:e.children,at:i}),r.push(n);else l(n,t,r)})}function g(e){if(typeof e==="string")return e;let t=e.children.map(g).join(""),r=e.scope??e.kind,n=r?u(r):void 0;return n?n(t):t}function m(e,t){let r=t?.language;if(!r)return e;try{let n=i3(r);if(!n)return e;let i=ZBt().highlight(e,{language:n,ignoreIllegals:!0}),s=i._emitter??i.emitter,o=s?.rootNode??s?.root;if(!o||typeof o==="string")return e;return c(o),o.children.map(g).join("")}catch{return e}}function d(e){return i3(e)!==null}var p={highlight:m,supportsLanguage:d};function R0(){return p}
export{R0};
