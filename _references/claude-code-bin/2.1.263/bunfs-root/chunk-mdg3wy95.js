// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{I,we,ee}from"/$bunfs/root/chunk-32f2qmtc.js";import{b,He}from"/$bunfs/root/chunk-1m0n2kwr.js";import{i}from"/$bunfs/root/chunk-y9tkdj4c.js";import{_e,Jt}from"/$bunfs/root/chunk-xnx53tr1.js";import{mp}from"/$bunfs/root/chunk-ah1kb8zv.js";import{N$}from"/$bunfs/root/chunk-v17yajj0.js";function Z7t(u,{requireOnboarding:r=!0}={}){let o=ee();if(r&&!o.hasCompletedOnboarding||o.hasSeenAutoDefaultNudge||!I("tengu_maple_pier",!1))return null;let e=_e("userSettings")?.permissions?.defaultMode,t=["projectSettings","localSettings","flagSettings","policySettings"].some((n)=>_e(n)?.permissions?.defaultMode);if(e&&e!=="auto"&&!t&&N$(u))return e;return null}function eQt(u,r,o){if(ee().hasSeenAutoDefaultNudge)return;let e=mp(r.current_mode);if(u==="shown"){i("tengu_auto_default_nudge_shown",{current_mode:He(e),surface:b("ide")});return}let t=r.choice==="accept"?"accept":"decline";if(t==="accept")Jt("userSettings",{permissions:{defaultMode:"auto"}},void 0,o);we((n)=>n.hasSeenAutoDefaultNudge?n:{...n,hasSeenAutoDefaultNudge:!0},o),i("tengu_auto_default_nudge_resolved",{choice:b(t),outcome:t==="accept"?b("switched"):b("declined"),current_mode:He(e),surface:b("ide")})}
export{Z7t,eQt};
