// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{ck,Gm,L,Bf}from"/$bunfs/root/chunk-8qt7d28b.js";import{a}from"/$bunfs/root/chunk-sr28hb79.js";var o="tengu_violin_pegbox";function n(){return a.CLAUDE_CODE_ENTRYPOINT==="remote_desktop"}async function r(){try{return await Bf(o)}catch{return!1}}function i(){try{return L(o,!1)}catch{return!1}}async function l(){try{return await Bf("tengu_violin_strad")}catch{return!1}}function u(){try{return L("tengu_violin_strad",!1)}catch{return!1}}async function wd(){try{return await Bf("tengu_violin_wood")&&(!n()||await r())}catch{return!1}}function Ss(){try{return L("tengu_violin_wood",!1)&&(!n()||i())}catch{return!1}}async function C0(){return await wd()&&await l()}function r1(){return Ss()&&u()}function OJe(){try{let{value:e,source:t}=Gm("tengu_violin_wood",!1);return e===!1&&s(t)}catch{return!1}}function s(e){switch(e){case"payload":case"override":case"disabled":return!0;case"fallback":return ck();case"disk":return!1}}function c(e){return s(Gm(e,!1).source)}function eRr(){try{return n()&&L("tengu_violin_wood",!1)?o:"tengu_violin_wood"}catch{return"tengu_violin_wood"}}function tRr(e){try{return c(e)&&(e!=="tengu_violin_wood"||!n()||c(o))}catch{return!1}}async function YHr(){try{return await Bf("tengu_violin_amati")}catch{return!1}}function d4t(){try{return L("tengu_violin_amati",!1)}catch{return!1}}function NJe(){return Ss()&&d4t()}async function yFe(){let[e,t]=await Promise.all([wd(),YHr()]);return e&&t}
export{wd,Ss,C0,r1,OJe,eRr,tRr,YHr,d4t,NJe,yFe};
