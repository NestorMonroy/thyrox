// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{Sn}from"/$bunfs/root/chunk-bxhyh54r.js";import{So}from"/$bunfs/root/chunk-g768q95w.js";import{Pl}from"/$bunfs/root/chunk-sjsrt3rf.js";import{ult}from"/$bunfs/root/chunk-2gz9d26e.js";import{sep as i}from"path";function YKe(t){if(Sn())return null;let e=`${ult()}${i}`,n=".output";if(t.startsWith(e)&&t.endsWith(n)){let r=t.slice(e.length,-n.length);if(r.length>0&&r.length<=20&&/^[a-zA-Z0-9_-]+$/.test(r))return r}return null}function Cwo(t){if(t?.file_path?.startsWith(Pl()))return"Reading Plan";if(t?.file_path&&YKe(t.file_path))return"Read agent output";return"Read"}function _Ar(t){if(!t?.file_path)return null;let e=YKe(t.file_path);if(e)return e;return So(t.file_path)}
export{YKe,Cwo,_Ar};
