// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{nS,Zd,I,Sp}from"/$bunfs/root/chunk-27bj2wbx.js";import{a}from"/$bunfs/root/chunk-j96jysac.js";var o="tengu_violin_pegbox";function n(){return a.CLAUDE_CODE_ENTRYPOINT==="remote_desktop"}async function r(){try{return await Sp(o)}catch{return!1}}function i(){try{return I(o,!1)}catch{return!1}}async function l(){try{return await Sp("tengu_violin_strad")}catch{return!1}}function u(){try{return I("tengu_violin_strad",!1)}catch{return!1}}async function Ed(){try{return await Sp("tengu_violin_wood")&&(!n()||await r())}catch{return!1}}function Ui(){try{return I("tengu_violin_wood",!1)&&(!n()||i())}catch{return!1}}async function KF(){return await Ed()&&await l()}function nG(){return Ui()&&u()}function lht(){try{let{value:e,source:t}=Zd("tengu_violin_wood",!1);return e===!1&&s(t)}catch{return!1}}function s(e){switch(e){case"payload":case"override":case"disabled":return!0;case"fallback":return nS();case"disk":return!1}}function c(e){return s(Zd(e,!1).source)}function vZr(e){try{return c(e)&&(e!=="tengu_violin_wood"||!n()||c(o))}catch{return!1}}async function dYr(){try{return await Sp("tengu_violin_amati")}catch{return!1}}function Nhn(){try{return I("tengu_violin_amati",!1)}catch{return!1}}function cht(){return Ui()&&Nhn()}async function j8e(){let[e,t]=await Promise.all([Ed(),dYr()]);return e&&t}
export{Ed,Ui,KF,nG,lht,vZr,dYr,Nhn,cht,j8e};
