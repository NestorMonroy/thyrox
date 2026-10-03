// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{x,Ae,ce}from"/$bunfs/root/chunk-f74xvn8g.js";import{_,me}from"/$bunfs/root/chunk-aap6zsd0.js";import{i}from"/$bunfs/root/chunk-gn6mgw10.js";import{qg}from"/$bunfs/root/chunk-srhvbygf.js";import{ge,fn}from"/$bunfs/root/chunk-g6a51st9.js";import{a$}from"/$bunfs/root/chunk-xs95gyyf.js";function uer(u,{requireOnboarding:n=!0}={}){let o=ce();if(n&&!o.hasCompletedOnboarding||o.hasSeenAutoDefaultNudge||!x("tengu_maple_pier",!0))return null;let e=ge("userSettings")?.permissions?.defaultMode,t=["projectSettings","localSettings","flagSettings","policySettings"].some((r)=>ge(r)?.permissions?.defaultMode);if(e&&e!=="auto"&&!t&&a$(u))return e;return null}function per(u,n,o){if(ce().hasSeenAutoDefaultNudge)return;let e=qg(n.current_mode);if(u==="shown"){i("tengu_auto_default_nudge_shown",{current_mode:me(e),surface:_("ide")});return}let t=n.choice==="accept"?"accept":"decline";if(t==="accept")fn("userSettings",{permissions:{defaultMode:"auto"}},void 0,o);Ae((r)=>r.hasSeenAutoDefaultNudge?r:{...r,hasSeenAutoDefaultNudge:!0},o),i("tengu_auto_default_nudge_resolved",{choice:_(t),outcome:t==="accept"?_("switched"):_("declined"),current_mode:me(e),surface:_("ide")})}
export{uer,per};
