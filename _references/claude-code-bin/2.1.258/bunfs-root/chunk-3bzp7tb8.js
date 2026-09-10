// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{ae}from"/$bunfs/root/chunk-8gx3t4ng.js";import{Eit,GU}from"/$bunfs/root/chunk-4m9k7783.js";var l=new Map(Object.entries({keyword:ae.blue,built_in:ae.cyan,type:ae.cyan.dim,literal:ae.blue,number:ae.green,regexp:ae.red,string:ae.red,subst:ae.reset,symbol:ae.reset,class:ae.blue,function:ae.yellow,title:ae.reset,"title.function":ae.yellow,"title.class":ae.blue,params:ae.reset,comment:ae.green,doctag:ae.green,meta:ae.grey,"meta-keyword":ae.reset,"meta-string":ae.reset,"meta.keyword":ae.reset,"meta.string":ae.reset,section:ae.reset,tag:ae.grey,name:ae.blue,attr:ae.cyan,attribute:ae.reset,variable:ae.reset,bullet:ae.reset,code:ae.reset,emphasis:ae.italic,strong:ae.bold,link:ae.underline,quote:ae.reset,addition:ae.green,deletion:ae.red}));function a(e){let t=e.replace(/^hljs-/,"");for(;;){let r=l.get(t);if(r)return r;let n=t.lastIndexOf(".");if(n<0)return;t=t.slice(0,n)}}function g(e){if(typeof e==="string")return e;let t=e.children.map(g).join(""),r=e.scope??e.kind,n=r?a(r):void 0;return n?n(t):t}function u(e,t){let r=t?.language;if(!r)return e;try{let n=GU(r);if(!n)return e;let o=Eit().highlight(e,{language:n,ignoreIllegals:!0}),s=o._emitter??o.emitter,i=s?.rootNode??s?.root;if(!i||typeof i==="string")return e;return i.children.map(g).join("")}catch{return e}}function c(e){return GU(e)!==null}var d={highlight:u,supportsLanguage:c};function WT(){return d}
export{WT};
