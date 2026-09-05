// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
var s=null,l=null,m=null;function Wlr(){if(!m)m=new Intl.DisplayNames(["en"],{type:"language"});return m}function Ys(){if(!s)s=new Intl.Segmenter(void 0,{granularity:"grapheme"});return s}function PCe(e){if(!e)return"";return Ys().segment(e)[Symbol.iterator]().next().value?.segment??""}function EN(e){if(!e)return"";let t="";for(let{segment:r}of Ys().segment(e))t=r;return t}function z1(e){if(!e)return 0;let t=0;for(let r of Ys().segment(e))t++;return t}function qK(e){if(!e)return[];return Array.from(Ys().segment(e),(t)=>t.segment)}function HLn(){if(!l)l=new Intl.Segmenter(void 0,{granularity:"word"});return l}function Vlr(e){let t=e.trim();if(t==="")return 0;let r=t.split(/\s+/).length,n=0;for(let i of HLn().segment(t))if(i.isWordLike)n++;return Math.max(r,n)}var g=new Map;function wLn(e,t){let r=`${e}:${t}`,n=g.get(r);if(!n)n=new Intl.RelativeTimeFormat("en",{style:e,numeric:t}),g.set(r,n);return n}var u=null;function ELn(){if(!u)u=Intl.DateTimeFormat().resolvedOptions().timeZone;return u}var a=null;function qlr(){if(a===null)try{let e=Intl.DateTimeFormat().resolvedOptions().locale;a=new Intl.Locale(e).language}catch{a=void 0}return a}var f=new WeakMap;function d(e){if(!e)return"";let t=f.get(e);if(t!==void 0)return t;let r=Object.entries(e).sort(([i],[o])=>i<o?-1:i>o?1:0),n="";for(let[i,o]of r)n+=`${i}=${String(o)};`;return f.set(e,n),n}var c=new Map;function FQ(e,t){return t?{...e,timeZone:t}:e}function KK(e,t){let r=`${e??""}|${d(t)}`,n=c.get(r);if(!n)n=new Intl.DateTimeFormat(e,t),c.set(r,n);return n}var p=new Map;function Klr(e,t){let r=`${e??""}|${d(t)}`,n=p.get(r);if(!n)n=new Intl.NumberFormat(e,t),p.set(r,n);return n}
export{Wlr,Ys,PCe,EN,z1,qK,HLn,Vlr,wLn,ELn,qlr,FQ,KK,Klr};
