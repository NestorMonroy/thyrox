// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{txc as a,yxc as x}from"/$bunfs/root/_675.js";import{czc as p,mzc as m}from"/$bunfs/root/_680.js";import{Jjd as l,Kjd as g,atd as h,zkd as c}from"/$bunfs/root/_826.js";import{xxd as b}from"/$bunfs/root/_837.js";class d{buffer="";capturing=!1;readableHandler=null}function o(){return C.of(c().host)}function A(){let e=o();if(!process.stdin.isTTY||e.capturing||a("-p")||a("--print"))return;e.capturing=!0,e.buffer="";try{process.stdin.setEncoding("utf8"),process.stdin.setRawMode(!0),process.stdin.ref(),e.readableHandler=()=>{let n=process.stdin.read();while(n!==null){if(typeof n==="string")y(n);n=process.stdin.read()}},process.stdin.on("readable",e.readableHandler)}catch{e.capturing=!1}}function y(e){let n=o(),t=0;while(t<e.length){let u=e[t],i=u.charCodeAt(0);if(i===3){s(),process.exit(130);return}if(i===4){s();return}if(i===127||i===8){if(n.buffer.length>0){let r=p(n.buffer);n.buffer=n.buffer.slice(0,-(r.length||1))}t++;continue}if(i===27){t++;let r=t<e.length?e.charCodeAt(t):-1;if(r===91){t++;while(t<e.length&&e.charCodeAt(t)<64)t++;if(t<e.length)t++}else if(r===93||r===80||r===88||r===94||r===95){t++;while(t<e.length){let f=e.charCodeAt(t);if(f===7){t++;break}if(f===27&&t+1<e.length&&e.charCodeAt(t+1)===92){t+=2;break}t++}}else if(r===79)t+=2;else if(r!==-1&&r!==27)t++;continue}if(i<32&&i!==9&&i!==10&&i!==13){t++;continue}if(i===13){n.buffer+=`
`,t++;continue}n.buffer+=u,t++}}function s(){let e=o();if(!e.capturing)return;if(e.capturing=!1,e.readableHandler)process.stdin.removeListener("readable",e.readableHandler),e.readableHandler=null}function k(){s();let e=o(),n=e.buffer.trim();return e.buffer="",n}function R(){return o().buffer.trim().length>0}function S(e){o().buffer=e}function T(){return o().capturing}var C;var E=b(()=>{h();g();x();m();C=new l(()=>new d)});
export{C as cab,A as dab,y as eab,s as fab,k as gab,R as hab,S as iab,T as jab,E as kab};
