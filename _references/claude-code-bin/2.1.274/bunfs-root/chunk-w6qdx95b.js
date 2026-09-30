// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{l,k}from"/$bunfs/root/chunk-3btyksgt.js";import{w,J}from"/$bunfs/root/chunk-r2c9k9kh.js";import{te}from"/$bunfs/root/chunk-1mz51xz6.js";import{Qu,hie}from"/$bunfs/root/chunk-h0vkrkye.js";import{Mb,mL}from"/$bunfs/root/chunk-hb5ya2hv.js";import{fl}from"/$bunfs/root/chunk-wae9xe9x.js";import{cAt}from"/$bunfs/root/chunk-nr6bd9wy.js";import{connect as m}from"net";import{StringDecoder as N}from"string_decoder";async function Im(f,a){let r;try{r=m(mL())}catch(t){return{ok:!1,code:"ENOCONN",error:Mb(l(t)),errno:k(t)}}let o=a?.timeoutMs??5000,e,s=new Promise((t)=>{e=t}),u=!1,n=!1,d=(t)=>{if(u)return;u=!0,r.destroy(),e(t)};r.setTimeout(o,()=>d({ok:!1,code:"ETIMEOUT",error:"control socket timeout",connected:n})),r.on("error",(t)=>d({ok:!1,code:"ENOCONN",error:Mb(l(t)),connected:n,errno:k(t)})),r.once("connect",()=>{n=!0,r.write(w(f)+`
`)});let c=new N("utf8"),i="";return r.on("data",(t)=>{i+=c.write(t);let p=i.indexOf(`
`);if(p<0)return;let C=i.slice(0,p);try{d(J(C))}catch(y){d({ok:!1,code:"ENOCONN",error:Mb(l(y)),connected:n})}}),r.once("close",()=>{if(!u)d({ok:!1,code:"ENOCONN",error:"connection dropped mid-request \u2014 it may have restarted; retry",connected:n})}),s}function yZe(f){let a={label:f,cwd:te(),pid:process.pid},r=!1,o=null,e=null,s=()=>{if(r)return;try{o=m(mL())}catch{o=null,e=setTimeout(s,1000),e.unref();return}o.on("error",()=>o?.destroy()),o.once("connect",()=>o?.write(w({proto:fl,op:"lease",client:a})+`
`)),o.on("data",()=>{}),o.once("close",()=>{if(o=null,r)return;e=setTimeout(s,1000),e.unref()}),o.unref()};return s(),()=>{if(r=!0,e)clearTimeout(e);o?.destroy()}}function HCn(f,a,r,o){let e;try{e=m(mL())}catch(c){return queueMicrotask(()=>o(Mb(l(c)))),()=>{}}let s=!1,u=!1,n=(c)=>{if(s)return;s=!0,o(c)};e.setTimeout(1e4,()=>{if(!u)n(`${Qu()} did not respond \u2014 it may be stalled${hie("restart")}`),e.destroy()}),e.on("error",(c)=>n(Mb(l(c)))),e.on("close",()=>n("control socket closed")),e.on("connect",()=>e.write(w({proto:fl,op:"subscribe",short:f,tail:a})+`
`));let d=cAt(e,(c)=>{if(!u)u=!0,e.setTimeout(0);try{let i=J(c);if("ok"in i&&i.ok===!1)n(i.error);else r(i)}catch{}});return()=>{s=!0,d(),e.destroy()}}
export{Im,yZe,HCn};
