// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{l,v}from"/$bunfs/root/chunk-2bj5eqbj.js";import{S,Q}from"/$bunfs/root/chunk-wfscmafr.js";import{ne}from"/$bunfs/root/chunk-8cvm4kna.js";import{Rp,Rue}from"/$bunfs/root/chunk-jjjf86rw.js";import{Cw,LF}from"/$bunfs/root/chunk-5kzsbtec.js";import{_c}from"/$bunfs/root/chunk-ew6qt9wg.js";import{aBt}from"/$bunfs/root/chunk-rpf6rh6t.js";import{connect as m}from"net";import{StringDecoder as N}from"string_decoder";async function Sg(f,a){let r;try{r=m(LF())}catch(t){return{ok:!1,code:"ENOCONN",error:Cw(l(t)),errno:v(t)}}let o=a?.timeoutMs??5000,e,s=new Promise((t)=>{e=t}),u=!1,n=!1,d=(t)=>{if(u)return;u=!0,r.destroy(),e(t)};r.setTimeout(o,()=>d({ok:!1,code:"ETIMEOUT",error:"control socket timeout",connected:n})),r.on("error",(t)=>d({ok:!1,code:"ENOCONN",error:Cw(l(t)),connected:n,errno:v(t)})),r.once("connect",()=>{n=!0,r.write(S(f)+`
`)});let c=new N("utf8"),i="";return r.on("data",(t)=>{i+=c.write(t);let p=i.indexOf(`
`);if(p<0)return;let C=i.slice(0,p);try{d(Q(C))}catch(y){d({ok:!1,code:"ENOCONN",error:Cw(l(y)),connected:n})}}),r.once("close",()=>{if(!u)d({ok:!1,code:"ENOCONN",error:"connection dropped mid-request \u2014 it may have restarted; retry",connected:n})}),s}function dft(f){let a={label:f,cwd:ne(),pid:process.pid},r=!1,o=null,e=null,s=()=>{if(r)return;try{o=m(LF())}catch{o=null,e=setTimeout(s,1000),e.unref();return}o.on("error",()=>o?.destroy()),o.once("connect",()=>o?.write(S({proto:_c,op:"lease",client:a})+`
`)),o.on("data",()=>{}),o.once("close",()=>{if(o=null,r)return;e=setTimeout(s,1000),e.unref()}),o.unref()};return s(),()=>{if(r=!0,e)clearTimeout(e);o?.destroy()}}function Y5n(f,a,r,o){let e;try{e=m(LF())}catch(c){return queueMicrotask(()=>o(Cw(l(c)))),()=>{}}let s=!1,u=!1,n=(c)=>{if(s)return;s=!0,o(c)};e.setTimeout(1e4,()=>{if(!u)n(`${Rp()} did not respond \u2014 it may be stalled${Rue("restart")}`),e.destroy()}),e.on("error",(c)=>n(Cw(l(c)))),e.on("close",()=>n("control socket closed")),e.on("connect",()=>e.write(S({proto:_c,op:"subscribe",short:f,tail:a})+`
`));let d=aBt(e,(c)=>{if(!u)u=!0,e.setTimeout(0);try{let i=Q(c);if("ok"in i&&i.ok===!1)n(i.error);else r(i)}catch{}});return()=>{s=!0,d(),e.destroy()}}
export{Sg,dft,Y5n};
