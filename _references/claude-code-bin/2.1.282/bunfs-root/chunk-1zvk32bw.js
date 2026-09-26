// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{x,ke,le}from"/$bunfs/root/chunk-wbbthbh9.js";import{_,pe}from"/$bunfs/root/chunk-zxcb8vnv.js";import{i}from"/$bunfs/root/chunk-hm522bzh.js";import{yg}from"/$bunfs/root/chunk-t6d3nxvc.js";import{ye,an}from"/$bunfs/root/chunk-verj0kzw.js";import{CL}from"/$bunfs/root/chunk-y1gept5s.js";function e6n(u,{requireOnboarding:r=!0}={}){let o=le();if(r&&!o.hasCompletedOnboarding||o.hasSeenAutoDefaultNudge||!x("tengu_maple_pier",!1))return null;let e=ye("userSettings")?.permissions?.defaultMode,t=["projectSettings","localSettings","flagSettings","policySettings"].some((n)=>ye(n)?.permissions?.defaultMode);if(e&&e!=="auto"&&!t&&CL(u))return e;return null}function t6n(u,r,o){if(le().hasSeenAutoDefaultNudge)return;let e=yg(r.current_mode);if(u==="shown"){i("tengu_auto_default_nudge_shown",{current_mode:pe(e),surface:_("ide")});return}let t=r.choice==="accept"?"accept":"decline";if(t==="accept")an("userSettings",{permissions:{defaultMode:"auto"}},void 0,o);ke((n)=>n.hasSeenAutoDefaultNudge?n:{...n,hasSeenAutoDefaultNudge:!0},o),i("tengu_auto_default_nudge_resolved",{choice:_(t),outcome:t==="accept"?_("switched"):_("declined"),current_mode:pe(e),surface:_("ide")})}
export{e6n,t6n};
