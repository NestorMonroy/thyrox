// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{v}from"/$bunfs/root/chunk-ern0s5ks.js";import{d}from"/$bunfs/root/chunk-fmsbxtrp.js";import{fde,B8e}from"/$bunfs/root/chunk-m8ebe51k.js";import{rn,wC,b$}from"/$bunfs/root/chunk-5t3x93y6.js";import{SU,Sn,lpe}from"/$bunfs/root/chunk-3c2a5k9d.js";import{lstat as p,realpath as u,rm as m}from"fs/promises";import{basename as _,dirname as P,isAbsolute as y,join as a}from"path";var l=/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/,R=/^[a-z][a-z0-9-]{0,31}(?:\/[a-z0-9][a-z0-9_-]{0,63})?$/;function x4t(t){return a(t,fde,B8e)}function pl(t,r){let e=`${wC}${t}/${r}`;return l.test(t)&&R.test(r)&&b$(e)?e:null}var f="receiving";function bir(t,r){let e=`${wC}${f}/${t}/${String(r)}`;return l.test(t)&&Number.isSafeInteger(r)&&r>=0&&b$(e)?e:null}async function ipe(t,r){if(!l.test(r))return null;return c(t,`${wC}${r}/`)}async function c(t,r){let e=await Sn(t,["for-each-ref","--format=%(objectname) %(refname)",r]);if(e.exitCode!==0)return null;let o=e.stdout.split(`
`).filter((i)=>i!=="").map((i)=>{let[n="",s=""]=i.split(" ");return{name:s,id:n}}).filter((i)=>i.name.startsWith(r)&&b$(i.name));return o.every((i)=>rn.test(i.id))?o:null}async function Sir(t,r){let e=await ipe(t,r),o=e===null?null:await c(t,`${wC}${f}/${r}/`);if(e===null||o===null||!await lpe(t,[...e,...o].map((n)=>n.name)))return!1;let i=a(t.gitDir,...wC.split("/"),r);try{let[n,s]=await Promise.all([u(i),u(t.gitDir)]);if(n!==a(s,...wC.split("/"),r))return!1;return await m(n,{recursive:!0,force:!0}),!0}catch(n){return v(n)==="ENOENT"}}async function dwt(t,r,e,o=SU){await Sir({gitDir:t,sessionRoot:r,timeoutMs:o},e).catch(d)}
export{x4t,pl,bir,ipe,Sir,dwt};
