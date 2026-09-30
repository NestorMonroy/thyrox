// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{v}from"/$bunfs/root/chunk-dw9y6h6j.js";import{u}from"/$bunfs/root/chunk-xt60grfb.js";import{E$e}from"/$bunfs/root/chunk-36kx407g.js";import{Zt,YA,lN}from"/$bunfs/root/chunk-ga02wneq.js";import{iF,_n,pde}from"/$bunfs/root/chunk-h7ycz4rf.js";import{lstat as _,realpath as c,rm as R}from"fs/promises";import{basename as y,dirname as N,isAbsolute as T,join as a}from"path";var E="side.git",l=/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/,g=/^[a-z][a-z0-9-]{0,31}(?:\/[a-z0-9][a-z0-9_-]{0,63})?$/;function K2t(t){return a(t,E$e,E)}function Pl(t,r){let e=`${YA}${t}/${r}`;return l.test(t)&&g.test(r)&&lN(e)?e:null}var f="receiving";function ber(t,r){let e=`${YA}${f}/${t}/${String(r)}`;return l.test(t)&&Number.isSafeInteger(r)&&r>=0&&lN(e)?e:null}async function dde(t,r){if(!l.test(r))return null;return m(t,`${YA}${r}/`)}async function m(t,r){let e=await _n(t,["for-each-ref","--format=%(objectname) %(refname)",r]);if(e.exitCode!==0)return null;let o=e.stdout.split(`
`).filter((i)=>i!=="").map((i)=>{let[n="",s=""]=i.split(" ");return{name:s,id:n}}).filter((i)=>i.name.startsWith(r)&&lN(i.name));return o.every((i)=>Zt.test(i.id))?o:null}async function Ser(t,r){let e=await dde(t,r),o=e===null?null:await m(t,`${YA}${f}/${r}/`);if(e===null||o===null||!await pde(t,[...e,...o].map((n)=>n.name)))return!1;let i=a(t.gitDir,...YA.split("/"),r);try{let[n,s]=await Promise.all([c(i),c(t.gitDir)]);if(n!==a(s,...YA.split("/"),r))return!1;return await R(n,{recursive:!0,force:!0}),!0}catch(n){return v(n)==="ENOENT"}}async function y_t(t,r,e,o=iF){await Ser({gitDir:t,sessionRoot:r,timeoutMs:o},e).catch(u)}
export{K2t,Pl,ber,dde,Ser,y_t};
