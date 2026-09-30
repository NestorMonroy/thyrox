// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{yd}from"/$bunfs/root/chunk-ebf04mp3.js";import{Ct}from"/$bunfs/root/chunk-gh1pqen9.js";import{i}from"/$bunfs/root/chunk-bkjq2ptm.js";import{Tt,ap,I}from"/$bunfs/root/chunk-xbd48fav.js";import{Vt}from"/$bunfs/root/chunk-96tx2e97.js";var u=1e4,a={auth:"teleport-org",timeout:u,headers:{"anthropic-beta":yd}};function d0e(){if(Ct())return!1;if(!Vt("allow_team_onboarding"))return!1;if(!ap())return!1;return I("tengu_flint_harbor_share",!1)}function o(e){if(!e.ok)throw Error(e.reason==="no-auth"?e.detail:`Onboarding guide unavailable: ${e.reason}`);return e.data}function t(){if(!Vt("allow_team_onboarding"))throw Error("Onboarding guide unavailable: policy-disabled")}async function Rvr(e,n,r){t();let d=await Tt.post("/api/organizations/:orgUUID/claude_code/onboarding",{content:e,name:n},{...a,credentials:r}),s=o(d);return i("tengu_team_onboarding_share_created",{}),s}async function XDn(e,n,r){t();let d=await Tt.put(`/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,{content:n},{...a,credentials:r}),s=o(d);return i("tengu_team_onboarding_share_updated",{}),s}async function xvr(e,n){t();let r=await Tt.delete(`/api/organizations/:orgUUID/claude_code/onboarding/${encodeURIComponent(e)}`,void 0,{...a,credentials:n});o(r),i("tengu_team_onboarding_share_deleted",{})}async function JDn(e){t();let n=await Tt.get("/api/organizations/:orgUUID/claude_code/onboarding",{...a,credentials:e});return o(n).guides}
export{d0e,Rvr,XDn,xvr,JDn};
