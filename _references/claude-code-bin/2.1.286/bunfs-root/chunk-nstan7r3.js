// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{f}from"/$bunfs/root/chunk-gm7a1q0z.js";import{ce}from"/$bunfs/root/chunk-4hjp8tw4.js";import{t}from"/$bunfs/root/chunk-6w550002.js";import{a}from"/$bunfs/root/chunk-v5r4yd9z.js";import{Kc}from"/$bunfs/root/chunk-wk88sc60.js";import{rJe}from"/$bunfs/root/chunk-v67w5hxq.js";import{Jn}from"/$bunfs/root/chunk-3fx39wvj.js";import{Pj,ge}from"/$bunfs/root/chunk-j27hwf9z.js";function MJt(){if(a.NODE_EXTRA_CA_CERTS)return;let n=i();if(n)process.env.NODE_EXTRA_CA_CERTS=n,t(`CA certs: Applied NODE_EXTRA_CA_CERTS from config to process.env: ${n}`)}function i(){try{if(a.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST&&!Kc()&&rJe("NODE_EXTRA_CA_CERTS")){t("CA certs: skipping settings-sourced NODE_EXTRA_CA_CERTS under host-managed provider");return}if(Pj())return;let e=ce()?.env,o=(Jn("userSettings")?ge("userSettings"):void 0)?.env;t(`CA certs: Config fallback - globalEnv keys: ${e?Object.keys(e).join(","):"none"}, settingsEnv keys: ${o?Object.keys(o).join(","):"none"}`);let r=o?.NODE_EXTRA_CA_CERTS||e?.NODE_EXTRA_CA_CERTS;if(r)t(`CA certs: Found NODE_EXTRA_CA_CERTS in config/settings: ${r}`);return r}catch(n){t(`CA certs: Config fallback failed: ${n}`,{level:"error"}),f("ca_certs_load","config_read_failed");return}}
export{MJt};
