// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Qr}from"/$bunfs/root/chunk-qr34qg3p.js";var XUr={};Qr(XUr,{default:()=>XUr,pluginTestRefusal:()=>YUr});function YUr({helperError:e,isRolloutOn:t,canLoadUserModules:o}){if(e!==null)return e;if(!t)return"hooks modules are turned off in this process: CLAUDE_CODE_ENABLE_FUNCTION_HOOKS is 0 in a settings file or in its environment, or the rollout switch served off; remove the 0 where it is set, or set CLAUDE_CODE_ENABLE_FUNCTION_HOOKS=1 over a served off, to run a plugin's tests";return o?void 0:"hooks modules are turned off here (disableAllHooks, allowManagedHooksOnly or a policy)"}export{YUr,XUr};
