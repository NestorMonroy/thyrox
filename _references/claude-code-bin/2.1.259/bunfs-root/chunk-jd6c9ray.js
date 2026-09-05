// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{md}from"/$bunfs/root/chunk-m7w5m1w6.js";import{vt}from"/$bunfs/root/chunk-6rkpsn9e.js";import{s}from"/$bunfs/root/chunk-9f9fskgc.js";import{bt,Cu,L}from"/$bunfs/root/chunk-x722nt0q.js";import{Ft}from"/$bunfs/root/chunk-1qpkzqbm.js";var u=1e4,a={auth:"teleport-org",timeout:u,headers:{"anthropic-beta":md}};function uSe(){if(vt())return!1;if(!Ft("allow_team_onboarding"))return!1;if(!Cu())return!1;return L("tengu_flint_harbor_share",!1)}function o(e){if(!e.ok)throw Error(e.reason==="no-auth"?e.detail:`Onboarding guide unavailable: ${e.reason}`);return e.data}function t(){if(!Ft("allow_team_onboarding"))throw Error("Onboarding guide unavailable: policy-disabled")}async function VGn(e,n,r){t();let i=await bt.post("/api/organizations/:orgUUID/claude_code/onboarding",{content:e,name:n},{...a,credentials:r}),d=o(i);return s("tengu_team_onboarding_share_created",{}),d}async function jin(e,n,r){t();let i=await bt.put(`/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,{content:n},{...a,credentials:r}),d=o(i);return s("tengu_team_onboarding_share_updated",{}),d}async function qGn(e,n){t();let r=await bt.delete(`/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,void 0,{...a,credentials:n});o(r),s("tengu_team_onboarding_share_deleted",{})}async function Gin(e){t();let n=await bt.get("/api/organizations/:orgUUID/claude_code/onboarding",{...a,credentials:e});return o(n).guides}
export{uSe,VGn,jin,qGn,Gin};
