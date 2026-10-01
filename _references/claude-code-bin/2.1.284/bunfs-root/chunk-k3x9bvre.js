// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.284
import{Ln}from"/$bunfs/root/chunk-d37h8mav.js";import{Ro}from"/$bunfs/root/chunk-qcjafqk2.js";import{$l}from"/$bunfs/root/chunk-sxw0exgx.js";import{Hct}from"/$bunfs/root/chunk-pjvmazn4.js";import{sep as i}from"path";function m4e(t){if(Ln())return null;let e=`${Hct()}${i}`,n=".output";if(t.startsWith(e)&&t.endsWith(n)){let r=t.slice(e.length,-n.length);if(r.length>0&&r.length<=20&&/^[a-zA-Z0-9_-]+$/.test(r))return r}return null}function Iwo(t){if(t?.file_path?.startsWith($l()))return"Reading Plan";if(t?.file_path&&m4e(t.file_path))return"Read agent output";return"Read"}function mCr(t){if(!t?.file_path)return null;let e=m4e(t.file_path);if(e)return e;return Ro(t.file_path)}
export{m4e,Iwo,mCr};
