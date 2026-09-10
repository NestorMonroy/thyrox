// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.258
import{D}from"/$bunfs/root/chunk-dwwp0b8c.js";import{readlink as e}from"fs/promises";async function Qct(n){let r=D();if(r!=="linux"&&r!=="wsl")return null;try{let t=await e(`/proc/self/fd/${n}`);return t.startsWith("/")&&!t.endsWith(" (deleted)")?t:null}catch{return null}}
export{Qct};
