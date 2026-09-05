// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{L,He,ie}from"/$bunfs/root/chunk-8qt7d28b.js";import{S,Re}from"/$bunfs/root/chunk-mrh5xd2h.js";import{s}from"/$bunfs/root/chunk-62em4bpm.js";import{be,Qt}from"/$bunfs/root/chunk-0300m3ak.js";import{_p}from"/$bunfs/root/chunk-m7yvwazd.js";import{PW}from"/$bunfs/root/chunk-zyfpfa9k.js";function jJt(u,{requireOnboarding:r=!0}={}){let o=ie();if(r&&!o.hasCompletedOnboarding||o.hasSeenAutoDefaultNudge||!L("tengu_maple_pier",!1))return null;let e=be("userSettings")?.permissions?.defaultMode,t=["projectSettings","localSettings","flagSettings","policySettings"].some((n)=>be(n)?.permissions?.defaultMode);if(e&&e!=="auto"&&!t&&PW(u))return e;return null}function GJt(u,r,o){if(ie().hasSeenAutoDefaultNudge)return;let e=_p(r.current_mode);if(u==="shown"){s("tengu_auto_default_nudge_shown",{current_mode:Re(e),surface:S("ide")});return}let t=r.choice==="accept"?"accept":"decline";if(t==="accept")Qt("userSettings",{permissions:{defaultMode:"auto"}},void 0,o);He((n)=>n.hasSeenAutoDefaultNudge?n:{...n,hasSeenAutoDefaultNudge:!0},o),s("tengu_auto_default_nudge_resolved",{choice:S(t),outcome:t==="accept"?S("switched"):S("declined"),current_mode:Re(e),surface:S("ide")})}
export{jJt,GJt};
