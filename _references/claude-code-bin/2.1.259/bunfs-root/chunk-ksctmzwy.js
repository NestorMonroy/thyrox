// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.259
import{Hk,Tg,L,qu}from"/$bunfs/root/chunk-x722nt0q.js";import{a}from"/$bunfs/root/chunk-m92n5xra.js";var o="tengu_violin_pegbox";function n(){return a.CLAUDE_CODE_ENTRYPOINT==="remote_desktop"}async function r(){try{return await qu(o)}catch{return!1}}function i(){try{return L(o,!1)}catch{return!1}}async function l(){try{return await qu("tengu_violin_strad")}catch{return!1}}function u(){try{return L("tengu_violin_strad",!1)}catch{return!1}}async function vu(){try{return await qu("tengu_violin_wood")&&(!n()||await r())}catch{return!1}}function ds(){try{return L("tengu_violin_wood",!1)&&(!n()||i())}catch{return!1}}async function U0(){return await vu()&&await l()}function E1(){return ds()&&u()}function pQe(){try{let{value:e,source:t}=Tg("tengu_violin_wood",!1);return e===!1&&s(t)}catch{return!1}}function s(e){switch(e){case"payload":case"override":case"disabled":return!0;case"fallback":return Hk();case"disk":return!1}}function c(e){return s(Tg(e,!1).source)}function zPr(){try{return n()&&L("tengu_violin_wood",!1)?o:"tengu_violin_wood"}catch{return"tengu_violin_wood"}}function VPr(e){try{return c(e)&&(e!=="tengu_violin_wood"||!n()||c(o))}catch{return!1}}async function Rvr(){try{return await qu("tengu_violin_amati")}catch{return!1}}function S8t(){try{return L("tengu_violin_amati",!1)}catch{return!1}}function mQe(){return ds()&&S8t()}async function qBe(){let[e,t]=await Promise.all([vu(),Rvr()]);return e&&t}
export{vu,ds,U0,E1,pQe,zPr,VPr,Rvr,S8t,mQe,qBe};
