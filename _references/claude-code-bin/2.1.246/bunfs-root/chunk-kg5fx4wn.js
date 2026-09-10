// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{w$c as p}from"/$bunfs/root/_800.js";import{xxd as l}from"/$bunfs/root/_837.js";function c(){if(u)return a;u=!0;try{a=p()}catch{a=null}return a}function b(m){let t=[];async function s(e){let r=c();if(!r)throw Error("Native image processor module not available");let n=await r.processImage(m);if(e)for(let i of t)i(n);return n}let o={async metadata(){let e=await s(!1);try{return e.metadata()}finally{e.dispose?.()}},resize(e,r,n){return t.push((i)=>{i.resize(e,r,n)}),o},jpeg(e){return t.push((r)=>{r.jpeg(e?.quality)}),o},png(e){return t.push((r)=>{r.png(e)}),o},webp(e){return t.push((r)=>{r.webp(e?.quality)}),o},async toBuffer(){let e=await s(!0);try{return await e.toBuffer()}finally{e.dispose?.()}}};return o}var a=null,u=!1,h;var g=l(()=>{h=b});g();export{h as default,c as getNativeModule,b as sharp};
