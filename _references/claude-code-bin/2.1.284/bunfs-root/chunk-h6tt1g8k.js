// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{oO}from"/$bunfs/root/chunk-yg7hj4df.js";var jo="github.com",xqr=[`git@${jo}:`,`ssh://git@${jo}/`],l=[`https://${jo}`,`https://${jo}/`,jo],f=`users.noreply.${jo}`,a="https://api.github.com",u=/[:/\\?#@\s]/,Pqr=new Set(["http","https","ws","wss","ftp"]),RWt=/^(?!\.{1,2}$)[a-z0-9.-]+$/;function tU(t){let n=c(t.replace(/[\t\n\r]/g,"").toLowerCase());if(n===""||u.test(n))return n;try{let e=new URL(`https://${n}`);if(e.username!==""||e.password!==""||e.port!==""||e.pathname!=="/"||e.search!==""||e.hash!=="")return n;return c(e.hostname)}catch{return n}}var xWt=oO(function(n){let e=tU(n);while(e.startsWith("www."))e=e.slice(4);return e},(t)=>t,50);function ZXn(t,n){return xWt(t)===n}function Ho(t){return ZXn(t,jo)}function T7(t,n){if(!t||!n)return!1;let e=tU(t);return e!==""&&e===tU(n)}function gbn(t){return Ho(t)?a:`https://${t}/api/v3`}function EGo(t){return Ho(t)?`${a}/graphql`:`https://${t}/api/graphql`}function i(t){return/[%\x00-\x1f\x7f-\u{10FFFF}]/u.test(t)}function Rbe(t){t=t.replace(/^[\x00-\x20]+/,"").replace(/[\t\n\r]/g,"");let n=t.indexOf("://");if(n===-1)return!1;let e=t.slice(n+3),s=t.slice(0,n).toLowerCase();if(Pqr.has(s)){let o=e.match(/^[/\\]+/)?.[0]??"";if(o.includes("\\"))return!0;e=e.slice(o.length)}let r=e.search(/[/?#]/);return(r===-1?e:e.slice(0,r)).includes("\\")}function dY(t){if(t.includes("://")){if(Rbe(t))return!0;try{let r=new URL(t);if(r.protocol==="http:"||r.protocol==="https:")return!1;return i(r.hostname)}catch{return!0}}let n=t.indexOf(":"),e=t.indexOf("@");if(n>=0&&e>n)return!0;let s=t.match(/^(?:[^@]+@)?([^:]+):/)?.[1];return s?i(s):!1}function c(t){let n=t.length;while(n>0&&t[n-1]===".")n--;return t.slice(0,n)}
export{jo,xqr,Pqr,RWt,tU,xWt,ZXn,Ho,T7,gbn,EGo,Rbe,dY};
