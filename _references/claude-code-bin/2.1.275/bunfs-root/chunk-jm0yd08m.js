// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.275
import{G,W}from"/$bunfs/root/chunk-4qqe0nh4.js";import{a}from"/$bunfs/root/chunk-crr3rzxx.js";import{AsyncLocalStorage as t}from"async_hooks";class xSn{#o=!1;#s=!1;get backgroundTasksDisabled(){return this.#o}get unsandboxedCommandsDisabled(){return this.#s}disableBackgroundTasks(){this.#o=!0}disableUnsandboxedCommands(){this.#s=!0}}var r=new G(()=>new xSn);function i9(){return o.getStore()??r.of(W().host)}var o=new t;function PVr(s,e){return o.run(s,e)}function yc(){return i9().backgroundTasksDisabled||a.CLAUDE_CODE_DISABLE_BACKGROUND_TASKS}var cVt="Background tasks are disabled in this session.";
export{xSn,i9,PVr,yc,cVt};
