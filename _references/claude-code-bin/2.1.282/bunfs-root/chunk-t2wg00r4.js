// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{dy,il,x,qu}from"/$bunfs/root/chunk-wbbthbh9.js";import{a}from"/$bunfs/root/chunk-h56wjcte.js";var t="tengu_violin_pegbox";function n(){return a.CLAUDE_CODE_ENTRYPOINT==="remote_desktop"}async function i(){try{return await qu(t)}catch{return!1}}function l(){try{return x(t,!1)}catch{return!1}}async function u(){try{return await qu("tengu_violin_strad")}catch{return!1}}function s(){try{return x("tengu_violin_strad",!1)}catch{return!1}}async function qd(){try{return await qu("tengu_violin_wood")&&(!n()||await i())}catch{return!1}}function ms(){try{return x("tengu_violin_wood",!1)&&(!n()||l())}catch{return!1}}async function jU(){return await qd()&&await u()}function G4(){return ms()&&s()}function VDe(){try{let{value:e,source:o}=il("tengu_violin_wood",!1);return e===!1&&r(o)}catch{return!1}}function r(e){switch(e){case"payload":case"override":case"disabled":return!0;case"fallback":return dy();case"disk":return!1}}function kRr(e){try{let{value:o,source:_}=il(e,!1);return o===!1&&r(_)}catch{return!1}}function c(e){return r(il(e,!1).source)}function Ajo(e){try{return c(e)&&(e!=="tengu_violin_wood"||!n()||c(t))}catch{return!1}}async function ILo(){try{return await qu("tengu_violin_amati")}catch{return!1}}function L1n(){try{return x("tengu_violin_amati",!1)}catch{return!1}}function MOt(){return ms()&&L1n()}async function lat(){let[e,o]=await Promise.all([qd(),ILo()]);return e&&o}
export{qd,ms,jU,G4,VDe,kRr,Ajo,ILo,L1n,MOt,lat};
