// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{Xc}from"/$bunfs/root/chunk-wchdjfbm.js";import{St}from"/$bunfs/root/chunk-jvycdhmw.js";import{i}from"/$bunfs/root/chunk-74qghvre.js";import{ht,Iu,I}from"/$bunfs/root/chunk-btbsn9s4.js";import{$t}from"/$bunfs/root/chunk-7c2v1bj6.js";var u=1e4,a={auth:"teleport-org",timeout:u,headers:{"anthropic-beta":Xc}};function Pwe(){if(St())return!1;if(!$t("allow_team_onboarding"))return!1;if(!Iu())return!1;return I("tengu_flint_harbor_share",!1)}function o(e){if(!e.ok)throw Error(e.reason==="no-auth"?e.detail:`Onboarding guide unavailable: ${e.reason}`);return e.data}function t(){if(!$t("allow_team_onboarding"))throw Error("Onboarding guide unavailable: policy-disabled")}async function Yqn(e,n,r){t();let d=await ht.post("/api/organizations/:orgUUID/claude_code/onboarding",{content:e,name:n},{...a,credentials:r}),s=o(d);return i("tengu_team_onboarding_share_created",{}),s}async function sln(e,n,r){t();let d=await ht.put(`/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,{content:n},{...a,credentials:r}),s=o(d);return i("tengu_team_onboarding_share_updated",{}),s}async function Xqn(e,n){t();let r=await ht.delete(`/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,void 0,{...a,credentials:n});o(r),i("tengu_team_onboarding_share_deleted",{})}async function iln(e){t();let n=await ht.get("/api/organizations/:orgUUID/claude_code/onboarding",{...a,credentials:e});return o(n).guides}
export{Pwe,Yqn,sln,Xqn,iln};
