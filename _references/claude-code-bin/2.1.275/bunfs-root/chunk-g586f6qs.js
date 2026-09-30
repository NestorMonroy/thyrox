// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{I,ke,ie}from"/$bunfs/root/chunk-xbd48fav.js";import{b,me}from"/$bunfs/root/chunk-gytndg57.js";import{i}from"/$bunfs/root/chunk-bkjq2ptm.js";import{ig}from"/$bunfs/root/chunk-q8sknw7e.js";import{ge,tn}from"/$bunfs/root/chunk-v49f6nqy.js";import{DU}from"/$bunfs/root/chunk-cabye5bj.js";function WIn(u,{requireOnboarding:r=!0}={}){let o=ie();if(r&&!o.hasCompletedOnboarding||o.hasSeenAutoDefaultNudge||!I("tengu_maple_pier",!1))return null;let e=ge("userSettings")?.permissions?.defaultMode,t=["projectSettings","localSettings","flagSettings","policySettings"].some((n)=>ge(n)?.permissions?.defaultMode);if(e&&e!=="auto"&&!t&&DU(u))return e;return null}function GIn(u,r,o){if(ie().hasSeenAutoDefaultNudge)return;let e=ig(r.current_mode);if(u==="shown"){i("tengu_auto_default_nudge_shown",{current_mode:me(e),surface:b("ide")});return}let t=r.choice==="accept"?"accept":"decline";if(t==="accept")tn("userSettings",{permissions:{defaultMode:"auto"}},void 0,o);ke((n)=>n.hasSeenAutoDefaultNudge?n:{...n,hasSeenAutoDefaultNudge:!0},o),i("tengu_auto_default_nudge_resolved",{choice:b(t),outcome:t==="accept"?b("switched"):b("declined"),current_mode:me(e),surface:b("ide")})}
export{WIn,GIn};
