// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Bj as M,yj as p}from"/$bunfs/root/_93.js";import{Lvc as C,Qrc as v,luc as g,puc as l,yrc as m}from"/$bunfs/root/_668.js";import{UFc as f,nFc as d,sGc as A}from"/$bunfs/root/_701.js";import{UNc as h,rNc as c}from"/$bunfs/root/_711.js";import{Pcd as a,Rcd as _}from"/$bunfs/root/_814.js";import{ewd as o,gwd as s,nwd as S}from"/$bunfs/root/_833.js";v();_();S();h();C();A();M();function T(i,{requireOnboarding:u=!0}={}){let t=l();if(u&&!t.hasCompletedOnboarding||t.hasSeenAutoDefaultNudge||!m("tengu_maple_pier",!1))return null;let e=d("userSettings")?.permissions?.defaultMode,n=["projectSettings","localSettings","flagSettings","policySettings"].some((r)=>d(r)?.permissions?.defaultMode);if(e&&e!=="auto"&&!n&&p(i))return e;return null}function k(i,u,t){if(l().hasSeenAutoDefaultNudge)return;let e=c(u.current_mode);if(i==="shown"){a("tengu_auto_default_nudge_shown",{current_mode:s(e),surface:o("ide")});return}let n=u.choice==="accept"?"accept":"decline";if(n==="accept")f("userSettings",{permissions:{defaultMode:"auto"}},void 0,t);g((r)=>r.hasSeenAutoDefaultNudge?r:{...r,hasSeenAutoDefaultNudge:!0},t),a("tengu_auto_default_nudge_resolved",{choice:o(n),outcome:n==="accept"?o("switched"):o("declined"),current_mode:s(e),surface:o("ide")})}
export{T as $b,k as ac};
