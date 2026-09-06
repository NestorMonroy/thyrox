// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.263
import{a}from"/$bunfs/root/chunk-bxegdt3f.js";import{j,U}from"/$bunfs/root/chunk-k6vqz9fa.js";import{Qn,I}from"/$bunfs/root/chunk-32f2qmtc.js";import{xH}from"/$bunfs/root/chunk-v7vff0yy.js";import{Mt}from"/$bunfs/root/chunk-bfe59bf9.js";function cke(){return a.CLAUDE_CODE_DISABLE_WORKFLOWS||xH()?.settings.disableWorkflows===!0}class t{cached=void 0;resolve(){if(this.cached!==void 0)return this.cached;return this.cached=i(),this.cached}}var n=new j(()=>new t);function Lc(){if(cke())return!1;if(!PEt())return!1;let{available:r,defaultOn:e}=o();if(!r)return!1;return xH()?.settings.enableWorkflows??e}function $En(){return o().defaultOn}function LEt(){return PEt()&&!a.CLAUDE_CODE_DISABLE_WORKFLOWS&&o().available}function p7e(){return xH()?.settings.workflowKeywordTriggerEnabled??!0}function PEt(){return Mt("allow_workflows")}function Utr(){if(cke()||!PEt())return!0;if(xH()?.settings.enableWorkflows===!1)return!0;return a.CLAUDE_CODE_WORKFLOWS===!1||!I("tengu_workflows_enabled",!0)}function o(){return n.of(U().host).resolve()}function i(){if(a.CLAUDE_CODE_WORKFLOWS===!0){let e=I("tengu_workflows_enabled",!0);return{available:e,defaultOn:e}}if(a.CLAUDE_CODE_WORKFLOWS===!1)return{available:!1,defaultOn:!1};if(!I("tengu_workflows_enabled",!0))return{available:!1,defaultOn:!1};return{available:!0,defaultOn:Qn()!=="pro"}}function jtr(){return I("tengu_jade_compass",!0)}
export{cke,Lc,$En,LEt,p7e,PEt,Utr,jtr};
