// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{VB}from"/$bunfs/root/chunk-xt60grfb.js";import{Pln}from"/$bunfs/root/chunk-2c4t9j03.js";import{k5e,dGn}from"/$bunfs/root/chunk-66e2m63c.js";import{cee}from"/$bunfs/root/chunk-wbbthbh9.js";var O=new RegExp(`^<${VB}[ \\t>]`),E=`</${VB}>`,d=["",`
`],P=/\sfrom-plugin\s*(?:=\s*(?:"[^"<>]*"|'[^'<>]*'|[^\s>]*))?/gi,h=/from-plugin/i;function kne(e,n){if(typeof e==="string")return m(e,n===cee);if(!Array.isArray(e))return e;let t=e;for(let s of d){let o=[],l=[],r="";t.forEach((i,u)=>{if(i.type==="text"){if(l.length>0)r+=s;o.push(r.length),l.push(u),r+=i.text}});let g=dGn(r),a;for(let i=g.length-1;i>=0;i--){let u=g[i],c=o.length-1;while(o[c]>u)c--;a??=t.slice();let f=a[l[c]];if(f.type==="text"){let p=u-o[c];a[l[c]]={...f,text:`${f.text.slice(0,p)}<\\${f.text.slice(p+1)}`}}}t=a??t}return t}function K4r(e){return m(e,!0)}function m(e,n){let t=e.trimEnd(),s=t.length-E.length,o=Pln.test(e);if(!(s>0&&t.endsWith(E)&&(o||n&&O.test(e))))return k5e(e);let r=_(e.slice(1,s));return h.test(S(r))?k5e(e):`<${k5e(r)}${e.slice(s)}`}function _(e){let n=S(e);return n.replace(P,"")+e.slice(n.length)}function S(e){let n=e.indexOf(">");return n<0?e:e.slice(0,n)}
export{kne,K4r};
