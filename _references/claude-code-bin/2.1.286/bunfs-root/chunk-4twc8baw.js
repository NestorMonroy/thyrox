// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Ss,R,Xy,f1t,hyn}from"/$bunfs/root/chunk-4hjp8tw4.js";async function o(){try{return await Xy("tengu_violin_strad")}catch{return!1}}function t(){try{return R("tengu_violin_strad",!1)}catch{return!1}}async function fT(){try{return await Xy("tengu_violin_wood")}catch{return!1}}function Cm(){try{return R("tengu_violin_wood",!1)}catch{return!1}}var a="tengu_violin_maple";async function T8e(){try{return await fT()||await f1t(a)}catch{return!1}}function lm(){try{return Cm()||R(a,!1)}catch{return!1}}async function N0(){return await fT()&&await o()}function I6(){return Cm()&&t()}function zne(e){return"unsupported"}function BJ(e){return zne(e)===null}function TUe(){try{let{value:e,source:n}=Ss("tengu_violin_wood",!1);return e===!1&&hyn(n)}catch{return!1}}function ves(e){try{return hyn(Ss(e,!1).source)}catch{return!1}}async function m8o(){try{return await Xy("tengu_violin_amati")}catch{return!1}}function o6n(){try{return R("tengu_violin_amati",!1)}catch{return!1}}function gUt(){return Cm()&&o6n()}async function Oft(){let[e,n]=await Promise.all([fT(),m8o()]);return e&&n}
export{fT,Cm,T8e,lm,N0,I6,zne,BJ,TUe,ves,m8o,o6n,gUt,Oft};
