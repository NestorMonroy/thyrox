// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{rd}from"/$bunfs/root/chunk-hxy982f9.js";import{kt}from"/$bunfs/root/chunk-b565vq97.js";import{i}from"/$bunfs/root/chunk-qpc977f4.js";import{Ct,Qd,I}from"/$bunfs/root/chunk-27bj2wbx.js";import{Yt}from"/$bunfs/root/chunk-vh7s70pn.js";var u=1e4,a={auth:"teleport-org",timeout:u,headers:{"anthropic-beta":rd}};function PPe(){if(kt())return!1;if(!Yt("allow_team_onboarding"))return!1;if(!Qd())return!1;return I("tengu_flint_harbor_share",!1)}function o(e){if(!e.ok)throw Error(e.reason==="no-auth"?e.detail:`Onboarding guide unavailable: ${e.reason}`);return e.data}function t(){if(!Yt("allow_team_onboarding"))throw Error("Onboarding guide unavailable: policy-disabled")}async function syr(e,n,r){t();let d=await Ct.post("/api/organizations/:orgUUID/claude_code/onboarding",{content:e,name:n},{...a,credentials:r}),s=o(d);return i("tengu_team_onboarding_share_created",{}),s}async function RHn(e,n,r){t();let d=await Ct.put(`/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,{content:n},{...a,credentials:r}),s=o(d);return i("tengu_team_onboarding_share_updated",{}),s}async function iyr(e,n){t();let r=await Ct.delete(`/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,void 0,{...a,credentials:n});o(r),i("tengu_team_onboarding_share_deleted",{})}async function xHn(e){t();let n=await Ct.get("/api/organizations/:orgUUID/claude_code/onboarding",{...a,credentials:e});return o(n).guides}
export{PPe,syr,RHn,iyr,xHn};
