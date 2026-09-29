// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{v}from"/$bunfs/root/chunk-31aa9k3a.js";import{d}from"/$bunfs/root/chunk-320rdak1.js";import{due,_Xe}from"/$bunfs/root/chunk-hqy3a2gr.js";import{nn,DC,Y$}from"/$bunfs/root/chunk-45s965ek.js";import{UU,gn,rfe}from"/$bunfs/root/chunk-hh5hs9x1.js";import{lstat as p,realpath as u,rm as m}from"fs/promises";import{basename as _,dirname as P,isAbsolute as y,join as a}from"path";var l=/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/,R=/^[a-z][a-z0-9-]{0,31}(?:\/[a-z0-9][a-z0-9_-]{0,63})?$/;function u6t(t){return a(t,due,_Xe)}function ba(t,r){let e=`${DC}${t}/${r}`;return l.test(t)&&R.test(r)&&Y$(e)?e:null}var f="receiving";function rdr(t,r){let e=`${DC}${f}/${t}/${String(r)}`;return l.test(t)&&Number.isSafeInteger(r)&&r>=0&&Y$(e)?e:null}async function jQ(t,r){if(!l.test(r))return null;return c(t,`${DC}${r}/`)}async function c(t,r){let e=await gn(t,["for-each-ref","--format=%(objectname) %(refname)",r]);if(e.exitCode!==0)return null;let o=e.stdout.split(`
`).filter((i)=>i!=="").map((i)=>{let[n="",s=""]=i.split(" ");return{name:s,id:n}}).filter((i)=>i.name.startsWith(r)&&Y$(i.name));return o.every((i)=>nn.test(i.id))?o:null}async function odr(t,r){let e=await jQ(t,r),o=e===null?null:await c(t,`${DC}${f}/${r}/`);if(e===null||o===null||!await rfe(t,[...e,...o].map((n)=>n.name)))return!1;let i=a(t.gitDir,...DC.split("/"),r);try{let[n,s]=await Promise.all([u(i),u(t.gitDir)]);if(n!==a(s,...DC.split("/"),r))return!1;return await m(n,{recursive:!0,force:!0}),!0}catch(n){return v(n)==="ENOENT"}}async function SEt(t,r,e,o=UU){await odr({gitDir:t,sessionRoot:r,timeoutMs:o},e).catch(d)}
export{u6t,ba,rdr,jQ,odr,SEt};
