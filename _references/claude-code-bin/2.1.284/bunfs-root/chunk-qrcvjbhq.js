// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{di,x,Pf,p8e,EUt}from"/$bunfs/root/chunk-swk3rjnt.js";async function o(){try{return await Pf("tengu_violin_strad")}catch{return!1}}function t(){try{return x("tengu_violin_strad",!1)}catch{return!1}}async function Kh(){try{return await Pf("tengu_violin_wood")}catch{return!1}}function nd(){try{return x("tengu_violin_wood",!1)}catch{return!1}}var a="tengu_violin_maple";async function vFe(){try{return await Kh()||await p8e(a)}catch{return!1}}function gm(){try{return nd()||x(a,!1)}catch{return!1}}async function h0(){return await Kh()&&await o()}function e6(){return nd()&&t()}function t6(){try{let{value:e,source:n}=di("tengu_violin_wood",!1);return e===!1&&EUt(n)}catch{return!1}}function npt(e){try{let{value:n,source:r}=di(e,!1);return n===!1&&EUt(r)}catch{return!1}}function OXo(e){try{return EUt(di(e,!1).source)}catch{return!1}}async function k4o(){try{return await Pf("tengu_violin_amati")}catch{return!1}}function H4n(){try{return x("tengu_violin_amati",!1)}catch{return!1}}function v$t(){return nd()&&H4n()}async function rpt(){let[e,n]=await Promise.all([Kh(),k4o()]);return e&&n}
export{Kh,nd,vFe,gm,h0,e6,t6,npt,OXo,k4o,H4n,v$t,rpt};
