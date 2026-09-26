// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{ep}from"/$bunfs/root/chunk-d6bkh9x7.js";import{Rt}from"/$bunfs/root/chunk-xt60grfb.js";import{i}from"/$bunfs/root/chunk-hm522bzh.js";import{jp,At,x}from"/$bunfs/root/chunk-wbbthbh9.js";import{Xt}from"/$bunfs/root/chunk-79j763ea.js";var u=1e4,a={auth:"teleport-org",timeout:u,headers:{"anthropic-beta":ep}};function s1e(){if(Rt())return!1;if(!Xt("allow_team_onboarding"))return!1;if(!jp())return!1;return x("tengu_flint_harbor_share",!1)}function o(e){if(!e.ok)throw Error(e.reason==="no-auth"?e.detail:`Onboarding guide unavailable: ${e.reason}`);return e.data}function t(){if(!Xt("allow_team_onboarding"))throw Error("Onboarding guide unavailable: policy-disabled")}async function F5r(e,n,r){t();let d=await At.post("/api/organizations/:orgUUID/claude_code/onboarding",{content:e,name:n},{...a,credentials:r}),s=o(d);return i("tengu_team_onboarding_share_created",{}),s}async function lQn(e,n,r){t();let d=await At.put(`/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,{content:n},{...a,credentials:r}),s=o(d);return i("tengu_team_onboarding_share_updated",{}),s}async function U5r(e,n){t();let r=await At.delete(`/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,void 0,{...a,credentials:n});o(r),i("tengu_team_onboarding_share_deleted",{})}async function cQn(e){t();let n=await At.get("/api/organizations/:orgUUID/claude_code/onboarding",{...a,credentials:e});return o(n).guides}
export{s1e,F5r,lQn,U5r,cQn};
