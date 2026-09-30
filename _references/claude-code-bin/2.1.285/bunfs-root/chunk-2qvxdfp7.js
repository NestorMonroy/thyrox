// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Hs,x,Dy,rUt,Mmn}from"/$bunfs/root/chunk-f74xvn8g.js";async function o(){try{return await Dy("tengu_violin_strad")}catch{return!1}}function t(){try{return x("tengu_violin_strad",!1)}catch{return!1}}async function Zk(){try{return await Dy("tengu_violin_wood")}catch{return!1}}function gm(){try{return x("tengu_violin_wood",!1)}catch{return!1}}var a="tengu_violin_maple";async function cYe(){try{return await Zk()||await rUt(a)}catch{return!1}}function Kf(){try{return gm()||x(a,!1)}catch{return!1}}async function gD(){return await Zk()&&await o()}function a6(){return gm()&&t()}function lne(e){return"unsupported"}function mJ(e){return lne(e)===null}function aFe(){try{let{value:e,source:n}=Hs("tengu_violin_wood",!1);return e===!1&&Mmn(n)}catch{return!1}}function UXo(e){try{return Mmn(Hs(e,!1).source)}catch{return!1}}async function P4o(){try{return await Dy("tengu_violin_amati")}catch{return!1}}function e4n(){try{return x("tengu_violin_amati",!1)}catch{return!1}}function s$t(){return gm()&&e4n()}async function But(){let[e,n]=await Promise.all([Zk(),P4o()]);return e&&n}
export{Zk,gm,cYe,Kf,gD,a6,lne,mJ,aFe,UXo,P4o,e4n,s$t,But};
