// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{no}from"/$bunfs/root/chunk-hbjpbz2q.js";import{p}from"/$bunfs/root/chunk-159k5j1y.js";import{kn,or,Rt,R}from"/$bunfs/root/chunk-4hjp8tw4.js";import{u9}from"/$bunfs/root/chunk-e3s5xdjs.js";import{qpe,lZe,lse}from"/$bunfs/root/chunk-6s7t56d7.js";import{KVt,YVt}from"/$bunfs/root/chunk-jk1e7e6s.js";import{e}from"/$bunfs/root/chunk-9av83rwa.js";import{C2e,Lkt,Kse}from"/$bunfs/root/chunk-rwhq0v40.js";import{o,u,Bo,x}from"/$bunfs/root/chunk-cgbfr9c2.js";function a(){return o().regex(/^\P{Cc}*$/u)}var h=p(()=>Bo("mode",[u({mode:x("one_step")}),u({mode:x("confirm"),title:a().optional(),body:a().optional(),note:a().optional(),send:a().optional(),cancel:a().optional()})]));function n4t(){let i=R("tengu_tidy_lemon",null);if(i===null||i===void 0)return null;let r=h().safeParse(i);return r.success?r.data:null}async function mze(i,r){let n=u9(i);if(Lkt())return e(YVt,{onDone:n});let t=await Kse({openInBrowser:!0},r.credentials);if(t.type==="message")return n(t.value),null;if(t.type==="confirm-admin-request"){if(Rt())return n(C2e),null;return e(KVt,{extraUsage:t.extraUsage,flag:n4t(),wouldTakeAnswer:()=>!0,onDone:n})}let l=or();if(l==="team"||l==="enterprise")return n(t.opened?`Opened ${t.url} in your browser to manage usage credits for your organization.`:`Visit ${t.url} to manage usage credits for your organization.`),null;if(!t.opened)return n(`Visit ${t.url} to manage usage credits.`),null;let s=kn(),g=s&&{accountUuid:s.accountUuid,organizationUuid:s.organizationUuid},c=no();return e(lse,{startingMessage:"Starting new login following /usage-credits. Exit with Ctrl-C to use existing account.",onDone:async(m,A,d)=>{let f=await qpe(r,m,{setAppState:d,previousAccount:g,previousGatewayAuth:c});n(...lZe(r,m,f))}})}
export{n4t,mze};
