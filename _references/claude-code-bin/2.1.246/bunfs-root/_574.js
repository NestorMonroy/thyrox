// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{Jjd as n,Kjd as l,atd as s,zkd as t}from"/$bunfs/root/_826.js";import{xxd as a}from"/$bunfs/root/_837.js";class i{#o=!1;#e=!1;#n=!1;#t=!1;#i=void 0;#r=!1;get active(){return this.#o}get flagCli(){return this.#e}get circuitBroken(){return this.#n}get fromFallback(){return this.#t}get envOnboardingEligible(){return this.#i}get envOnboardingShownLogged(){return this.#r}setActive(o){this.#o=o}setFlagCli(o){this.#e=o}setCircuitBroken(o){this.#n=o}setFromFallback(o){this.#t=o}setEnvOnboardingEligible(o){this.#i=o}setEnvOnboardingShownLogged(o){this.#r=o}reset(){this.#o=!1,this.#e=!1,this.#n=!1,this.#t=!1,this.#i=void 0,this.#r=!1}}function e(){return d.of(t().host)}function f(o){e().setActive(o)}function r(){return e().active}function c(o){return o.mode==="auto"||o.mode==="plan"&&r()&&!o.isBypassPermissionsModeAvailable}function v(o){return o==="auto"||o==="plan"&&r()}function p(o){e().setFlagCli(o)}function h(){return e().flagCli}function A(o){e().setCircuitBroken(o)}function m(){return e().circuitBroken}function M(o){e().setFromFallback(o)}function x(){return e().fromFallback}function E(){return e().envOnboardingEligible}function F(o){e().setEnvOnboardingEligible(o)}function k(){return e().envOnboardingShownLogged}function O(o){e().setEnvOnboardingShownLogged(o)}var d;var u=a(()=>{s();l();d=new n(()=>new i)});
export{i as zHb,d as AHb,e as BHb,f as CHb,r as DHb,c as EHb,v as FHb,p as GHb,h as HHb,A as IHb,m as JHb,M as KHb,x as LHb,E as MHb,F as NHb,k as OHb,O as PHb,u as QHb};
