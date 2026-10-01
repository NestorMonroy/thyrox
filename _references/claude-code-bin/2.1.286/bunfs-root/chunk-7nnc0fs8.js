// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{Sn}from"/$bunfs/root/chunk-hbjpbz2q.js";import{No}from"/$bunfs/root/chunk-fresvh3b.js";import{Dl}from"/$bunfs/root/chunk-1x0r1d2z.js";import{cut}from"/$bunfs/root/chunk-mj86404k.js";import{sep as i}from"path";function s3e(t){if(Sn())return null;let e=`${cut()}${i}`,n=".output";if(t.startsWith(e)&&t.endsWith(n)){let r=t.slice(e.length,-n.length);if(r.length>0&&r.length<=20&&/^[a-zA-Z0-9_-]+$/.test(r))return r}return null}function Pxo(t){if(t?.file_path?.startsWith(Dl()))return"Reading Plan";if(t?.file_path&&s3e(t.file_path))return"Read agent output";return"Read"}function aMr(t){if(!t?.file_path)return null;let e=s3e(t.file_path);if(e)return e;return No(t.file_path)}
export{s3e,Pxo,aMr};
