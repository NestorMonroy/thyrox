// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
var Vce=/[\t\n\v\f\r \u0085\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/,u=new RegExp(`^${Vce.source}`);var c=new RegExp(`${`['"\u2018-\u201F]`}+`,"g");function A2(e){let n=e.replace(u,"");for(;;)if(n.startsWith("<#")){let r=n.indexOf("#>",2);if(r<0)break;n=n.slice(r+2).replace(u,"")}else if(n.startsWith("#")){let r=n.search(/[\r\n]/);if(r<0)break;n=n.slice(r).replace(u,"")}else break;return n}function wP(e){return e.replace(c,"")}var g=new RegExp(`^${`['"\u2018-\u201F]`}+|${`['"\u2018-\u201F]`}+$`,"g");function m1(e){return e.replace(g,"")}function l(e){if(e==="'"||e>="\u2018"&&e<="\u201B")return"single";if(e==='"'||e>="\u201C"&&e<="\u201E")return"double";return null}function Eq(e){let n="",r=null;for(let t=0;t<e.length;t++){let i=e[t];if(i==="`"){if(r==="single")n+="``";else if(t+1<e.length)n+=i+e[t+1],t++;else n+=i;continue}let s=l(i);if(r===null){if(s!==null){r=s;continue}n+=i}else if(s===r){if(t+1<e.length&&l(e[t+1])===s){n+=e[t+1],t++;continue}r=null}else n+=i}return n}function $k(e){return o(e,void 0)}var p={t:"\t",n:`
`,r:"\r",f:"\f",v:"\v"};function TKt(e){return o(e,p)}var d={"0":"\x00"};function h8r(e){return o(e,d)}function o(e,n){return e.replace(/`(?:(`)|[\r\n]+\s*|u\{([0-9a-fA-F]{1,6})\}|([\s\S]?))/g,(r,t,i,s)=>{if(t!==void 0)return"`";if(i!==void 0){let f=parseInt(i,16);return f<=1114111?String.fromCodePoint(f):"\uFFFD"}if(s===void 0)return"";if(n&&s in n)return n[s];return s})}
export{Vce,A2,wP,m1,Eq,$k,TKt,h8r};
