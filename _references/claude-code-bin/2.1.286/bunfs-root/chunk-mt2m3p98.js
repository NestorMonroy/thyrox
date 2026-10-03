// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{R,Ae,ce}from"/$bunfs/root/chunk-4hjp8tw4.js";import{_,me}from"/$bunfs/root/chunk-dwaez71m.js";import{i}from"/$bunfs/root/chunk-r27mnwfc.js";import{ch}from"/$bunfs/root/chunk-v67w5hxq.js";import{ge,mn}from"/$bunfs/root/chunk-j27hwf9z.js";import{M$}from"/$bunfs/root/chunk-z1sg1vem.js";function Srr(u,{requireOnboarding:n=!0}={}){let o=ce();if(n&&!o.hasCompletedOnboarding||o.hasSeenAutoDefaultNudge||!R("tengu_maple_pier",!0))return null;let e=ge("userSettings")?.permissions?.defaultMode,t=["projectSettings","localSettings","flagSettings","policySettings"].some((r)=>ge(r)?.permissions?.defaultMode);if(e&&e!=="auto"&&!t&&M$(u))return e;return null}function wrr(u,n,o){if(ce().hasSeenAutoDefaultNudge)return;let e=ch(n.current_mode);if(u==="shown"){i("tengu_auto_default_nudge_shown",{current_mode:me(e),surface:_("ide")});return}let t=n.choice==="accept"?"accept":"decline";if(t==="accept")mn("userSettings",{permissions:{defaultMode:"auto"}},void 0,o);Ae((r)=>r.hasSeenAutoDefaultNudge?r:{...r,hasSeenAutoDefaultNudge:!0},o),i("tengu_auto_default_nudge_resolved",{choice:_(t),outcome:t==="accept"?_("switched"):_("declined"),current_mode:me(e),surface:_("ide")})}
export{Srr,wrr};
