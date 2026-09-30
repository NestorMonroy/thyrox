// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{WI}from"/$bunfs/root/chunk-hsr4yk27.js";var ps="github.com",k0r=[`git@${ps}:`,`ssh://git@${ps}/`],f=[`https://${ps}`,`https://${ps}/`,ps],g=`users.noreply.${ps}`,a="https://api.github.com",u=/[:/\\?#@\s]/,p=new Set(["http","https","ws","wss","ftp"]);function gNe(t){let n=c(t.replace(/[\t\n\r]/g,"").toLowerCase());if(n===""||u.test(n))return n;try{let e=new URL(`https://${n}`);if(e.username!==""||e.password!==""||e.port!==""||e.pathname!=="/"||e.search!==""||e.hash!=="")return n;return c(e.hostname)}catch{return n}}var jDt=WI(function(n){let e=gNe(n);while(e.startsWith("www."))e=e.slice(4);return e},(t)=>t,50);function K2n(t,n){return jDt(t)===n}function Po(t){return K2n(t,ps)}function w9(t,n){if(!t||!n)return!1;let e=gNe(t);return e!==""&&e===gNe(n)}function vln(t){return Po(t)?a:`https://${t}/api/v3`}function bAo(t){return Po(t)?`${a}/graphql`:`https://${t}/api/graphql`}function i(t){return/[%\x00-\x1f\x7f-\u{10FFFF}]/u.test(t)}function hNe(t){t=t.replace(/^[\x00-\x20]+/,"");let n=t.indexOf("://");if(n===-1)return!1;let e=t.slice(n+3),s=t.slice(0,n).toLowerCase();if(p.has(s)){let o=e.match(/^[/\\]+/)?.[0]??"";if(o.includes("\\"))return!0;e=e.slice(o.length)}let r=e.search(/[/?#]/);return(r===-1?e:e.slice(0,r)).includes("\\")}function dge(t){if(t.includes("://")){if(hNe(t))return!0;try{let r=new URL(t);if(r.protocol==="http:"||r.protocol==="https:")return!1;return i(r.hostname)}catch{return!0}}let n=t.indexOf(":"),e=t.indexOf("@");if(n>=0&&e>n)return!0;let s=t.match(/^(?:[^@]+@)?([^:]+):/)?.[1];return s?i(s):!1}function c(t){let n=t.length;while(n>0&&t[n-1]===".")n--;return t.slice(0,n)}
export{ps,k0r,gNe,jDt,K2n,Po,w9,vln,bAo,hNe,dge};
