// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{SB}from"/$bunfs/root/chunk-0n80jtth.js";import{xsn}from"/$bunfs/root/chunk-jcesa5j7.js";import{XKe,U1n}from"/$bunfs/root/chunk-nnyew09e.js";import{cZ}from"/$bunfs/root/chunk-5khn4tvf.js";var O=new RegExp(`^<${SB}[ \\t>]`),E=`</${SB}>`,d=["",`
`],P=/\sfrom-plugin\s*(?:=\s*(?:"[^"<>]*"|'[^'<>]*'|[^\s>]*))?/gi,h=/from-plugin/i;function Ite(e,n){if(typeof e==="string")return m(e,n===cZ);if(!Array.isArray(e))return e;let t=e;for(let s of d){let o=[],l=[],r="";t.forEach((i,u)=>{if(i.type==="text"){if(l.length>0)r+=s;o.push(r.length),l.push(u),r+=i.text}});let g=U1n(r),a;for(let i=g.length-1;i>=0;i--){let u=g[i],c=o.length-1;while(o[c]>u)c--;a??=t.slice();let f=a[l[c]];if(f.type==="text"){let p=u-o[c];a[l[c]]={...f,text:`${f.text.slice(0,p)}<\\${f.text.slice(p+1)}`}}}t=a??t}return t}function tzr(e){return m(e,!0)}function m(e,n){let t=e.trimEnd(),s=t.length-E.length,o=xsn.test(e);if(!(s>0&&t.endsWith(E)&&(o||n&&O.test(e))))return XKe(e);let r=_(e.slice(1,s));return h.test(S(r))?XKe(e):`<${XKe(r)}${e.slice(s)}`}function _(e){let n=S(e);return n.replace(P,"")+e.slice(n.length)}function S(e){let n=e.indexOf(">");return n<0?e:e.slice(0,n)}
export{Ite,tzr};
