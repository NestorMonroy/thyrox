// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.261
import{g}from"/$bunfs/root/chunk-vvf2tdhs.js";import{ee}from"/$bunfs/root/chunk-hyqdn9c0.js";import{n}from"/$bunfs/root/chunk-y5pwxex8.js";import{a}from"/$bunfs/root/chunk-a207t0vs.js";import{Rd}from"/$bunfs/root/chunk-s0879eds.js";import{Or,nCe}from"/$bunfs/root/chunk-tcap6yb8.js";import{_e}from"/$bunfs/root/chunk-2e0agwm9.js";function aot(){if(a.NODE_EXTRA_CA_CERTS)return;let e=i();if(e)process.env.NODE_EXTRA_CA_CERTS=e,n(`CA certs: Applied NODE_EXTRA_CA_CERTS from config to process.env: ${e}`)}function i(){try{if(a.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST&&!Rd()&&nCe("NODE_EXTRA_CA_CERTS")){n("CA certs: skipping settings-sourced NODE_EXTRA_CA_CERTS under host-managed provider");return}let t=ee()?.env,o=(Or("userSettings")?_e("userSettings"):void 0)?.env;n(`CA certs: Config fallback - globalEnv keys: ${t?Object.keys(t).join(","):"none"}, settingsEnv keys: ${o?Object.keys(o).join(","):"none"}`);let r=o?.NODE_EXTRA_CA_CERTS||t?.NODE_EXTRA_CA_CERTS;if(r)n(`CA certs: Found NODE_EXTRA_CA_CERTS in config/settings: ${r}`);return r}catch(e){n(`CA certs: Config fallback failed: ${e}`,{level:"error"}),g("ca_certs_load","config_read_failed");return}}
export{aot};
