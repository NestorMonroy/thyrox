// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.281
import{p}from"/$bunfs/root/chunk-2pwc1ycq.js";import{le}from"/$bunfs/root/chunk-5khn4tvf.js";import{t}from"/$bunfs/root/chunk-wfscmafr.js";import{a}from"/$bunfs/root/chunk-ay603yys.js";import{$c}from"/$bunfs/root/chunk-wckxjewz.js";import{V4e}from"/$bunfs/root/chunk-b93xrf5w.js";import{oae,ye}from"/$bunfs/root/chunk-pw35yar9.js";import{pr}from"/$bunfs/root/chunk-3hxvvnfw.js";function M2t(){if(a.NODE_EXTRA_CA_CERTS)return;let n=i();if(n)process.env.NODE_EXTRA_CA_CERTS=n,t(`CA certs: Applied NODE_EXTRA_CA_CERTS from config to process.env: ${n}`)}function i(){try{if(a.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST&&!$c()&&V4e("NODE_EXTRA_CA_CERTS")){t("CA certs: skipping settings-sourced NODE_EXTRA_CA_CERTS under host-managed provider");return}if(oae())return;let e=le()?.env,o=(pr("userSettings")?ye("userSettings"):void 0)?.env;t(`CA certs: Config fallback - globalEnv keys: ${e?Object.keys(e).join(","):"none"}, settingsEnv keys: ${o?Object.keys(o).join(","):"none"}`);let r=o?.NODE_EXTRA_CA_CERTS||e?.NODE_EXTRA_CA_CERTS;if(r)t(`CA certs: Found NODE_EXTRA_CA_CERTS in config/settings: ${r}`);return r}catch(n){t(`CA certs: Config fallback failed: ${n}`,{level:"error"}),p("ca_certs_load","config_read_failed");return}}
export{M2t};
