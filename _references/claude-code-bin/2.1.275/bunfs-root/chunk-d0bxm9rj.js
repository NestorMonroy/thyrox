// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{de}from"/$bunfs/root/chunk-gw27mnrz.js";import{WRt,vV}from"/$bunfs/root/chunk-j3mjr5mp.js";import{v5t}from"/$bunfs/root/chunk-eacfp97f.js";var a=new Map(Object.entries({keyword:de.blue,built_in:de.cyan,type:de.cyan.dim,literal:de.blue,number:de.green,regexp:de.red,string:de.red,subst:de.reset,symbol:de.reset,class:de.blue,function:de.yellow,title:de.reset,"title.function":de.yellow,"title.class":de.blue,params:de.reset,comment:de.green,doctag:de.green,meta:de.grey,"meta-keyword":de.reset,"meta-string":de.reset,"meta.keyword":de.reset,"meta.string":de.reset,section:de.reset,tag:de.grey,name:de.blue,attr:de.cyan,attribute:de.reset,variable:de.reset,bullet:de.reset,code:de.reset,emphasis:de.italic,strong:de.bold,link:de.underline,quote:de.reset,addition:de.green,deletion:de.red}));function u(e){let t=e.replace(/^hljs-/,"");for(;;){let r=a.get(t);if(r)return r;let n=t.lastIndexOf(".");if(n<0)return;t=t.slice(0,n)}}function c(e){let t=[],r=[];l(e,t,r);let n=v5t(r);if(n===r)return;t.forEach(({siblings:i,at:s},o)=>{i[s]=n[o]})}function l(e,t,r){e.children.forEach((n,i)=>{if(typeof n==="string")t.push({siblings:e.children,at:i}),r.push(n);else l(n,t,r)})}function g(e){if(typeof e==="string")return e;let t=e.children.map(g).join(""),r=e.scope??e.kind,n=r?u(r):void 0;return n?n(t):t}function m(e,t){let r=t?.language;if(!r)return e;try{let n=vV(r);if(!n)return e;let i=WRt().highlight(e,{language:n,ignoreIllegals:!0}),s=i._emitter??i.emitter,o=s?.rootNode??s?.root;if(!o||typeof o==="string")return e;return c(o),o.children.map(g).join("")}catch{return e}}function d(e){return vV(e)!==null}var p={highlight:m,supportsLanguage:d};function dH(){return p}
export{dH};
