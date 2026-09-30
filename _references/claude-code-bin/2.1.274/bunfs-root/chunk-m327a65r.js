// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.274
import{l}from"/$bunfs/root/chunk-3btyksgt.js";import{t}from"/$bunfs/root/chunk-r2c9k9kh.js";async function SPe(n,e){try{let r=e.getAccessToken?await e.getAccessToken():void 0,{getBridgeSessionOrStatus:i}=await import("/$bunfs/root/chunk-wwvtpam7.js"),{session:s}=await i(n,{baseUrl:e.baseUrl,...r&&{getAccessToken:()=>r},credentials:e.credentials,useV2:!0});return s&&Array.isArray(s.tags)?s.tags:null}catch(r){return t(`[bridge:session] session tag read failed: ${l(r)}`,{level:"warn"}),null}}
export{SPe};
