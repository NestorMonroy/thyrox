// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{qcd as P}from"/$bunfs/root/_812.js";import{Pcd as d,Rcd as g}from"/$bunfs/root/_814.js";import{jhd as p,ohd as y}from"/$bunfs/root/_820.js";import{Nud as l,Oud as f,zvd as b}from"/$bunfs/root/_831.js";import{fwd as a,nwd as w}from"/$bunfs/root/_833.js";import{xxd as h}from"/$bunfs/root/_837.js";import{spawn as S}from"child_process";function L(e,o="SIGKILL"){if(!Number.isInteger(e)||e<=1)return Promise.resolve();return E(e,o).catch(()=>{})}async function E(e,o){let t=await v(e);try{process.kill(-e,o)}catch(r){try{process.kill(e,o)}catch{}if(l(r)!=="ESRCH")k("group_kill",r)}for(let r of t)try{process.kill(r,o)}catch{}}async function v(e){let o;try{o=await Promise.race([T(),new Promise((i)=>{let n=setTimeout((c)=>c(""),_,i);if(typeof n==="object")n.unref()})])}catch(i){return k("enum_spawn",i),new Set}let t=new Map;for(let i of o.split(`
`)){let n=i.match(/^\s*(\d+)\s+(\d+)\s*$/);if(!n)continue;let c=Number(n[1]),u=Number(n[2]),m=t.get(u);if(m)m.push(c);else t.set(u,[c])}let r=new Set,s=[e];while(s.length>0){let i=s.shift();for(let n of t.get(i)??[])if(n>1&&n!==e&&!r.has(n))r.add(n),s.push(n)}return r}function T(){return new Promise((e,o)=>{let t;try{t=S("ps",["-A","-o","pid=","-o","ppid="],{cwd:"/",stdio:["ignore","pipe","ignore"],windowsHide:!0})}catch(s){o(s);return}let r="";t.stdout?.on("data",(s)=>r+=s),t.once("error",o),t.once("close",()=>e(r))})}function k(e,o){try{let t=l(o),r=f(o);p(`killProcessTree ${e} failed: ${t??o}`),d("tengu_bash_tool_kill_error",{stage:a(e),...r&&{error_code:r}})}catch{}}var _=500;var N=h(()=>{g();w();y();P();b()});
export{L as Ofb,N as Pfb};
