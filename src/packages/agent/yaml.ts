// Forward shim — moved to @thyrox/config/yaml to support the
// frontmatterParser move that breaks the agent → config → agent cycle.
// New code should import from '@thyrox/config/yaml'.
export { parseYaml } from '@thyrox/config/yaml.js'
