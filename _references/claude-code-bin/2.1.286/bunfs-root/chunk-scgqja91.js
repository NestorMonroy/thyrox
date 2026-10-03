// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{fe}from"/$bunfs/root/chunk-sg1zq61w.js";import{o5t,O8}from"/$bunfs/root/chunk-kb675ec3.js";import{wwn}from"/$bunfs/root/chunk-q49nggfc.js";var a=new Map(Object.entries({keyword:fe.blue,built_in:fe.cyan,type:fe.cyan.dim,literal:fe.blue,number:fe.green,regexp:fe.red,string:fe.red,subst:fe.reset,symbol:fe.reset,class:fe.blue,function:fe.yellow,title:fe.reset,"title.function":fe.yellow,"title.class":fe.blue,params:fe.reset,comment:fe.green,doctag:fe.green,meta:fe.grey,"meta-keyword":fe.reset,"meta-string":fe.reset,"meta.keyword":fe.reset,"meta.string":fe.reset,section:fe.reset,tag:fe.grey,name:fe.blue,attr:fe.cyan,attribute:fe.reset,variable:fe.reset,bullet:fe.reset,code:fe.reset,emphasis:fe.italic,strong:fe.bold,link:fe.underline,quote:fe.reset,addition:fe.green,deletion:fe.red}));function u(e){let t=e.replace(/^hljs-/,"");for(;;){let r=a.get(t);if(r)return r;let n=t.lastIndexOf(".");if(n<0)return;t=t.slice(0,n)}}function c(e){let t=[],r=[];l(e,t,r);let n=wwn(r);if(n===r)return;t.forEach(({siblings:i,at:s},o)=>{i[s]=n[o]})}function l(e,t,r){e.children.forEach((n,i)=>{if(typeof n==="string")t.push({siblings:e.children,at:i}),r.push(n);else l(n,t,r)})}function g(e){if(typeof e==="string")return e;let t=e.children.map(g).join(""),r=e.scope??e.kind,n=r?u(r):void 0;return n?n(t):t}function m(e,t){let r=t?.language;if(!r)return e;try{let n=O8(r);if(!n)return e;let i=o5t().highlight(e,{language:n,ignoreIllegals:!0}),s=i._emitter??i.emitter,o=s?.rootNode??s?.root;if(!o||typeof o==="string")return e;return c(o),o.children.map(g).join("")}catch{return e}}function d(e){return O8(e)!==null}var p={highlight:m,supportsLanguage:d};function ZD(){return p}
export{ZD};
