// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{jo}from"/$bunfs/root/chunk-nvht7ckf.js";import{xo}from"/$bunfs/root/chunk-nhz4atva.js";import{Cl}from"/$bunfs/root/chunk-8ycg3vhe.js";import{Zat}from"/$bunfs/root/chunk-spmtf5nr.js";import{sep as i}from"path";function jqe(t){if(jo())return null;let e=`${Zat()}${i}`,n=".output";if(t.startsWith(e)&&t.endsWith(n)){let r=t.slice(e.length,-n.length);if(r.length>0&&r.length<=20&&/^[a-zA-Z0-9_-]+$/.test(r))return r}return null}function Hyo(t){if(t?.file_path?.startsWith(Cl()))return"Reading Plan";if(t?.file_path&&jqe(t.file_path))return"Read agent output";return"Read"}function jEr(t){if(!t?.file_path)return null;let e=jqe(t.file_path);if(e)return e;return xo(t.file_path)}
export{jqe,Hyo,jEr};
