// Serializer for JSON-LD <script> bodies.
//
// Plain `JSON.stringify` does not escape `</script>`, so user-controlled fields
// embedded in the schema can terminate the enclosing script tag and inject
// arbitrary HTML — this was XSS-VULN-01 / XSS-VULN-02. We also escape the
// two JS line separators (\u2028 / \u2029) because some engines treat them
// as line terminators inside string literals.
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
