// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{jo}from"/$bunfs/root/chunk-ja309z9r.js";import{Et,Mn,fr}from"/$bunfs/root/chunk-27bj2wbx.js";import{ZJ}from"/$bunfs/root/chunk-fgs23952.js";import{Hte,fje,xX}from"/$bunfs/root/chunk-46z0b6ja.js";import{gEt}from"/$bunfs/root/chunk-z25v3qn6.js";import{e}from"/$bunfs/root/chunk-kd9k0apc.js";import{MPe,lnt,DPe}from"/$bunfs/root/chunk-7jr04rvf.js";var s=import.meta.require("/$bunfs/root/chunk-g9devpv8.js").ExtraUsageDialog;async function Jxe(u,n){let t=ZJ(u);if(s&&lnt())return e(s,{onDone:t});let o=await DPe({openInBrowser:!0},n.credentials);if(o.type==="message")return t(o.value),null;if(o.type==="confirm-admin-request"){if(Et())return t(MPe),null;return e(gEt,{extraUsage:o.extraUsage,wouldTakeAnswer:()=>!0,onDone:t})}let i=fr();if(i==="team"||i==="enterprise")return t(o.opened?`Opened ${o.url} in your browser to manage usage credits for your organization.`:`Visit ${o.url} to manage usage credits for your organization.`),null;if(!o.opened)return t(`Visit ${o.url} to manage usage credits.`),null;let r=Mn(),l=r&&{accountUuid:r.accountUuid,organizationUuid:r.organizationUuid},g=jo();return e(xX,{startingMessage:"Starting new login following /usage-credits. Exit with Ctrl-C to use existing account.",onDone:async(a,d,m)=>{let c=await Hte(n,a,{setAppState:m,previousAccount:l,previousGatewayAuth:g});t(...fje(n,a,c))}})}
export{Jxe};
