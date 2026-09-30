// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Qs}from"/$bunfs/root/chunk-dw9y6h6j.js";import{q}from"/$bunfs/root/chunk-ghdfdc8h.js";import{Td}from"/$bunfs/root/chunk-esvkqvk3.js";import{At}from"/$bunfs/root/chunk-wbbthbh9.js";import{Efe,FNn,UNn,KQ,mtn,Zgo,eho}from"/$bunfs/root/chunk-a7qs06gr.js";import{writeFile as u}from"fs/promises";var p=30000,k=300000,m=Efe,f=16777216,a="/api/oauth/organizations/:orgUUID/skills/list-skills?include_wiggle_skills=true";async function uSt(s={}){let e=await c(s);if(!e.success&&KQ(e))return c(s);return e}async function c(s){let e=Td(),o=e?`${a}&entrypoint=${encodeURIComponent(e)}`:a;try{let t=await At.get(o,{auth:"teleport-org",isBackground:s.isBackground,timeout:p,maxContentLength:f,credentials:s.credentials});if(!t.ok||!Array.isArray(t.data?.skills))return FNn("skills",t);return{success:!0,skills:t.data.skills.filter(eho).map(Zgo)}}catch(t){return UNn(t)}}async function AJr(s,e,o,t={}){let l=Td(),i=[];if(l)i.push(`entrypoint=${encodeURIComponent(l)}`);if(o)i.push(`version=${encodeURIComponent(o)}`);let d=i.length>0?`?${i.join("&")}`:"";try{let n=await At.get(`/api/oauth/organizations/:orgUUID/skills/${encodeURIComponent(s)}/download${d}`,{auth:"teleport-org",isBackground:t.isBackground,timeout:k,responseType:"arraybuffer",maxContentLength:m,credentials:t.credentials});if(!n.ok||!n.data)return q("warn","skills_sync_download_not_ok",{reason:n.ok?"empty_body":n.reason}),!1;let r=Buffer.from(n.data);if(r.length<2||r[0]!==80||r[1]!==75)return q("warn","skills_sync_download_not_zip",{serverError:mtn(r),bodyLen:r.length}),!1;return await u(e,r),!0}catch(n){let{kind:r}=Qs(n);return q("warn","skills_sync_download_exception",{kind:r}),!1}}
export{uSt,AJr};
