// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{xxd as p}from"/$bunfs/root/_837.js";function i(t){let e=a(t.replace(/[\t\n\r]/g,"").toLowerCase());if(e===""||h.test(e))return e;try{let n=new URL(`https://${e}`);if(n.username!==""||n.password!==""||n.port!==""||n.pathname!=="/"||n.search!==""||n.hash!=="")return e;return a(n.hostname)}catch{return e}}function l(t,e){let n=i(t);while(n.startsWith("www."))n=n.slice(4);return n===e}function u(t){return l(t,"github.com")}function H(t,e){if(!t||!e)return!1;let n=i(t);return n!==""&&n===i(e)}function O(t){return u(t)?"https://api.github.com":`https://${t}/api/v3`}function S(t){return u(t)?"https://api.github.com/graphql":`https://${t}/api/graphql`}function c(t){return/[%\x00-\x1f\x7f-\u{10FFFF}]/u.test(t)}function g(t){t=t.replace(/^[\x00-\x20]+/,"");let e=t.indexOf("://");if(e===-1)return!1;let n=t.slice(e+3),s=t.slice(0,e).toLowerCase();if(f.has(s)){let o=n.match(/^[/\\]+/)?.[0]??"";if(o.includes("\\"))return!0;n=n.slice(o.length)}let r=n.search(/[/?#]/);return(r===-1?n:n.slice(0,r)).includes("\\")}function d(t){if(t.includes("://")){if(g(t))return!0;try{let r=new URL(t);if(r.protocol==="http:"||r.protocol==="https:")return!1;return c(r.hostname)}catch{return!0}}let e=t.indexOf(":"),n=t.indexOf("@");if(e>=0&&n>e)return!0;let s=t.match(/^(?:[^@]+@)?([^:]+):/)?.[1];return s?c(s):!1}function a(t){let e=t.length;while(e>0&&t[e-1]===".")e--;return t.slice(0,e)}var m="github.com",h,f;var _=p(()=>{h=/[:/\\?#@\s]/,f=new Set(["http","https","ws","wss","ftp"])});
export{m as t9c,i as u9c,l as v9c,u as w9c,H as x9c,O as y9c,S as z9c,g as A9c,d as B9c,_ as C9c};
