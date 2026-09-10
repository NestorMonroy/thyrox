// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{SO as S,UO as P,WO as U}from"/$bunfs/root/_388.js";import{Bha as O,Eha as D}from"/$bunfs/root/_441.js";import{M7a as C,N7a as _,S7a as R,i8a as L}from"/$bunfs/root/_476.js";import{Qbb as I,Rbb as W}from"/$bunfs/root/_487.js";import{Zub as x,cvb as F}from"/$bunfs/root/_534.js";import{cZb as y,dZb as N}from"/$bunfs/root/_613.js";import{b_c as h,c_c as A}from"/$bunfs/root/_775.js";import{Hgd as u,Ngd as T,tgd as E,ugd as w}from"/$bunfs/root/_820.js";import{xxd as b}from"/$bunfs/root/_837.js";import{spawnSync as m}from"child_process";function K(e){let t=u(),i=I.get(process.stdout);if(!i)throw Error("Ink instance not found - cannot pause rendering");let n=P();if(!n)return{content:null};try{t.statSync(e)}catch{return{content:null}}let l=S(n)===void 0;if(l)i.enterAlternateScreen();else i.prepareTerminalForHandoff();try{let c=k[n]??n,d=c.split(" "),s=d[0]??c,r=d.slice(1),o;{let a=h();if(o=m(s,[...r,e],{stdio:"inherit",...a}),o.error&&a.cgroup!==void 0)o=m(s,[...r,e],{stdio:"inherit"})}if(o.error||o.signal||o.status!==null&&o.status!==0){let a=O(n);return{content:null,error:o.error?`Couldn't open ${a} \u2014 ${o.error.message}`:o.signal?`${a} closed unexpectedly (${o.signal})`:`${a} quit unexpectedly (exit code ${o.status})`}}return{content:t.readFileSync(e,{encoding:"utf-8"})}}catch{return{content:null}}finally{if(l)i.exitAlternateScreen();else i.restoreTerminalAfterHandoff()}}function M(e,t,i){let n=e;for(let[l,c]of Object.entries(i))if(c.type==="text"){let d=parseInt(l),s=c.content;if(c.unavailable||s==="")continue;let r=n.indexOf(s);if(r!==-1){let o=C(s),p=_(d,o);n=n.slice(0,r)+p+n.slice(r+s.length)}}return n}function j(e){let t=x(e).split(`
`);if(t.length>g)t=t.slice(-g),t.unshift("\u2026 (earlier output truncated)");return`# \u2500\u2500\u2500 Claude's last response (for reference; removed on save) \u2500\u2500\u2500
`+`${t.map((n)=>n?`# ${n}`:"#").join(`
`)}
${f}

`}function v(e){let t=e.indexOf(f);if(t===-1)return e;return e.slice(t+f.length).replace(/^\r?\n\r?\n?/,"")}function nt(e,t,i){let n=u(),l=y();try{let c=t?R(e,t):e,d=i?j(i)+c:c;E(l,d,{encoding:"utf-8",flush:!0});let s=K(l);if(s.content===null)return s;let r=s.content;if(i)r=v(r);if(r.endsWith(`
`)&&!r.endsWith(`

`))r=r.slice(0,-1);if(t)r=M(r,e,t);return{content:r}}finally{try{n.unlinkSync(l)}catch{}}}var k,f="# \u2500\u2500\u2500 Write your reply below this line \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500",g=50;var H=b(()=>{L();W();F();U();T();D();A();w();N();k={code:"code -w",subl:"subl --wait"}});
export{K as PO,nt as QO,H as RO};
