// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Uu}from"/$bunfs/root/chunk-dqhw8yqd.js";import{xt}from"/$bunfs/root/chunk-0n80jtth.js";import{i}from"/$bunfs/root/chunk-bh8vsyek.js";import{Op,At,x}from"/$bunfs/root/chunk-5khn4tvf.js";import{Xt}from"/$bunfs/root/chunk-649gsb4b.js";var u=1e4,a={auth:"teleport-org",timeout:u,headers:{"anthropic-beta":Uu}};function xUe(){if(xt())return!1;if(!Xt("allow_team_onboarding"))return!1;if(!Op())return!1;return x("tengu_flint_harbor_share",!1)}function o(e){if(!e.ok)throw Error(e.reason==="no-auth"?e.detail:`Onboarding guide unavailable: ${e.reason}`);return e.data}function t(){if(!Xt("allow_team_onboarding"))throw Error("Onboarding guide unavailable: policy-disabled")}async function zzr(e,n,r){t();let d=await At.post("/api/organizations/:orgUUID/claude_code/onboarding",{content:e,name:n},{...a,credentials:r}),s=o(d);return i("tengu_team_onboarding_share_created",{}),s}async function s9n(e,n,r){t();let d=await At.put(`/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,{content:n},{...a,credentials:r}),s=o(d);return i("tengu_team_onboarding_share_updated",{}),s}async function Vzr(e,n){t();let r=await At.delete(`/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,void 0,{...a,credentials:n});o(r),i("tengu_team_onboarding_share_deleted",{})}async function i9n(e){t();let n=await At.get("/api/organizations/:orgUUID/claude_code/onboarding",{...a,credentials:e});return o(n).guides}
export{xUe,zzr,s9n,Vzr,i9n};
