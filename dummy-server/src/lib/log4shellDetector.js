
const LOG4SHELL_PATTERNS = [
  /\$\{jndi:/i,                          
  /\$\{j\$\{\}ndi:/i,                   
  /\$\{jndi:(ldap|rmi|dns|iiop|ldaps|dnsca):\/\//i,  
  /\$\{(\$\{\::-j\}|\$\{upper:j\})/i,  
  /\$\{lower:j\}\$\{lower:n\}\$\{lower:d\}\$\{lower:i\}/i
]


const SCANNED_HEADERS = [
  "user-agent",
  "x-api-version",
  "x-forwarded-for-original",
  "referer",
  "accept-language",
  "x-client-ip",
  "cf-connecting-ip",
  "true-client-ip",
  "x-originating-ip",
  "authorization"
]

export function detectLog4Shell(headers) {
  const matches = []

  for (const headerName of SCANNED_HEADERS) {
    const value = headers.get(headerName)
    if (!value) continue

    for (const pattern of LOG4SHELL_PATTERNS) {
      pattern.lastIndex = 0
      if (pattern.test(value)) {
        matches.push({
          header: headerName,
          value: value.substring(0, 500),
          pattern: pattern.toString()
        })
        break 
      }
    }
  }

  
  for (const [name, value] of headers.entries()) {
    if (SCANNED_HEADERS.includes(name)) continue
    if (/\$\{jndi:/i.test(value)) {
      matches.push({
        header: name,
        value: value.substring(0, 500),
        pattern: "catch-all jndi pattern"
      })
    }
  }

  return {
    detected: matches.length > 0,
    matches,
    match_count: matches.length
  }
}

export function extractJNDIUrl(value) {
  
  const match = value.match(
    /\$\{jndi:([^}]+)\}/i
  )
  return match ? match[1] : null
}
