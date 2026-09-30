// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{a}from"/$bunfs/root/chunk-9fmxymtw.js";import{z,B}from"/$bunfs/root/chunk-t8q7n4ta.js";import{Qn,I}from"/$bunfs/root/chunk-btbsn9s4.js";import{dv}from"/$bunfs/root/chunk-hfjb09vk.js";import{$t}from"/$bunfs/root/chunk-7c2v1bj6.js";function oRe(){return a.CLAUDE_CODE_DISABLE_WORKFLOWS||dv()?.settings.disableWorkflows===!0}class t{cached=void 0;resolve(){if(this.cached!==void 0)return this.cached;return this.cached=i(),this.cached}}var n=new z(()=>new t);function Bc(){if(oRe())return!1;if(!ATt())return!1;let{available:r,defaultOn:e}=o();if(!r)return!1;return dv()?.settings.enableWorkflows??e}function cRn(){return o().defaultOn}function kTt(){return ATt()&&!a.CLAUDE_CODE_DISABLE_WORKFLOWS&&o().available}function VZe(){return dv()?.settings.workflowKeywordTriggerEnabled??!0}function ATt(){return $t("allow_workflows")}function _ar(){if(oRe()||!ATt())return!0;if(dv()?.settings.enableWorkflows===!1)return!0;return a.CLAUDE_CODE_WORKFLOWS===!1||!I("tengu_workflows_enabled",!0)}function o(){return n.of(B().host).resolve()}function i(){if(a.CLAUDE_CODE_WORKFLOWS===!0){let e=I("tengu_workflows_enabled",!0);return{available:e,defaultOn:e}}if(a.CLAUDE_CODE_WORKFLOWS===!1)return{available:!1,defaultOn:!1};if(!I("tengu_workflows_enabled",!0))return{available:!1,defaultOn:!1};return{available:!0,defaultOn:Qn()!=="pro"}}function bar(){return I("tengu_jade_compass",!0)}
export{oRe,Bc,cRn,kTt,VZe,ATt,_ar,bar};
