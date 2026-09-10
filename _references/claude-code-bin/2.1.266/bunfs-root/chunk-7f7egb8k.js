// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.266
import{g}from"/$bunfs/root/chunk-dzyeyv65.js";import{ne}from"/$bunfs/root/chunk-btbsn9s4.js";import{t}from"/$bunfs/root/chunk-fy3j7rz0.js";import{a}from"/$bunfs/root/chunk-9fmxymtw.js";import{od}from"/$bunfs/root/chunk-kgqcj5g2.js";import{Nr,Xxe}from"/$bunfs/root/chunk-hfjb09vk.js";import{_e}from"/$bunfs/root/chunk-kcxa79n8.js";function Nit(){if(a.NODE_EXTRA_CA_CERTS)return;let e=i();if(e)process.env.NODE_EXTRA_CA_CERTS=e,t(`CA certs: Applied NODE_EXTRA_CA_CERTS from config to process.env: ${e}`)}function i(){try{if(a.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST&&!od()&&Xxe("NODE_EXTRA_CA_CERTS")){t("CA certs: skipping settings-sourced NODE_EXTRA_CA_CERTS under host-managed provider");return}let n=ne()?.env,o=(Nr("userSettings")?_e("userSettings"):void 0)?.env;t(`CA certs: Config fallback - globalEnv keys: ${n?Object.keys(n).join(","):"none"}, settingsEnv keys: ${o?Object.keys(o).join(","):"none"}`);let r=o?.NODE_EXTRA_CA_CERTS||n?.NODE_EXTRA_CA_CERTS;if(r)t(`CA certs: Found NODE_EXTRA_CA_CERTS in config/settings: ${r}`);return r}catch(e){t(`CA certs: Config fallback failed: ${e}`,{level:"error"}),g("ca_certs_load","config_read_failed");return}}
export{Nit};
