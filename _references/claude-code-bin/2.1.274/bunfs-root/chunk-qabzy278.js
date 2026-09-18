// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{j}from"/$bunfs/root/chunk-3btyksgt.js";import{An}from"/$bunfs/root/chunk-dz2zqf8q.js";import{w,J,t}from"/$bunfs/root/chunk-r2c9k9kh.js";import{mkdir as g,readFile as P}from"fs/promises";import{dirname as S}from"path";function gW(e,f,c){let{defaultValue:a,mode:T,ensureDir:s=!1,indent:p,trailingNewline:y=!1}=c;function u(){return b(a)?a():a}async function m(){let n;try{n=await P(e,"utf8")}catch(i){if(j(i))return u();throw i}let r;try{r=J(n)}catch(i){return t(`jsonStore: ${e} is not valid JSON: ${i}`,{level:"warn"}),u()}let o=f().safeParse(r);if(!o.success)return t(`jsonStore: ${e} failed schema validation: ${o.error.message}`,{level:"warn"}),u();return o.data}async function d(n){if(s!==!1)await g(S(e),{recursive:!0,mode:s===!0?void 0:s.mode});let r=w(n,null,p)+(y?`
`:"");await An(e,r,T)}let l=Promise.resolve();function v(n){let r=l.then(async()=>{let o=n(await m());return await d(o),o});return l=r.then(()=>{return},()=>{return}),r}return{path(){return e},read:m,write:d,update:v}}function b(e){return typeof e==="function"}
export{gW};
