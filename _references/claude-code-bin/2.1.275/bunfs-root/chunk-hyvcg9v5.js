// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{Tb,zd,I,Cp}from"/$bunfs/root/chunk-xbd48fav.js";import{a}from"/$bunfs/root/chunk-crr3rzxx.js";var o="tengu_violin_pegbox";function n(){return a.CLAUDE_CODE_ENTRYPOINT==="remote_desktop"}async function r(){try{return await Cp(o)}catch{return!1}}function i(){try{return I(o,!1)}catch{return!1}}async function l(){try{return await Cp("tengu_violin_strad")}catch{return!1}}function u(){try{return I("tengu_violin_strad",!1)}catch{return!1}}async function $d(){try{return await Cp("tengu_violin_wood")&&(!n()||await r())}catch{return!1}}function ji(){try{return I("tengu_violin_wood",!1)&&(!n()||i())}catch{return!1}}async function D1(){return await $d()&&await l()}function RG(){return ji()&&u()}function L_t(){try{let{value:e,source:t}=zd("tengu_violin_wood",!1);return e===!1&&s(t)}catch{return!1}}function s(e){switch(e){case"payload":case"override":case"disabled":return!0;case"fallback":return Tb();case"disk":return!1}}function c(e){return s(zd(e,!1).source)}function aio(e){try{return c(e)&&(e!=="tengu_violin_wood"||!n()||c(o))}catch{return!1}}async function zZr(){try{return await Cp("tengu_violin_amati")}catch{return!1}}function ISn(){try{return I("tengu_violin_amati",!1)}catch{return!1}}function N_t(){return ji()&&ISn()}async function D9e(){let[e,t]=await Promise.all([$d(),zZr()]);return e&&t}
export{$d,ji,D1,RG,L_t,aio,zZr,ISn,N_t,D9e};
