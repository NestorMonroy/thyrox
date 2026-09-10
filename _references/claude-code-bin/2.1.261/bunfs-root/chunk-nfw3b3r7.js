// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{ie}from"/$bunfs/root/chunk-8xbkt625.js";import{kit,RU}from"/$bunfs/root/chunk-xjr081az.js";var l=new Map(Object.entries({keyword:ie.blue,built_in:ie.cyan,type:ie.cyan.dim,literal:ie.blue,number:ie.green,regexp:ie.red,string:ie.red,subst:ie.reset,symbol:ie.reset,class:ie.blue,function:ie.yellow,title:ie.reset,"title.function":ie.yellow,"title.class":ie.blue,params:ie.reset,comment:ie.green,doctag:ie.green,meta:ie.grey,"meta-keyword":ie.reset,"meta-string":ie.reset,"meta.keyword":ie.reset,"meta.string":ie.reset,section:ie.reset,tag:ie.grey,name:ie.blue,attr:ie.cyan,attribute:ie.reset,variable:ie.reset,bullet:ie.reset,code:ie.reset,emphasis:ie.italic,strong:ie.bold,link:ie.underline,quote:ie.reset,addition:ie.green,deletion:ie.red}));function a(e){let t=e.replace(/^hljs-/,"");for(;;){let r=l.get(t);if(r)return r;let n=t.lastIndexOf(".");if(n<0)return;t=t.slice(0,n)}}function g(e){if(typeof e==="string")return e;let t=e.children.map(g).join(""),r=e.scope??e.kind,n=r?a(r):void 0;return n?n(t):t}function u(e,t){let r=t?.language;if(!r)return e;try{let n=RU(r);if(!n)return e;let o=kit().highlight(e,{language:n,ignoreIllegals:!0}),s=o._emitter??o.emitter,i=s?.rootNode??s?.root;if(!i||typeof i==="string")return e;return i.children.map(g).join("")}catch{return e}}function c(e){return RU(e)!==null}var d={highlight:u,supportsLanguage:c};function qT(){return d}
export{qT};
