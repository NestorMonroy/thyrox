// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Wh,Hl,x,fp}from"/$bunfs/root/chunk-5khn4tvf.js";import{a}from"/$bunfs/root/chunk-ay603yys.js";var o="tengu_violin_pegbox";function n(){return a.CLAUDE_CODE_ENTRYPOINT==="remote_desktop"}async function r(){try{return await fp(o)}catch{return!1}}function i(){try{return x(o,!1)}catch{return!1}}async function l(){try{return await fp("tengu_violin_strad")}catch{return!1}}function u(){try{return x("tengu_violin_strad",!1)}catch{return!1}}async function Nd(){try{return await fp("tengu_violin_wood")&&(!n()||await r())}catch{return!1}}function _s(){try{return x("tengu_violin_wood",!1)&&(!n()||i())}catch{return!1}}async function mU(){return await Nd()&&await l()}function u4(){return _s()&&u()}function fPt(){try{let{value:e,source:t}=Hl("tengu_violin_wood",!1);return e===!1&&s(t)}catch{return!1}}function s(e){switch(e){case"payload":case"override":case"disabled":return!0;case"fallback":return Wh();case"disk":return!1}}function c(e){return s(Hl(e,!1).source)}function XNo(e){try{return c(e)&&(e!=="tengu_violin_wood"||!n()||c(o))}catch{return!1}}async function tHo(){try{return await fp("tengu_violin_amati")}catch{return!1}}function fFn(){try{return x("tengu_violin_amati",!1)}catch{return!1}}function mPt(){return _s()&&fFn()}async function Tst(){let[e,t]=await Promise.all([Nd(),tHo()]);return e&&t}
export{Nd,_s,mU,u4,fPt,XNo,tHo,fFn,mPt,Tst};
