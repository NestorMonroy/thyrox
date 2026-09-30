// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{l,v}from"/$bunfs/root/chunk-ern0s5ks.js";import{b,J}from"/$bunfs/root/chunk-zkn0228z.js";import{oe}from"/$bunfs/root/chunk-mf83r1w7.js";import{kp,Zie}from"/$bunfs/root/chunk-4x2jc802.js";import{hw,kB}from"/$bunfs/root/chunk-wngxtykq.js";import{wc}from"/$bunfs/root/chunk-mxz6ht5b.js";import{Zzt}from"/$bunfs/root/chunk-y641zpzf.js";import{connect as m}from"net";import{StringDecoder as N}from"string_decoder";async function yg(f,a){let r;try{r=m(kB())}catch(t){return{ok:!1,code:"ENOCONN",error:hw(l(t)),errno:v(t)}}let o=a?.timeoutMs??5000,e,s=new Promise((t)=>{e=t}),u=!1,n=!1,d=(t)=>{if(u)return;u=!0,r.destroy(),e(t)};r.setTimeout(o,()=>d({ok:!1,code:"ETIMEOUT",error:"control socket timeout",connected:n})),r.on("error",(t)=>d({ok:!1,code:"ENOCONN",error:hw(l(t)),connected:n,errno:v(t)})),r.once("connect",()=>{n=!0,r.write(b(f)+`
`)});let c=new N("utf8"),i="";return r.on("data",(t)=>{i+=c.write(t);let p=i.indexOf(`
`);if(p<0)return;let C=i.slice(0,p);try{d(J(C))}catch(y){d({ok:!1,code:"ENOCONN",error:hw(l(y)),connected:n})}}),r.once("close",()=>{if(!u)d({ok:!1,code:"ENOCONN",error:"connection dropped mid-request \u2014 it may have restarted; retry",connected:n})}),s}function vyt(f){let a={label:f,cwd:oe(),pid:process.pid},r=!1,o=null,e=null,s=()=>{if(r)return;try{o=m(kB())}catch{o=null,e=setTimeout(s,1000),e.unref();return}o.on("error",()=>o?.destroy()),o.once("connect",()=>o?.write(b({proto:wc,op:"lease",client:a})+`
`)),o.on("data",()=>{}),o.once("close",()=>{if(o=null,r)return;e=setTimeout(s,1000),e.unref()}),o.unref()};return s(),()=>{if(r=!0,e)clearTimeout(e);o?.destroy()}}function iZn(f,a,r,o){let e;try{e=m(kB())}catch(c){return queueMicrotask(()=>o(hw(l(c)))),()=>{}}let s=!1,u=!1,n=(c)=>{if(s)return;s=!0,o(c)};e.setTimeout(1e4,()=>{if(!u)n(`${kp()} did not respond \u2014 it may be stalled${Zie("restart")}`),e.destroy()}),e.on("error",(c)=>n(hw(l(c)))),e.on("close",()=>n("control socket closed")),e.on("connect",()=>e.write(b({proto:wc,op:"subscribe",short:f,tail:a})+`
`));let d=Zzt(e,(c)=>{if(!u)u=!0,e.setTimeout(0);try{let i=J(c);if("ok"in i&&i.ok===!1)n(i.error);else r(i)}catch{}});return()=>{s=!0,d(),e.destroy()}}
export{yg,vyt,iZn};
