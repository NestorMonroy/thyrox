// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{l,A}from"/$bunfs/root/chunk-vfrpernt.js";import{S,V}from"/$bunfs/root/chunk-fy3j7rz0.js";import{Q}from"/$bunfs/root/chunk-rkvsjmym.js";import{jc,tZ}from"/$bunfs/root/chunk-s01a67az.js";import{Iy,C0}from"/$bunfs/root/chunk-0bxwbs9c.js";import{Aa}from"/$bunfs/root/chunk-7tfkwhcm.js";import{Wlt}from"/$bunfs/root/chunk-a1yytcnr.js";import{connect as m}from"net";import{StringDecoder as N}from"string_decoder";async function lf(f,a){let r;try{r=m(C0())}catch(t){return{ok:!1,code:"ENOCONN",error:Iy(l(t)),errno:A(t)}}let o=a?.timeoutMs??5000,e,s=new Promise((t)=>{e=t}),u=!1,n=!1,d=(t)=>{if(u)return;u=!0,r.destroy(),e(t)};r.setTimeout(o,()=>d({ok:!1,code:"ETIMEOUT",error:"control socket timeout",connected:n})),r.on("error",(t)=>d({ok:!1,code:"ENOCONN",error:Iy(l(t)),connected:n,errno:A(t)})),r.once("connect",()=>{n=!0,r.write(S(f)+`
`)});let c=new N("utf8"),i="";return r.on("data",(t)=>{i+=c.write(t);let p=i.indexOf(`
`);if(p<0)return;let C=i.slice(0,p);try{d(V(C))}catch(y){d({ok:!1,code:"ENOCONN",error:Iy(l(y)),connected:n})}}),r.once("close",()=>{if(!u)d({ok:!1,code:"ENOCONN",error:"connection dropped mid-request \u2014 it may have restarted; retry",connected:n})}),s}function qqe(f){let a={label:f,cwd:Q(),pid:process.pid},r=!1,o=null,e=null,s=()=>{if(r)return;try{o=m(C0())}catch{o=null,e=setTimeout(s,1000),e.unref();return}o.on("error",()=>o?.destroy()),o.once("connect",()=>o?.write(S({proto:Aa,op:"lease",client:a})+`
`)),o.on("data",()=>{}),o.once("close",()=>{if(o=null,r)return;e=setTimeout(s,1000),e.unref()}),o.unref()};return s(),()=>{if(r=!0,e)clearTimeout(e);o?.destroy()}}function urn(f,a,r,o){let e;try{e=m(C0())}catch(c){return queueMicrotask(()=>o(Iy(l(c)))),()=>{}}let s=!1,u=!1,n=(c)=>{if(s)return;s=!0,o(c)};e.setTimeout(1e4,()=>{if(!u)n(`${jc()} did not respond \u2014 it may be stalled${tZ("restart")}`),e.destroy()}),e.on("error",(c)=>n(Iy(l(c)))),e.on("close",()=>n("control socket closed")),e.on("connect",()=>e.write(S({proto:Aa,op:"subscribe",short:f,tail:a})+`
`));let d=Wlt(e,(c)=>{if(!u)u=!0,e.setTimeout(0);try{let i=V(c);if("ok"in i&&i.ok===!1)n(i.error);else r(i)}catch{}});return()=>{s=!0,d(),e.destroy()}}
export{lf,qqe,urn};
