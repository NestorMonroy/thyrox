// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.285
import{f}from"/$bunfs/root/chunk-dpwtsz9f.js";import{ce}from"/$bunfs/root/chunk-f74xvn8g.js";import{t}from"/$bunfs/root/chunk-055ns4k8.js";import{a}from"/$bunfs/root/chunk-5054mktj.js";import{jc}from"/$bunfs/root/chunk-gph9jdam.js";import{I9e}from"/$bunfs/root/chunk-srhvbygf.js";import{Kn}from"/$bunfs/root/chunk-xzfbbx57.js";import{nj,ge}from"/$bunfs/root/chunk-g6a51st9.js";function u9t(){if(a.NODE_EXTRA_CA_CERTS)return;let n=i();if(n)process.env.NODE_EXTRA_CA_CERTS=n,t(`CA certs: Applied NODE_EXTRA_CA_CERTS from config to process.env: ${n}`)}function i(){try{if(a.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST&&!jc()&&I9e("NODE_EXTRA_CA_CERTS")){t("CA certs: skipping settings-sourced NODE_EXTRA_CA_CERTS under host-managed provider");return}if(nj())return;let e=ce()?.env,o=(Kn("userSettings")?ge("userSettings"):void 0)?.env;t(`CA certs: Config fallback - globalEnv keys: ${e?Object.keys(e).join(","):"none"}, settingsEnv keys: ${o?Object.keys(o).join(","):"none"}`);let r=o?.NODE_EXTRA_CA_CERTS||e?.NODE_EXTRA_CA_CERTS;if(r)t(`CA certs: Found NODE_EXTRA_CA_CERTS in config/settings: ${r}`);return r}catch(n){t(`CA certs: Config fallback failed: ${n}`,{level:"error"}),f("ca_certs_load","config_read_failed");return}}
export{u9t};
