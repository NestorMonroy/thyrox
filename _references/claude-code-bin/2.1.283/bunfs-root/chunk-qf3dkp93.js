// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Xs}from"/$bunfs/root/chunk-ern0s5ks.js";import{K}from"/$bunfs/root/chunk-4v1yym3m.js";import{Nd}from"/$bunfs/root/chunk-jwddn0q9.js";import{Mt}from"/$bunfs/root/chunk-t6pwageh.js";import{Ege,ijn,ajn,Cee,Bsn,cTo,dTo}from"/$bunfs/root/chunk-dt8hdjgq.js";import{writeFile as u}from"fs/promises";var p=30000,k=300000,m=Ege,f=16777216,a="/api/oauth/organizations/:orgUUID/skills/list-skills?include_wiggle_skills=true";async function hEt(s={}){let e=await c(s);if(!e.success&&Cee(e))return c(s);return e}async function c(s){let e=Nd(),o=e?`${a}&entrypoint=${encodeURIComponent(e)}`:a;try{let t=await Mt.get(o,{auth:"teleport-org",isBackground:s.isBackground,timeout:p,maxContentLength:f,credentials:s.credentials});if(!t.ok||!Array.isArray(t.data?.skills))return ijn("skills",t);return{success:!0,skills:t.data.skills.filter(dTo).map(cTo)}}catch(t){return ajn(t)}}async function _so(s,e,o,t={}){let l=Nd(),i=[];if(l)i.push(`entrypoint=${encodeURIComponent(l)}`);if(o)i.push(`version=${encodeURIComponent(o)}`);let d=i.length>0?`?${i.join("&")}`:"";try{let n=await Mt.get(`/api/oauth/organizations/:orgUUID/skills/${encodeURIComponent(s)}/download${d}`,{auth:"teleport-org",isBackground:t.isBackground,timeout:k,responseType:"arraybuffer",maxContentLength:m,credentials:t.credentials});if(!n.ok||!n.data)return K("warn","skills_sync_download_not_ok",{reason:n.ok?"empty_body":n.reason}),!1;let r=Buffer.from(n.data);if(r.length<2||r[0]!==80||r[1]!==75)return K("warn","skills_sync_download_not_zip",{serverError:Bsn(r),bodyLen:r.length}),!1;return await u(e,r),!0}catch(n){let{kind:r}=Xs(n);return K("warn","skills_sync_download_exception",{kind:r}),!1}}
export{hEt,_so};
