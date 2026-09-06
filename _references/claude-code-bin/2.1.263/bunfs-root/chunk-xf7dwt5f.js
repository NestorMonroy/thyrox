// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{qv,Np,I,rd}from"/$bunfs/root/chunk-32f2qmtc.js";import{a}from"/$bunfs/root/chunk-bxegdt3f.js";var o="tengu_violin_pegbox";function n(){return a.CLAUDE_CODE_ENTRYPOINT==="remote_desktop"}async function r(){try{return await rd(o)}catch{return!1}}function i(){try{return I(o,!1)}catch{return!1}}async function l(){try{return await rd("tengu_violin_strad")}catch{return!1}}function u(){try{return I("tengu_violin_strad",!1)}catch{return!1}}async function _u(){try{return await rd("tengu_violin_wood")&&(!n()||await r())}catch{return!1}}function ri(){try{return I("tengu_violin_wood",!1)&&(!n()||i())}catch{return!1}}async function TD(){return await _u()&&await l()}function JB(){return ri()&&u()}function X7e(){try{let{value:e,source:t}=Np("tengu_violin_wood",!1);return e===!1&&s(t)}catch{return!1}}function s(e){switch(e){case"payload":case"override":case"disabled":return!0;case"fallback":return qv();case"disk":return!1}}function c(e){return s(Np(e,!1).source)}function Kyr(e){try{return c(e)&&(e!=="tengu_violin_wood"||!n()||c(o))}catch{return!1}}async function Gfr(){try{return await rd("tengu_violin_amati")}catch{return!1}}function G9t(){try{return I("tengu_violin_amati",!1)}catch{return!1}}function J7e(){return ri()&&G9t()}async function PBe(){let[e,t]=await Promise.all([_u(),Gfr()]);return e&&t}
export{_u,ri,TD,JB,X7e,Kyr,Gfr,G9t,J7e,PBe};
