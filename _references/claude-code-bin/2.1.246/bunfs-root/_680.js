// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{xxd as h}from"/$bunfs/root/_837.js";function F(){if(!u)u=new Intl.DisplayNames(["en"],{type:"language"});return u}function s(){if(!l)l=new Intl.Segmenter(void 0,{granularity:"grapheme"});return l}function S(e){if(!e)return"";return s().segment(e)[Symbol.iterator]().next().value?.segment??""}function T(e){if(!e)return"";let t="";for(let{segment:r}of s().segment(e))t=r;return t}function D(e){if(!e)return 0;let t=0;for(let r of s().segment(e))t++;return t}function b(e){if(!e)return[];return Array.from(s().segment(e),(t)=>t.segment)}function y(){if(!m)m=new Intl.Segmenter(void 0,{granularity:"word"});return m}function x(e){let t=e.trim();if(t==="")return 0;let r=t.split(/\s+/).length,n=0;for(let i of y().segment(t))if(i.isWordLike)n++;return Math.max(r,n)}function N(e,t){let r=`${e}:${t}`,n=f.get(r);if(!n)n=new Intl.RelativeTimeFormat("en",{style:e,numeric:t}),f.set(r,n);return n}function v(){if(!g)g=Intl.DateTimeFormat().resolvedOptions().timeZone;return g}function L(){if(a===null)try{let e=Intl.DateTimeFormat().resolvedOptions().locale;a=new Intl.Locale(e).language}catch{a=void 0}return a}function I(e){if(!e)return"";let t=c.get(e);if(t!==void 0)return t;let r=Object.entries(e).sort(([i],[o])=>i<o?-1:i>o?1:0),n="";for(let[i,o]of r)n+=`${i}=${String(o)};`;return c.set(e,n),n}function k(e,t){let r=`${e??""}|${I(t)}`,n=p.get(r);if(!n)n=new Intl.DateTimeFormat(e,t),p.set(r,n);return n}function C(e,t){let r=`${e??""}|${I(t)}`,n=d.get(r);if(!n)n=new Intl.NumberFormat(e,t),d.set(r,n);return n}var l=null,m=null,u=null,f,g=null,a=null,c,p,d;var w=h(()=>{f=new Map;c=new WeakMap;p=new Map;d=new Map});
export{F as $yc,s as azc,S as bzc,T as czc,D as dzc,b as ezc,y as fzc,x as gzc,N as hzc,v as izc,L as jzc,k as kzc,C as lzc,w as mzc};
