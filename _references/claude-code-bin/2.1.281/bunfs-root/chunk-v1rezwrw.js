// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{V,W}from"/$bunfs/root/chunk-cqc88nqm.js";import{l5}from"/$bunfs/root/chunk-nsnsjnjr.js";import{KR}from"/$bunfs/root/chunk-xwwap3xv.js";class u{buffer="";capturing=!1;readableHandler=null}var f=new V(()=>new u);function o(){return f.of(W().host)}function yMo(){let e=o();if(!process.stdin.isTTY||e.capturing||KR("-p")||KR("--print"))return;e.capturing=!0,e.buffer="";try{process.stdin.setEncoding("utf8"),process.stdin.setRawMode(!0),process.stdin.ref(),e.readableHandler=()=>{let n=process.stdin.read();while(n!==null){if(typeof n==="string")l(n);n=process.stdin.read()}},process.stdin.on("readable",e.readableHandler)}catch{e.capturing=!1}}function l(e){let n=o(),t=0;while(t<e.length){let a=e[t],i=a.charCodeAt(0);if(i===3){XB(),process.exit(130);return}if(i===4){XB();return}if(i===127||i===8){if(n.buffer.length>0){let r=l5(n.buffer);n.buffer=n.buffer.slice(0,-(r.length||1))}t++;continue}if(i===27){t++;let r=t<e.length?e.charCodeAt(t):-1;if(r===91){t++;while(t<e.length&&e.charCodeAt(t)<64)t++;if(t<e.length)t++}else if(r===93||r===80||r===88||r===94||r===95){t++;while(t<e.length){let s=e.charCodeAt(t);if(s===7){t++;break}if(s===27&&t+1<e.length&&e.charCodeAt(t+1)===92){t+=2;break}t++}}else if(r===79)t+=2;else if(r!==-1&&r!==27)t++;continue}if(i<32&&i!==9&&i!==10&&i!==13){t++;continue}if(i===13){n.buffer+=`
`,t++;continue}n.buffer+=a,t++}}function XB(){let e=o();if(!e.capturing)return;if(e.capturing=!1,e.readableHandler)process.stdin.removeListener("readable",e.readableHandler),e.readableHandler=null}function D8e(){XB();let e=o(),n=e.buffer.trim();return e.buffer="",n}function qmt(){return o().buffer.trim().length>0}function Kmt(e){o().buffer=e}export{yMo,XB,D8e,qmt,Kmt};
