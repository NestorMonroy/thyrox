// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{Fc}from"/$bunfs/root/chunk-49q43dms.js";import{bt}from"/$bunfs/root/chunk-e1njvp95.js";import{i}from"/$bunfs/root/chunk-838r2s0v.js";import{ht,Su,I}from"/$bunfs/root/chunk-hyqdn9c0.js";import{Mt}from"/$bunfs/root/chunk-k6jfq7mw.js";var u=1e4,a={auth:"teleport-org",timeout:u,headers:{"anthropic-beta":Fc}};function Vbe(){if(bt())return!1;if(!Mt("allow_team_onboarding"))return!1;if(!Su())return!1;return I("tengu_flint_harbor_share",!1)}function o(e){if(!e.ok)throw Error(e.reason==="no-auth"?e.detail:`Onboarding guide unavailable: ${e.reason}`);return e.data}function t(){if(!Mt("allow_team_onboarding"))throw Error("Onboarding guide unavailable: policy-disabled")}async function r2n(e,n,r){t();let d=await ht.post("/api/organizations/:orgUUID/claude_code/onboarding",{content:e,name:n},{...a,credentials:r}),s=o(d);return i("tengu_team_onboarding_share_created",{}),s}async function Eon(e,n,r){t();let d=await ht.put(`/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,{content:n},{...a,credentials:r}),s=o(d);return i("tengu_team_onboarding_share_updated",{}),s}async function o2n(e,n){t();let r=await ht.delete(`/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,void 0,{...a,credentials:n});o(r),i("tengu_team_onboarding_share_deleted",{})}async function Aon(e){t();let n=await ht.get("/api/organizations/:orgUUID/claude_code/onboarding",{...a,credentials:e});return o(n).guides}
export{Vbe,r2n,Eon,o2n,Aon};
