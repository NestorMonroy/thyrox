// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{v}from"/$bunfs/root/chunk-2bj5eqbj.js";import{u}from"/$bunfs/root/chunk-0n80jtth.js";import{YLe}from"/$bunfs/root/chunk-xe0dn6dd.js";import{Jt,xA,$L}from"/$bunfs/root/chunk-adsaemws.js";import{U$,yn,uce}from"/$bunfs/root/chunk-eg19c7dp.js";import{lstat as _,realpath as c,rm as R}from"fs/promises";import{basename as y,dirname as N,isAbsolute as T,join as a}from"path";var E="side.git",l=/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/,g=/^[a-z][a-z0-9-]{0,31}(?:\/[a-z0-9][a-z0-9_-]{0,63})?$/;function f2t(t){return a(t,YLe,E)}function Cl(t,r){let e=`${xA}${t}/${r}`;return l.test(t)&&g.test(r)&&$L(e)?e:null}var f="receiving";function pJn(t,r){let e=`${xA}${f}/${t}/${String(r)}`;return l.test(t)&&Number.isSafeInteger(r)&&r>=0&&$L(e)?e:null}async function cce(t,r){if(!l.test(r))return null;return m(t,`${xA}${r}/`)}async function m(t,r){let e=await yn(t,["for-each-ref","--format=%(objectname) %(refname)",r]);if(e.exitCode!==0)return null;let o=e.stdout.split(`
`).filter((i)=>i!=="").map((i)=>{let[n="",s=""]=i.split(" ");return{name:s,id:n}}).filter((i)=>i.name.startsWith(r)&&$L(i.name));return o.every((i)=>Jt.test(i.id))?o:null}async function fJn(t,r){let e=await cce(t,r),o=e===null?null:await m(t,`${xA}${f}/${r}/`);if(e===null||o===null||!await uce(t,[...e,...o].map((n)=>n.name)))return!1;let i=a(t.gitDir,...xA.split("/"),r);try{let[n,s]=await Promise.all([c(i),c(t.gitDir)]);if(n!==a(s,...xA.split("/"),r))return!1;return await R(n,{recursive:!0,force:!0}),!0}catch(n){return v(n)==="ENOENT"}}async function Tht(t,r,e,o=U$){await fJn({gitDir:t,sessionRoot:r,timeoutMs:o},e).catch(u)}
export{f2t,Cl,pJn,cce,fJn,Tht};
