// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{fj}from"/$bunfs/root/chunk-fmsbxtrp.js";import{ufn}from"/$bunfs/root/chunk-q8a07cv0.js";import{aYe,X4n}from"/$bunfs/root/chunk-5mcqvwzx.js";import{Fte}from"/$bunfs/root/chunk-t6pwageh.js";var O=new RegExp(`^<${fj}[ \\t>]`),E=`</${fj}>`,d=["",`
`],P=/\sfrom-plugin\s*(?:=\s*(?:"[^"<>]*"|'[^'<>]*'|[^\s>]*))?/gi,h=/from-plugin/i;function ioe(e,n){if(typeof e==="string")return m(e,n===Fte);if(!Array.isArray(e))return e;let t=e;for(let s of d){let o=[],l=[],r="";t.forEach((i,u)=>{if(i.type==="text"){if(l.length>0)r+=s;o.push(r.length),l.push(u),r+=i.text}});let g=X4n(r),a;for(let i=g.length-1;i>=0;i--){let u=g[i],c=o.length-1;while(o[c]>u)c--;a??=t.slice();let f=a[l[c]];if(f.type==="text"){let p=u-o[c];a[l[c]]={...f,text:`${f.text.slice(0,p)}<\\${f.text.slice(p+1)}`}}}t=a??t}return t}function g9r(e){return m(e,!0)}function m(e,n){let t=e.trimEnd(),s=t.length-E.length,o=ufn.test(e);if(!(s>0&&t.endsWith(E)&&(o||n&&O.test(e))))return aYe(e);let r=_(e.slice(1,s));return h.test(S(r))?aYe(e):`<${aYe(r)}${e.slice(s)}`}function _(e){let n=S(e);return n.replace(P,"")+e.slice(n.length)}function S(e){let n=e.indexOf(">");return n<0?e:e.slice(0,n)}
export{ioe,g9r};
