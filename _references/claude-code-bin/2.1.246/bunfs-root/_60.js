// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{A1b as T,g1b as s,i1b as m,k1b as l,l1b as _}from"/$bunfs/root/_626.js";import{Lvc as L,luc as d,puc as g}from"/$bunfs/root/_668.js";import{EFc as p,VFc as c,sGc as U}from"/$bunfs/root/_701.js";import{D_c as F,v_c as a,x_c as f}from"/$bunfs/root/_780.js";import{Pcd as o,Rcd as C}from"/$bunfs/root/_814.js";import{Ged as u,Oed as h}from"/$bunfs/root/_816.js";import{jhd as n,ohd as I}from"/$bunfs/root/_820.js";F();C();L();I();T();h();U();var M={CLAUDE_CODE_TUI_TRIAL:"fullscreen"};function S(r,t){d((e)=>(e.fullscreenUpsellSeenCount??0)>=r?e:{...e,fullscreenUpsellSeenCount:r},t)}function b(r){S(l,r)}function R(r){let t=s();if(t.upsellImpression!==void 0)return t.upsellImpression;let e=Math.min((g().fullscreenUpsellSeenCount??0)+1,l);return t.upsellImpression=e,S(e,r),e}async function D(r){let t=s();if(t.persisted||m()!=="fullscreen")return!1;if(p().tui!==void 0)return n("fullscreen trial: settings.tui was set explicitly during the trial \u2014 not persisting"),!1;if(!_())return n("fullscreen trial: renderer is not fullscreen this session (auto-off) \u2014 not persisting"),!1;let e=!1,{error:i}=await c("userSettings",(E)=>(e=E?.tui!==void 0,e?null:{tui:"fullscreen"}),void 0,r);if(i)return u(i),f("tui_fullscreen_upsell_trial","settings_write_failed"),!1;if(e)return n("fullscreen trial: settings.tui was set explicitly during the trial (seen inside the queued write) \u2014 not persisting"),!1;return b(r),t.persisted=!0,a("tui_fullscreen_upsell_trial"),o("tengu_fullscreen_upsell_trial_persisted",{session_age_ms:Math.round(process.uptime()*1000)}),n("fullscreen trial: healthy \u2014 persisted settings.tui=fullscreen"),!0}
export{M as hh,b as ih,R as jh,D as kh};
