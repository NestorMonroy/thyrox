// @bun @bytecode
// Claude Code is a Beta product per Anthropic's Commercial Terms of Service.
// By using Claude Code, you agree that all code acceptance or rejection decisions you make,
// and the associated conversations in context, constitute Feedback under Anthropic's Commercial Terms,
// and may be used to improve Anthropic's products, including training models.
// You are responsible for reviewing any code suggestions before use.

// (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.

// Version: 2.1.286
import{pU}from"/$bunfs/root/chunk-4hjp8tw4.js";import{p}from"/$bunfs/root/chunk-159k5j1y.js";import{E,u}from"/$bunfs/root/chunk-cgbfr9c2.js";var e={non_exclusive_heartbeat_interval_ms:0,multisession_poll_interval_ms_not_at_capacity:2000,multisession_poll_interval_ms_partial_capacity:2000,multisession_poll_interval_ms_at_capacity:600000,reclaim_older_than_ms:5000,session_keepalive_interval_v2_ms:120000};var a={message:"must be 0 (disabled) or \u2265100ms"},i=p(()=>u({non_exclusive_heartbeat_interval_ms:E().int().min(0).default(0),multisession_poll_interval_ms_not_at_capacity:E().int().min(100).default(e.multisession_poll_interval_ms_not_at_capacity),multisession_poll_interval_ms_partial_capacity:E().int().min(100).default(e.multisession_poll_interval_ms_partial_capacity),multisession_poll_interval_ms_at_capacity:E().int().refine((_)=>_===0||_>=100,a).default(e.multisession_poll_interval_ms_at_capacity),reclaim_older_than_ms:E().int().min(1).default(5000),session_keepalive_interval_v2_ms:E().int().min(0).default(120000)}).refine((_)=>_.non_exclusive_heartbeat_interval_ms>0||_.multisession_poll_interval_ms_at_capacity>0,{message:"at-capacity liveness requires non_exclusive_heartbeat_interval_ms > 0 or multisession_poll_interval_ms_at_capacity > 0"}));function dve(){let _=pU("tengu_bridge_poll_interval_config",e,300000),t=i().safeParse(_);return t.success?t.data:e}
export{dve};
