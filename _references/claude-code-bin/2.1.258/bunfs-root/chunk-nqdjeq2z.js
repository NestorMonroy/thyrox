// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{hf}from"/$bunfs/root/chunk-6tm4k51s.js";import{VHt}from"/$bunfs/root/chunk-5ka7q2fx.js";import{ms}from"/$bunfs/root/chunk-fq4s3y81.js";import{se}from"/$bunfs/root/chunk-z7cyba28.js";function C(t){if(t===9||t===10)return!1;return t<32||t>=127&&t<=159}function E(t){return t===1564||t>=8234&&t<=8238||t>=8294&&t<=8297}function D(t){return t===65038||t===65039}function L(t){return t>=55296&&t<=57343}function S(t){let n=t.codePointAt(0);if(t.length===1){if(n<=31)return 0;if(E(n))return 1}let r=se(t);return r===0?0:r===1?1:r}var f=4096,VNe=/\u2026 \[\+\d+ graphemes\]/,M=4064,T=256;function vtr(t){if(t.length<=f)return t;return t.split(`
`).map((n)=>{if(n.length<=f)return n;let r=[],e="";for(let{segment:o}of ms().segment(n))if(e.length>0&&e.length+o.length>T)r.push(e),e=o;else e+=o;if(e.length>0)r.push(e);return r.join(`
`)}).join(`
`)}function b(t){let n="",r=0;for(let{segment:e}of ms().segment(t)){n+=e;let o=se(n),s=o-r;if(r=o,s!==S(e))return!1}return!0}function P(t){let n="",r="",e=0;for(let{segment:o}of ms().segment(t)){r+=o;let s=se(r),i=s-e;e=s,n+=i===S(o)?o:"\uFFFD"}return n}function _(t){let n=t;for(let r=0;r<16;r++){if(b(n))return n;let e=P(n);if(e===n)break;n=e}if(b(n))return n;return[...ms().segment(n)].map(()=>"\uFFFD").join("")}function R(t,n){let r="";for(let{segment:e}of ms().segment(t)){if(r.length+e.length>n)break;r+=e}return r}function W(t){return H(t,M)}function H(t,n){let r=R(t,n);if(r.length>0)return r;let e=Math.min(n,t.length),o=t.charCodeAt(e-1);if(o>=55296&&o<=56319)e-=1;return t.slice(0,e)}var B=4*f*f,c=1024,U=64*c*c;function v(t){let n=B,r=U,e=(o)=>[...ms().segment(o)].length;return t.split(`
`).map((o)=>{if(o==="")return o;if(/^\u2026 \[\+\d+ graphemes\]$/.test(o))return o;let s=o.match(/\u2026 \[\+\d+ graphemes\]$/),i=s?s[0]:"",g=s?o.slice(0,o.length-i.length):o,l=g.length>f,a=l?W(g):g,h=l?`\u2026 [+${e(g.slice(a.length))} graphemes]`:"",m=a.length+h.length+i.length,p=m*m;if(p<=n)return n-=p,_(a)+h+i;let u=H(g,c),d=u.length<g.length?`\u2026 [+${e(g.slice(u.length))} graphemes]`:"",x=u.length+d.length+i.length,A=x*x;if(u.length>0&&A<=r)return r-=A,_(u)+d+i;return`\u2026 [+${e(g)} graphemes]`+i}).join(`
`)}function qB(t){for(let n=0;n<t.length;n++)if(C(t.charCodeAt(n)))return!1;return!0}function Si(t){return I(t,!0)}function I(t,n){let r="";for(let o of t){let s=o.codePointAt(0);if(D(s))continue;r+=C(s)||E(s)||L(s)?"\uFFFD":o}let e=VHt(r);return n?v(e):e}var N=/\p{DI}/gu;function QXe(t){return t.replace(N,"")}function b5(t){return I(QXe(hf(t)),!1)}
export{VNe,vtr,qB,Si,QXe,b5};
