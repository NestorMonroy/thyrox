// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{a}from"/$bunfs/root/chunk-a207t0vs.js";var Zxe="CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE";function qat(){let{columns:r,rows:e}=process.stdout;if(!r||!e)return{};return{[Zxe]:`${r}x${e}`}}function Y1n(){let r=a.CLAUDE_CODE_RELAUNCH_TERMINAL_SIZE;if(delete process.env[Zxe],r===void 0||!process.stdout.isTTY)return;let e=/^([1-9]\d{0,3})x([1-9]\d{0,3})$/.exec(r);if(!e)return;process.stdout.columns||=Number(e[1]),process.stdout.rows||=Number(e[2])}
export{Zxe,qat,Y1n};
