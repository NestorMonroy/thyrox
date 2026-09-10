// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.246
import{xxd as o}from"/$bunfs/root/_837.js";function n(r){return{ok:!0,value:r}}function u(r){return{ok:!1,error:r}}function E(r){if(r.ok)return r.value;throw new ResultError(r.error)}var ResultError;var t=o(()=>{ResultError=class ResultError extends Error{constructor(r){super("Result was an error (see .error)");this.name="ResultError",Object.defineProperty(this,"error",{value:r,enumerable:!1})}}});
export{n as SXc,u as TXc,E as UXc,t as VXc};
