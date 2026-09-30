// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{kT,nm,I,Qu}from"/$bunfs/root/chunk-btbsn9s4.js";import{a}from"/$bunfs/root/chunk-9fmxymtw.js";var o="tengu_violin_pegbox";function n(){return a.CLAUDE_CODE_ENTRYPOINT==="remote_desktop"}async function r(){try{return await Qu(o)}catch{return!1}}function i(){try{return I(o,!1)}catch{return!1}}async function l(){try{return await Qu("tengu_violin_strad")}catch{return!1}}function u(){try{return I("tengu_violin_strad",!1)}catch{return!1}}async function Ru(){try{return await Qu("tengu_violin_wood")&&(!n()||await r())}catch{return!1}}function Xs(){try{return I("tengu_violin_wood",!1)&&(!n()||i())}catch{return!1}}async function HD(){return await Ru()&&await l()}function ZB(){return Xs()&&u()}function Cet(){try{let{value:e,source:t}=nm("tengu_violin_wood",!1);return e===!1&&s(t)}catch{return!1}}function s(e){switch(e){case"payload":case"override":case"disabled":return!0;case"fallback":return kT();case"disk":return!1}}function c(e){return s(nm(e,!1).source)}function DEr(e){try{return c(e)&&(e!=="tengu_violin_wood"||!n()||c(o))}catch{return!1}}async function k_r(){try{return await Qu("tengu_violin_amati")}catch{return!1}}function f9t(){try{return I("tengu_violin_amati",!1)}catch{return!1}}function Ret(){return Xs()&&f9t()}async function U1e(){let[e,t]=await Promise.all([Ru(),k_r()]);return e&&t}
export{Ru,Xs,HD,ZB,Cet,DEr,k_r,f9t,Ret,U1e};
