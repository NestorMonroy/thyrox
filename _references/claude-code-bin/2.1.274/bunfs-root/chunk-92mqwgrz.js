// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{I,ke,ie}from"/$bunfs/root/chunk-27bj2wbx.js";import{b,ge}from"/$bunfs/root/chunk-64dkx51v.js";import{i}from"/$bunfs/root/chunk-qpc977f4.js";import{Xm}from"/$bunfs/root/chunk-q77993h4.js";import{me,Zt}from"/$bunfs/root/chunk-m0am9fba.js";import{Q1}from"/$bunfs/root/chunk-yjs9sj9g.js";function VAn(u,{requireOnboarding:r=!0}={}){let o=ie();if(r&&!o.hasCompletedOnboarding||o.hasSeenAutoDefaultNudge||!I("tengu_maple_pier",!1))return null;let e=me("userSettings")?.permissions?.defaultMode,t=["projectSettings","localSettings","flagSettings","policySettings"].some((n)=>me(n)?.permissions?.defaultMode);if(e&&e!=="auto"&&!t&&Q1(u))return e;return null}function KAn(u,r,o){if(ie().hasSeenAutoDefaultNudge)return;let e=Xm(r.current_mode);if(u==="shown"){i("tengu_auto_default_nudge_shown",{current_mode:ge(e),surface:b("ide")});return}let t=r.choice==="accept"?"accept":"decline";if(t==="accept")Zt("userSettings",{permissions:{defaultMode:"auto"}},void 0,o);ke((n)=>n.hasSeenAutoDefaultNudge?n:{...n,hasSeenAutoDefaultNudge:!0},o),i("tengu_auto_default_nudge_resolved",{choice:b(t),outcome:t==="accept"?b("switched"):b("declined"),current_mode:ge(e),surface:b("ide")})}
export{VAn,KAn};
