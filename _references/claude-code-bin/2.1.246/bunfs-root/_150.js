// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Xp as T}from"/$bunfs/root/_151.js";import{Ccb as b,ddb as P}from"/$bunfs/root/_495.js";import{Uib as C,Vib as q,pib as f}from"/$bunfs/root/_508.js";import{Psc as O,Rsc as R,Ysc as x}from"/$bunfs/root/_668.js";import{m_c as g,n_c as h}from"/$bunfs/root/_778.js";import{mgd as p,qgd as N,ugd as M}from"/$bunfs/root/_820.js";import{Mud as d,Nud as y,zvd as S}from"/$bunfs/root/_831.js";x();h();S();M();import{connect as k}from"net";import{StringDecoder as _}from"string_decoder";q();P();async function z(a,m){let r;try{r=k(C())}catch(t){return{ok:!1,code:"ENOCONN",error:f(d(t)),errno:y(t)}}let o=m?.timeoutMs??5000,e,s=new Promise((t)=>{e=t}),l=!1,n=!1,u=(t)=>{if(l)return;l=!0,r.destroy(),e(t)};r.setTimeout(o,()=>u({ok:!1,code:"ETIMEOUT",error:"control socket timeout",connected:n})),r.on("error",(t)=>u({ok:!1,code:"ENOCONN",error:f(d(t)),connected:n,errno:y(t)})),r.once("connect",()=>{n=!0,r.write(p(a)+`
`)});let c=new _("utf8"),i="";return r.on("data",(t)=>{i+=c.write(t);let v=i.indexOf(`
`);if(v<0)return;let E=i.slice(0,v);try{u(N(E))}catch(w){u({ok:!1,code:"ENOCONN",error:f(d(w)),connected:n})}}),r.once("close",()=>{if(!l)u({ok:!1,code:"ENOCONN",error:"connection dropped mid-request \u2014 it may have restarted; retry",connected:n})}),s}function F(a){let m={label:a,cwd:g(),pid:process.pid},r=!1,o=null,e=null,s=()=>{if(r)return;try{o=k(C())}catch{o=null,e=setTimeout(s,1000),e.unref();return}o.on("error",()=>o?.destroy()),o.once("connect",()=>o?.write(p({proto:b,op:"lease",client:m})+`
`)),o.on("data",()=>{}),o.once("close",()=>{if(o=null,r)return;e=setTimeout(s,1000),e.unref()}),o.unref()};return s(),()=>{if(r=!0,e)clearTimeout(e);o?.destroy()}}function J(a,m,r,o){let e;try{e=k(C())}catch(c){return queueMicrotask(()=>o(f(d(c)))),()=>{}}let s=!1,l=!1,n=(c)=>{if(s)return;s=!0,o(c)};e.setTimeout(1e4,()=>{if(!l)n(`${O()} did not respond \u2014 it may be stalled${R("restart")}`),e.destroy()}),e.on("error",(c)=>n(f(d(c)))),e.on("close",()=>n("control socket closed")),e.on("connect",()=>e.write(p({proto:b,op:"subscribe",short:a,tail:m})+`
`));let u=T(e,(c)=>{if(!l)l=!0,e.setTimeout(0);try{let i=N(c);if("ok"in i&&i.ok===!1)n(i.error);else r(i)}catch{}});return()=>{s=!0,u(),e.destroy()}}
export{z as Up,F as Vp,J as Wp};
