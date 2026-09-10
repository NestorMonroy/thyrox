// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Lvc as S,luc as u,puc as s}from"/$bunfs/root/_668.js";import{xxd as g}from"/$bunfs/root/_837.js";function p(n,i){let t=s().numStartups;u((o)=>{let r=o.tipsHistory??{};if(r[n]===t)return o;let e=o.tipLifetimeShownCounts??{};return{...o,tipsHistory:{...r,[n]:t},tipLifetimeShownCounts:{...e,[n]:(e[n]??0)+1}}},i)}function a(n){return s().tipLifetimeShownCounts?.[n]??0}function h(n){return s().pluginSuggestionShownCounts?.[n]??0}function m(n){let i=s(),t=i.tipsHistory?.[n];if(!t)return 1/0;return i.numStartups-t}function w(n){return s().pluginSuggestionDiscoverShownCounts?.[n]??0}function l(n,i){if(n.length===0)return;u((t)=>{let o=t.pluginSuggestionDiscoverShownCounts??{};if(n.every((e)=>(o[e]??0)>0))return t;let r={...o};for(let e of n)r[e]=(r[e]??0)+1;return{...t,pluginSuggestionDiscoverShownCounts:r}},i)}var c=g(()=>{S()});
export{p as YJ,a as ZJ,h as _J,m as $J,w as aK,l as bK,c as cK};
