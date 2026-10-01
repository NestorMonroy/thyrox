// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{_m}from"/$bunfs/root/chunk-xjjs8j5r.js";var _mr=255,s=255,i=/[\x00-\x20\x7f~^:?*[\\]/,e=/[\p{Cc}\p{Cf}\uFFFD]/u,A=250;function F8t(t){return Buffer.byteLength(t,"utf8")<=s&&o(t)}function o(t){return t.length>0&&t.length<=_mr&&t!=="@"&&t!=="HEAD"&&_m(t)&&!i.test(t)&&!e.test(t)&&!t.startsWith("-")&&!t.endsWith(".")&&!t.includes("..")&&!t.includes("@{")&&t.split("/").every((r)=>r!==""&&!r.startsWith(".")&&!r.endsWith(".lock")&&Buffer.byteLength(r,"utf8")<=A)}
export{_mr,F8t};
