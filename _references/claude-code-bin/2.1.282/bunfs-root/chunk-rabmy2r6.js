// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.282
import{Si}from"/$bunfs/root/chunk-zwm3fybx.js";import{bo}from"/$bunfs/root/chunk-yksx95h7.js";import{_l}from"/$bunfs/root/chunk-14610yze.js";import{rst}from"/$bunfs/root/chunk-qe394gpc.js";import{sep as i}from"path";function A2e(t){if(Si())return null;let e=`${rst()}${i}`,n=".output";if(t.startsWith(e)&&t.endsWith(n)){let r=t.slice(e.length,-n.length);if(r.length>0&&r.length<=20&&/^[a-zA-Z0-9_-]+$/.test(r))return r}return null}function Klo(t){if(t?.file_path?.startsWith(_l()))return"Reading Plan";if(t?.file_path&&A2e(t.file_path))return"Read agent output";return"Read"}function iyr(t){if(!t?.file_path)return null;let e=A2e(t.file_path);if(e)return e;return bo(t.file_path)}
export{A2e,Klo,iyr};
