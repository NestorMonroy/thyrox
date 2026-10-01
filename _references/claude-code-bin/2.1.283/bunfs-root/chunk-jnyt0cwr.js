// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{x,ke,le}from"/$bunfs/root/chunk-t6pwageh.js";import{y,ue}from"/$bunfs/root/chunk-vyyazxfq.js";import{i}from"/$bunfs/root/chunk-ab7mw5d9.js";import{Ng}from"/$bunfs/root/chunk-379zyrv7.js";import{he,cn}from"/$bunfs/root/chunk-ckctvm5v.js";import{PN}from"/$bunfs/root/chunk-ksavkp4z.js";function HJn(u,{requireOnboarding:r=!0}={}){let o=le();if(r&&!o.hasCompletedOnboarding||o.hasSeenAutoDefaultNudge||!x("tengu_maple_pier",!1))return null;let e=he("userSettings")?.permissions?.defaultMode,t=["projectSettings","localSettings","flagSettings","policySettings"].some((n)=>he(n)?.permissions?.defaultMode);if(e&&e!=="auto"&&!t&&PN(u))return e;return null}function MJn(u,r,o){if(le().hasSeenAutoDefaultNudge)return;let e=Ng(r.current_mode);if(u==="shown"){i("tengu_auto_default_nudge_shown",{current_mode:ue(e),surface:y("ide")});return}let t=r.choice==="accept"?"accept":"decline";if(t==="accept")cn("userSettings",{permissions:{defaultMode:"auto"}},void 0,o);ke((n)=>n.hasSeenAutoDefaultNudge?n:{...n,hasSeenAutoDefaultNudge:!0},o),i("tengu_auto_default_nudge_resolved",{choice:y(t),outcome:t==="accept"?y("switched"):y("declined"),current_mode:ue(e),surface:y("ide")})}
export{HJn,MJn};
