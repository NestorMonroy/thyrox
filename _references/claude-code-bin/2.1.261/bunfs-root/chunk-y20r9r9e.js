// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{qv,Np,I,nd}from"/$bunfs/root/chunk-hyqdn9c0.js";import{a}from"/$bunfs/root/chunk-a207t0vs.js";var o="tengu_violin_pegbox";function n(){return a.CLAUDE_CODE_ENTRYPOINT==="remote_desktop"}async function r(){try{return await nd(o)}catch{return!1}}function i(){try{return I(o,!1)}catch{return!1}}async function l(){try{return await nd("tengu_violin_strad")}catch{return!1}}function u(){try{return I("tengu_violin_strad",!1)}catch{return!1}}async function _u(){try{return await nd("tengu_violin_wood")&&(!n()||await r())}catch{return!1}}function ri(){try{return I("tengu_violin_wood",!1)&&(!n()||i())}catch{return!1}}async function TD(){return await _u()&&await l()}function XB(){return ri()&&u()}function Y7e(){try{let{value:e,source:t}=Np("tengu_violin_wood",!1);return e===!1&&s(t)}catch{return!1}}function s(e){switch(e){case"payload":case"override":case"disabled":return!0;case"fallback":return qv();case"disk":return!1}}function c(e){return s(Np(e,!1).source)}function Wyr(e){try{return c(e)&&(e!=="tengu_violin_wood"||!n()||c(o))}catch{return!1}}async function Bfr(){try{return await nd("tengu_violin_amati")}catch{return!1}}function j9t(){try{return I("tengu_violin_amati",!1)}catch{return!1}}function X7e(){return ri()&&j9t()}async function LBe(){let[e,t]=await Promise.all([_u(),Bfr()]);return e&&t}
export{_u,ri,TD,XB,Y7e,Wyr,Bfr,j9t,X7e,LBe};
