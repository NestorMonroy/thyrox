// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{Xa}from"/$bunfs/root/chunk-cqc88nqm.js";import{ko}from"/$bunfs/root/chunk-bg3bhqbb.js";import{il}from"/$bunfs/root/chunk-majzq46g.js";import{Qnt}from"/$bunfs/root/chunk-wza6zacr.js";import{sep as i}from"path";function $2e(t){if(Xa())return null;let e=`${Qnt()}${i}`,n=".output";if(t.startsWith(e)&&t.endsWith(n)){let r=t.slice(e.length,-n.length);if(r.length>0&&r.length<=20&&/^[a-zA-Z0-9_-]+$/.test(r))return r}return null}function Xno(t){if(t?.file_path?.startsWith(il()))return"Reading Plan";if(t?.file_path&&$2e(t.file_path))return"Read agent output";return"Read"}function qur(t){if(!t?.file_path)return null;let e=$2e(t.file_path);if(e)return e;return ko(t.file_path)}
export{$2e,Xno,qur};
