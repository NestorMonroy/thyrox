// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Ap}from"/$bunfs/root/chunk-yr0jgjsq.js";import{Ct}from"/$bunfs/root/chunk-320rdak1.js";import{i}from"/$bunfs/root/chunk-wt82nr44.js";import{mf,Nt,x}from"/$bunfs/root/chunk-swk3rjnt.js";import{Qt}from"/$bunfs/root/chunk-26awea5d.js";var u=1e4,a={auth:"teleport-org",timeout:u,headers:{"anthropic-beta":Ap}};function UGe(){if(Ct())return!1;if(!Qt("allow_team_onboarding"))return!1;if(!mf())return!1;return x("tengu_flint_harbor_share",!1)}function o(e){if(!e.ok)throw Error(e.reason==="no-auth"?e.detail:`Onboarding guide unavailable: ${e.reason}`);return e.data}function t(){if(!Qt("allow_team_onboarding"))throw Error("Onboarding guide unavailable: policy-disabled")}async function Tno(e,n,r){t();let d=await Nt.post("/api/organizations/:orgUUID/claude_code/onboarding",{content:e,name:n},{...a,credentials:r}),s=o(d);return i("tengu_team_onboarding_share_created",{}),s}async function plr(e,n,r){t();let d=await Nt.put(`/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,{content:n},{...a,credentials:r}),s=o(d);return i("tengu_team_onboarding_share_updated",{}),s}async function Ano(e,n){t();let r=await Nt.delete(`/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,void 0,{...a,credentials:n});o(r),i("tengu_team_onboarding_share_deleted",{})}async function flr(e){t();let n=await Nt.get("/api/organizations/:orgUUID/claude_code/onboarding",{...a,credentials:e});return o(n).guides}
export{UGe,Tno,plr,Ano,flr};
