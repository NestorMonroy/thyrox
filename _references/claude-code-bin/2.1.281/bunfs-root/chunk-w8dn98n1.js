// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{x,ke,le}from"/$bunfs/root/chunk-5khn4tvf.js";import{b,pe}from"/$bunfs/root/chunk-rnxz8hs2.js";import{i}from"/$bunfs/root/chunk-bh8vsyek.js";import{pg}from"/$bunfs/root/chunk-b93xrf5w.js";import{ye,sn}from"/$bunfs/root/chunk-pw35yar9.js";import{XD}from"/$bunfs/root/chunk-tjyxmda2.js";function uKn(u,{requireOnboarding:r=!0}={}){let o=le();if(r&&!o.hasCompletedOnboarding||o.hasSeenAutoDefaultNudge||!x("tengu_maple_pier",!1))return null;let e=ye("userSettings")?.permissions?.defaultMode,t=["projectSettings","localSettings","flagSettings","policySettings"].some((n)=>ye(n)?.permissions?.defaultMode);if(e&&e!=="auto"&&!t&&XD(u))return e;return null}function pKn(u,r,o){if(le().hasSeenAutoDefaultNudge)return;let e=pg(r.current_mode);if(u==="shown"){i("tengu_auto_default_nudge_shown",{current_mode:pe(e),surface:b("ide")});return}let t=r.choice==="accept"?"accept":"decline";if(t==="accept")sn("userSettings",{permissions:{defaultMode:"auto"}},void 0,o);ke((n)=>n.hasSeenAutoDefaultNudge?n:{...n,hasSeenAutoDefaultNudge:!0},o),i("tengu_auto_default_nudge_resolved",{choice:b(t),outcome:t==="accept"?b("switched"):b("declined"),current_mode:pe(e),surface:b("ide")})}
export{uKn,pKn};
