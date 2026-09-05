// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{M9a as N}from"/$bunfs/root/_483.js";import{ygb as x}from"/$bunfs/root/_500.js";import{Eyc as w}from"/$bunfs/root/_679.js";import{nzc as h}from"/$bunfs/root/_681.js";x();N();function B(e,n){let t=Math.max(1,Math.floor(n)||1),r=n>0?w(e,t,{hard:!0,trim:!1}):e,l=[],i=0,o=-1,d=r.split(`
`);for(let f=0;f<d.length;f++){let s=d[f]??"";if(s.length===0){if(o=e.indexOf(`
`,o+1),o!==-1){let c=o;l.push(p({text:s,startOffset:c,isPrecededByNewline:a(e,c,f===0),endsWithNewline:!0}))}else{let c=e.length;l.push(p({text:s,startOffset:c,isPrecededByNewline:a(e,c,f===0),endsWithNewline:!1}))}continue}let u=e.indexOf(s,i);if(u===-1){let c=i;l.push(p({text:s,startOffset:c,isPrecededByNewline:a(e,c,f===0),endsWithNewline:!1})),i=c+s.length;continue}i=u+s.length;let g=u+s.length,m=g<e.length&&e[g]===`
`;if(m)o=g;l.push(p({text:s,startOffset:u,isPrecededByNewline:a(e,u,f===0),endsWithNewline:m}))}return Object.freeze({text:e,columns:t,lines:Object.freeze(l)})}function W(e,n){let t=O(n,0,Math.max(0,e.lines.length-1));return e.lines[t]??{text:"",startOffset:0,isPrecededByNewline:!0,endsWithNewline:!1}}function M(e,n){if(e.lines.length===0)return{line:0,column:0};let t=O(n,0,e.text.length);for(let i=0;i<e.lines.length;i++){let o=e.lines[i],d=e.lines[i+1];if(t>=o.startOffset&&(!d||t<d.startOffset)){let f=t-o.startOffset,s;if(o.isPrecededByNewline)s=b(o.text,f);else{let u=o.text.length-o.text.trimStart().length;if(f<u)s=0;else s=b(o.text.slice(u),f-u)}return{line:i,column:s}}}let r=e.lines.length-1,l=e.lines[r];return{line:r,column:h(l.text)}}function A(e,n,t){if(e.lines.length===0)return 0;let r=W(e,n);if(r.text.length===0&&r.endsWithNewline)return r.startOffset;let l=r.isPrecededByNewline?0:r.text.length-r.text.trimStart().length,i=L(r.text.slice(l),Math.max(0,t))+l;return r.startOffset+i}function b(e,n){if(n<=0)return 0;if(n>=e.length)return h(e);return h(e.slice(0,n))}function L(e,n){if(n<=0||e.length===0)return 0;let t=0,r=0;for(let l of e){let i=h(l);if(t+i>n)break;t+=i,r+=l.length}return r}function a(e,n,t){if(t)return!0;return n>0&&e[n-1]===`
`}function p(e){return Object.freeze(e)}function O(e,n,t){return e<n?n:e>t?t:e}
export{B as or,M as pr,A as qr};
