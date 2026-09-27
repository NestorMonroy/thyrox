// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.283
import{p}from"/$bunfs/root/chunk-d09a8ccq.js";import{le}from"/$bunfs/root/chunk-t6pwageh.js";import{t}from"/$bunfs/root/chunk-zkn0228z.js";import{a}from"/$bunfs/root/chunk-v49zfq06.js";import{Gc}from"/$bunfs/root/chunk-jwddn0q9.js";import{KYe}from"/$bunfs/root/chunk-379zyrv7.js";import{ar}from"/$bunfs/root/chunk-sctj0cwn.js";import{L1,he}from"/$bunfs/root/chunk-ckctvm5v.js";function xYt(){if(a.NODE_EXTRA_CA_CERTS)return;let n=i();if(n)process.env.NODE_EXTRA_CA_CERTS=n,t(`CA certs: Applied NODE_EXTRA_CA_CERTS from config to process.env: ${n}`)}function i(){try{if(a.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST&&!Gc()&&KYe("NODE_EXTRA_CA_CERTS")){t("CA certs: skipping settings-sourced NODE_EXTRA_CA_CERTS under host-managed provider");return}if(L1())return;let e=le()?.env,o=(ar("userSettings")?he("userSettings"):void 0)?.env;t(`CA certs: Config fallback - globalEnv keys: ${e?Object.keys(e).join(","):"none"}, settingsEnv keys: ${o?Object.keys(o).join(","):"none"}`);let r=o?.NODE_EXTRA_CA_CERTS||e?.NODE_EXTRA_CA_CERTS;if(r)t(`CA certs: Found NODE_EXTRA_CA_CERTS in config/settings: ${r}`);return r}catch(n){t(`CA certs: Config fallback failed: ${n}`,{level:"error"}),p("ca_certs_load","config_read_failed");return}}
export{xYt};
