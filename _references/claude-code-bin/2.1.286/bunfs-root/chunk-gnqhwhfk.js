// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{l,k}from"/$bunfs/root/chunk-ctczby4m.js";import{b,Q}from"/$bunfs/root/chunk-6w550002.js";import{oe}from"/$bunfs/root/chunk-qrvgaype.js";import{Fp,qle}from"/$bunfs/root/chunk-n5qwqw3e.js";import{Kw,v1}from"/$bunfs/root/chunk-a1jrb4t9.js";import{hc}from"/$bunfs/root/chunk-j6mm9mhr.js";import{M4t}from"/$bunfs/root/chunk-csnw3g6y.js";import{connect as m}from"net";import{StringDecoder as N}from"string_decoder";async function pg(f,a){let r;try{r=m(v1())}catch(t){return{ok:!1,code:"ENOCONN",error:Kw(l(t)),errno:k(t)}}let o=a?.timeoutMs??5000,e,s=new Promise((t)=>{e=t}),u=!1,n=!1,d=(t)=>{if(u)return;u=!0,r.destroy(),e(t)};r.setTimeout(o,()=>d({ok:!1,code:"ETIMEOUT",error:"control socket timeout",connected:n})),r.on("error",(t)=>d({ok:!1,code:"ENOCONN",error:Kw(l(t)),connected:n,errno:k(t)})),r.once("connect",()=>{n=!0,r.write(b(f)+`
`)});let c=new N("utf8"),i="";return r.on("data",(t)=>{i+=c.write(t);let p=i.indexOf(`
`);if(p<0)return;let C=i.slice(0,p);try{d(Q(C))}catch(y){d({ok:!1,code:"ENOCONN",error:Kw(l(y)),connected:n})}}),r.once("close",()=>{if(!u)d({ok:!1,code:"ENOCONN",error:"connection dropped mid-request \u2014 it may have restarted; retry",connected:n})}),s}function Iwt(f){let a={label:f,cwd:oe(),pid:process.pid},r=!1,o=null,e=null,s=()=>{if(r)return;try{o=m(v1())}catch{o=null,e=setTimeout(s,1000),e.unref();return}o.on("error",()=>o?.destroy()),o.once("connect",()=>o?.write(b({proto:hc,op:"lease",client:a})+`
`)),o.on("data",()=>{}),o.once("close",()=>{if(o=null,r)return;e=setTimeout(s,1000),e.unref()}),o.unref()};return s(),()=>{if(r=!0,e)clearTimeout(e);o?.destroy()}}function Wsr(f,a,r,o){let e;try{e=m(v1())}catch(c){return queueMicrotask(()=>o(Kw(l(c)))),()=>{}}let s=!1,u=!1,n=(c)=>{if(s)return;s=!0,o(c)};e.setTimeout(1e4,()=>{if(!u)n(`${Fp()} did not respond \u2014 it may be stalled${qle("restart")}`),e.destroy()}),e.on("error",(c)=>n(Kw(l(c)))),e.on("close",()=>n("control socket closed")),e.on("connect",()=>e.write(b({proto:hc,op:"subscribe",short:f,tail:a})+`
`));let d=M4t(e,(c)=>{if(!u)u=!0,e.setTimeout(0);try{let i=Q(c);if("ok"in i&&i.ok===!1)n(i.error);else r(i)}catch{}});return()=>{s=!0,d(),e.destroy()}}
export{pg,Iwt,Wsr};
