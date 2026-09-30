// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{I,Ee,ne}from"/$bunfs/root/chunk-btbsn9s4.js";import{_,ve}from"/$bunfs/root/chunk-vkfaczp9.js";import{i}from"/$bunfs/root/chunk-74qghvre.js";import{_e,Qt}from"/$bunfs/root/chunk-kcxa79n8.js";import{Zp}from"/$bunfs/root/chunk-52ssfc24.js";import{jL}from"/$bunfs/root/chunk-7j5dvy8f.js";function ztn(u,{requireOnboarding:r=!0}={}){let o=ne();if(r&&!o.hasCompletedOnboarding||o.hasSeenAutoDefaultNudge||!I("tengu_maple_pier",!1))return null;let e=_e("userSettings")?.permissions?.defaultMode,t=["projectSettings","localSettings","flagSettings","policySettings"].some((n)=>_e(n)?.permissions?.defaultMode);if(e&&e!=="auto"&&!t&&jL(u))return e;return null}function Wtn(u,r,o){if(ne().hasSeenAutoDefaultNudge)return;let e=Zp(r.current_mode);if(u==="shown"){i("tengu_auto_default_nudge_shown",{current_mode:ve(e),surface:_("ide")});return}let t=r.choice==="accept"?"accept":"decline";if(t==="accept")Qt("userSettings",{permissions:{defaultMode:"auto"}},void 0,o);Ee((n)=>n.hasSeenAutoDefaultNudge?n:{...n,hasSeenAutoDefaultNudge:!0},o),i("tengu_auto_default_nudge_resolved",{choice:_(t),outcome:t==="accept"?_("switched"):_("declined"),current_mode:ve(e),surface:_("ide")})}
export{ztn,Wtn};
