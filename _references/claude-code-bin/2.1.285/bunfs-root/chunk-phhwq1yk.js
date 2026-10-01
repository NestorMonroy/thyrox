// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{c}from"/$bunfs/root/chunk-aap6zsd0.js";import{Ae,ce}from"/$bunfs/root/chunk-f74xvn8g.js";var p=["c4e-ultrareview","claude-design-command","default-permission-mode-config","desktop-app","desktop-contextual","desktop-ios-simulator","desktop-shortcut","focus-view","frontend-design-plugin","ide-upsell-external-terminal","install-github-app","install-slack-app","install-slack-app-mcp","memory-command","no-flicker","permissions","plugin-disuse-review","status-line","team-onboarding-share","voice-mode","web-setup-github","workflow-size-prompting","workflow-size-prompting-ambient",...[]];function u(t){return p.includes(t)}function T2e(t,i,n){let o=ce().numStartups;Ae((e)=>{let r=e.tipsHistory??{};if(r[t]===o)return e;let s=e.tipLifetimeShownCounts??{};return{...e,tipsHistory:{...r,[t]:o},tipLifetimeShownCounts:{...s,[t]:(s[t]??0)+1},...n!==void 0&&{tipsHistoryByCommand:{...e.tipsHistoryByCommand,[n]:{tipId:t,numStartups:o}}}}},i)}var g=100;function Wwe(t){let i=ce(),n=i.tipsHistoryByCommand?.[t];if(typeof n!=="object"||n===null)return{};let o=i.numStartups-n.numStartups;if(!(o>=0))return{};return{via_tip:!0,tip_launches_ago:Math.min(o,g),...u(n.tipId)&&{tip_id:c(n.tipId)}}}function Z4(t){return ce().tipLifetimeShownCounts?.[t]??0}function vso(t){return ce().pluginSuggestionShownCounts?.[t]??0}function d$(t){let i=ce(),n=i.tipsHistory?.[t];if(!n)return 1/0;return i.numStartups-n}function Eso(t){return ce().pluginSuggestionDiscoverShownCounts?.[t]??0}function kso(t,i){if(t.length===0)return;Ae((n)=>{let o=n.pluginSuggestionDiscoverShownCounts??{};if(t.every((r)=>(o[r]??0)>0))return n;let e={...o};for(let r of t)e[r]=(e[r]??0)+1;return{...n,pluginSuggestionDiscoverShownCounts:e}},i)}
export{T2e,Wwe,Z4,vso,d$,Eso,kso};
