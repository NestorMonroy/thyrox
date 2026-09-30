// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{Dg,aa,x,Bu}from"/$bunfs/root/chunk-t6pwageh.js";import{a}from"/$bunfs/root/chunk-v49zfq06.js";var t="tengu_violin_pegbox";function n(){return a.CLAUDE_CODE_ENTRYPOINT==="remote_desktop"}async function i(){try{return await Bu(t)}catch{return!1}}function l(){try{return x(t,!1)}catch{return!1}}async function u(){try{return await Bu("tengu_violin_strad")}catch{return!1}}function s(){try{return x("tengu_violin_strad",!1)}catch{return!1}}async function Gd(){try{return await Bu("tengu_violin_wood")&&(!n()||await i())}catch{return!1}}function es(){try{return x("tengu_violin_wood",!1)&&(!n()||l())}catch{return!1}}async function a1(){return await Gd()&&await u()}function w5(){return es()&&s()}function v5(){try{let{value:e,source:o}=aa("tengu_violin_wood",!1);return e===!1&&r(o)}catch{return!1}}function r(e){switch(e){case"payload":case"override":case"disabled":return!0;case"fallback":return Dg();case"disk":return!1}}function H0r(e){try{let{value:o,source:_}=aa(e,!1);return o===!1&&r(_)}catch{return!1}}function c(e){return r(aa(e,!1).source)}function A5o(e){try{return c(e)&&(e!=="tengu_violin_wood"||!n()||c(t))}catch{return!1}}async function vzo(){try{return await Bu("tengu_violin_amati")}catch{return!1}}function Z2n(){try{return x("tengu_violin_amati",!1)}catch{return!1}}function iLt(){return es()&&Z2n()}async function ndt(){let[e,o]=await Promise.all([Gd(),vzo()]);return e&&o}
export{Gd,es,a1,w5,v5,H0r,A5o,vzo,Z2n,iLt,ndt};
