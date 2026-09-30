// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{up}from"/$bunfs/root/chunk-djetmnb8.js";import{Pt}from"/$bunfs/root/chunk-fmsbxtrp.js";import{i}from"/$bunfs/root/chunk-ab7mw5d9.js";import{rf,Mt,x}from"/$bunfs/root/chunk-t6pwageh.js";import{Xt}from"/$bunfs/root/chunk-7y2gzc5g.js";var u=1e4,a={auth:"teleport-org",timeout:u,headers:{"anthropic-beta":up}};function _We(){if(Pt())return!1;if(!Xt("allow_team_onboarding"))return!1;if(!rf())return!1;return x("tengu_flint_harbor_share",!1)}function o(e){if(!e.ok)throw Error(e.reason==="no-auth"?e.detail:`Onboarding guide unavailable: ${e.reason}`);return e.data}function t(){if(!Xt("allow_team_onboarding"))throw Error("Onboarding guide unavailable: policy-disabled")}async function cQr(e,n,r){t();let d=await Mt.post("/api/organizations/:orgUUID/claude_code/onboarding",{content:e,name:n},{...a,credentials:r}),s=o(d);return i("tengu_team_onboarding_share_created",{}),s}async function Cor(e,n,r){t();let d=await Mt.put(`/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,{content:n},{...a,credentials:r}),s=o(d);return i("tengu_team_onboarding_share_updated",{}),s}async function dQr(e,n){t();let r=await Mt.delete(`/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,void 0,{...a,credentials:n});o(r),i("tengu_team_onboarding_share_deleted",{})}async function Ror(e){t();let n=await Mt.get("/api/organizations/:orgUUID/claude_code/onboarding",{...a,credentials:e});return o(n).guides}
export{_We,cQr,Cor,dQr,Ror};
