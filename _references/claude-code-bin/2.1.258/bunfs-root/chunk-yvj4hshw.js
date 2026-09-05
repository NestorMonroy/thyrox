// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{od}from"/$bunfs/root/chunk-twjxwmnx.js";import{kt}from"/$bunfs/root/chunk-hfch6q45.js";import{s}from"/$bunfs/root/chunk-62em4bpm.js";import{bt,yu,L}from"/$bunfs/root/chunk-8qt7d28b.js";import{Nt}from"/$bunfs/root/chunk-5t2y5d74.js";var u=1e4,a={auth:"teleport-org",timeout:u,headers:{"anthropic-beta":od}};function ebe(){if(kt())return!1;if(!Nt("allow_team_onboarding"))return!1;if(!yu())return!1;return L("tengu_flint_harbor_share",!1)}function o(e){if(!e.ok)throw Error(e.reason==="no-auth"?e.detail:`Onboarding guide unavailable: ${e.reason}`);return e.data}function t(){if(!Nt("allow_team_onboarding"))throw Error("Onboarding guide unavailable: policy-disabled")}async function RUn(e,n,r){t();let i=await bt.post("/api/organizations/:orgUUID/claude_code/onboarding",{content:e,name:n},{...a,credentials:r}),d=o(i);return s("tengu_team_onboarding_share_created",{}),d}async function Jnn(e,n,r){t();let i=await bt.put(`/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,{content:n},{...a,credentials:r}),d=o(i);return s("tengu_team_onboarding_share_updated",{}),d}async function xUn(e,n){t();let r=await bt.delete(`/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,void 0,{...a,credentials:n});o(r),s("tengu_team_onboarding_share_deleted",{})}async function Qnn(e){t();let n=await bt.get("/api/organizations/:orgUUID/claude_code/onboarding",{...a,credentials:e});return o(n).guides}
export{ebe,RUn,Jnn,xUn,Qnn};
