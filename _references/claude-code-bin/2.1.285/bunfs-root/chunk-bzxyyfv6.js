// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Qr}from"/$bunfs/root/chunk-bxhyh54r.js";import{p}from"/$bunfs/root/chunk-z10rc4tf.js";import{kn,sr,At,x}from"/$bunfs/root/chunk-f74xvn8g.js";import{F8}from"/$bunfs/root/chunk-8p9hrr80.js";import{lpe,x7e,xoe}from"/$bunfs/root/chunk-ymxf0ken.js";import{M2t,D2t}from"/$bunfs/root/chunk-t63yxy8j.js";import{e}from"/$bunfs/root/chunk-ne6sbmea.js";import{d2e,$vt,mse}from"/$bunfs/root/chunk-atmwgxhv.js";import{o,d,$o,R}from"/$bunfs/root/chunk-ea52y7e7.js";function a(){return o().regex(/^\P{Cc}*$/u)}var h=p(()=>$o("mode",[d({mode:R("one_step")}),d({mode:R("confirm"),title:a().optional(),body:a().optional(),note:a().optional(),send:a().optional(),cancel:a().optional()})]));function BVt(){let i=x("tengu_tidy_lemon",null);if(i===null||i===void 0)return null;let r=h().safeParse(i);return r.success?r.data:null}async function nWe(i,r){let n=F8(i);if($vt())return e(D2t,{onDone:n});let t=await mse({openInBrowser:!0},r.credentials);if(t.type==="message")return n(t.value),null;if(t.type==="confirm-admin-request"){if(At())return n(d2e),null;return e(M2t,{extraUsage:t.extraUsage,flag:BVt(),wouldTakeAnswer:()=>!0,onDone:n})}let l=sr();if(l==="team"||l==="enterprise")return n(t.opened?`Opened ${t.url} in your browser to manage usage credits for your organization.`:`Visit ${t.url} to manage usage credits for your organization.`),null;if(!t.opened)return n(`Visit ${t.url} to manage usage credits.`),null;let s=kn(),m=s&&{accountUuid:s.accountUuid,organizationUuid:s.organizationUuid},g=Qr();return e(xoe,{startingMessage:"Starting new login following /usage-credits. Exit with Ctrl-C to use existing account.",onDone:async(u,A,c)=>{let f=await lpe(r,u,{setAppState:c,previousAccount:m,previousGatewayAuth:g});n(...x7e(r,u,f))}})}
export{BVt,nWe};
