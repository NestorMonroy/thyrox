// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{L,we,ie}from"/$bunfs/root/chunk-x722nt0q.js";import{S,Ce}from"/$bunfs/root/chunk-97tbrkcc.js";import{s}from"/$bunfs/root/chunk-9f9fskgc.js";import{Se,nn}from"/$bunfs/root/chunk-67nd7etf.js";import{Hp}from"/$bunfs/root/chunk-rahwxqh8.js";import{oz}from"/$bunfs/root/chunk-pdmwvjbx.js";function iZt(u,{requireOnboarding:r=!0}={}){let o=ie();if(r&&!o.hasCompletedOnboarding||o.hasSeenAutoDefaultNudge||!L("tengu_maple_pier",!1))return null;let e=Se("userSettings")?.permissions?.defaultMode,t=["projectSettings","localSettings","flagSettings","policySettings"].some((n)=>Se(n)?.permissions?.defaultMode);if(e&&e!=="auto"&&!t&&oz(u))return e;return null}function sZt(u,r,o){if(ie().hasSeenAutoDefaultNudge)return;let e=Hp(r.current_mode);if(u==="shown"){s("tengu_auto_default_nudge_shown",{current_mode:Ce(e),surface:S("ide")});return}let t=r.choice==="accept"?"accept":"decline";if(t==="accept")nn("userSettings",{permissions:{defaultMode:"auto"}},void 0,o);we((n)=>n.hasSeenAutoDefaultNudge?n:{...n,hasSeenAutoDefaultNudge:!0},o),s("tengu_auto_default_nudge_resolved",{choice:S(t),outcome:t==="accept"?S("switched"):S("declined"),current_mode:Ce(e),surface:S("ide")})}
export{iZt,sZt};
