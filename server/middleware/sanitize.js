var sanitizeHtml = require('sanitize-html');

// Trusted domains for iframe embeds
const TRUSTED_IFRAME_DOMAINS = [
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'facebook.com',
  'www.facebook.com',
  'fb.com',
  'vimeo.com',
  'player.vimeo.com',
  'dailymotion.com',
  'www.dailymotion.com',
  'instagram.com',
  'www.instagram.com',
  'twitter.com',
  'www.twitter.com',
  'x.com',
  'www.x.com'
];

// Function to validate iframe src URL
function isValidIframeSrc(src) {
  if (!src) return false;
  
  try {
    // Handle relative URLs (should not be allowed for iframes)
    if (src.startsWith('//')) {
      src = 'https:' + src;
    } else if (src.startsWith('/')) {
      return false; // Relative URLs not allowed
    } else if (!src.startsWith('http://') && !src.startsWith('https://')) {
      return false; // Must be http or https
    }
    
    const url = new URL(src);
    const hostname = url.hostname.toLowerCase().replace('www.', '');
    
    // Check if hostname matches any trusted domain
    return TRUSTED_IFRAME_DOMAINS.some(domain => {
      const cleanDomain = domain.replace('www.', '');
      return hostname === cleanDomain || hostname.endsWith('.' + cleanDomain);
    });
  } catch (e) {
    // Invalid URL format
    return false;
  }
}

// Sanitization configuration
const sanitizeConfig = {
  allowedTags: [
    'iframe', 'p', 'br', 'b', 'i', 'strong', 'em', 'u', 's', 'strike',
    'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'a', 'img', 'div', 'span', 'blockquote', 'pre', 'code',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr'
  ],
  allowedAttributes: {
    'iframe': ['src', 'width', 'height', 'frameborder', 'allow', 'allowfullscreen', 'class', 'id', 'style', 'title'],
    'a': ['href', 'target', 'rel', 'title'],
    'img': ['src', 'alt', 'title', 'width', 'height', 'class', 'id'],
    'div': ['class', 'id', 'style'],
    'span': ['class', 'id', 'style'],
    'p': ['class', 'id', 'style'],
    'h1': ['class', 'id'],
    'h2': ['class', 'id'],
    'h3': ['class', 'id'],
    'h4': ['class', 'id'],
    'h5': ['class', 'id'],
    'h6': ['class', 'id'],
    'table': ['class', 'id', 'style'],
    'td': ['class', 'id', 'style', 'colspan', 'rowspan'],
    'th': ['class', 'id', 'style', 'colspan', 'rowspan']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {
    iframe: ['http', 'https'],
    a: ['http', 'https', 'mailto'],
    img: ['http', 'https', 'data']
  },
  // Block all event handlers and dangerous attributes
  allowedStyles: {
    '*': {
      'color': [/^#[0-9a-fA-F]{3,6}$/, /^rgb/, /^rgba/],
      'text-align': [/^left$/, /^right$/, /^center$/, /^justify$/],
      'font-size': [/^\d+(?:px|em|rem|%)$/],
      'font-weight': [/^normal$/, /^bold$/, /^\d+$/],
      'text-decoration': [/^none$/, /^underline$/, /^line-through$/],
      'margin': [/^\d+(?:px|em|rem|%)$/],
      'padding': [/^\d+(?:px|em|rem|%)$/]
    }
  },
  // Custom transform for iframes to validate src
  transformTags: {
    'iframe': function(tagName, attribs) {
      // Validate iframe src
      if (attribs.src && isValidIframeSrc(attribs.src)) {
        return {
          tagName: 'iframe',
          attribs: attribs
        };
      }
      // Remove iframe if src is invalid
      return {
        tagName: false,
        attribs: {}
      };
    },
    'a': function(tagName, attribs) {
      // Ensure external links open in new tab
      if (attribs.href && attribs.href.startsWith('http')) {
        attribs.target = attribs.target || '_blank';
        attribs.rel = 'noopener noreferrer';
      }
      return {
        tagName: 'a',
        attribs: attribs
      };
    }
  },
  // Remove all script tags and dangerous elements
  exclusiveFilter: function(frame) {
    // Block script tags
    if (frame.tag === 'script') {
      return true;
    }
    // Block style tags with dangerous content
    if (frame.tag === 'style') {
      return true;
    }
    // Block iframes with invalid src
    if (frame.tag === 'iframe' && frame.attribs && frame.attribs.src) {
      return !isValidIframeSrc(frame.attribs.src);
    }
    return false;
  }
};

/**
 * Validate HTML content for unsupported/dangerous tags BEFORE sanitization
 * Returns error object if validation fails, null if valid
 * @param {string} html - HTML string to validate (original, unsanitized)
 * @returns {object|null} - { isValid: false, errors: [...] } or null if valid
 */
function validateHTML(html) {
  if (!html || typeof html !== 'string') {
    return null; // Empty content is valid
  }

  const errors = [];
  const allowedTags = sanitizeConfig.allowedTags;
  
  // List of dangerous tags that should be rejected
  const dangerousTags = [
    'script', 'style', 'object', 'embed', 'form', 'input', 'button',
    'select', 'textarea', 'marquee', 'applet', 'meta', 'link', 'base',
    'frame', 'frameset', 'noframes', 'noscript'
  ];

  // Check for dangerous tags (case-insensitive)
  dangerousTags.forEach(tag => {
    const regex = new RegExp(`<${tag}[\\s>]`, 'gi');
    if (regex.test(html)) {
      errors.push(`<${tag}> tag is not allowed.`);
    }
  });

  // Extract all HTML tags from the content to check for unsupported tags
  const tagRegex = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
  const foundTags = new Set();
  let match;
  
  while ((match = tagRegex.exec(html)) !== null) {
    const tagName = match[2].toLowerCase();
    // Check if tag is not in allowed list and not already flagged as dangerous
    if (!allowedTags.includes(tagName) && !dangerousTags.includes(tagName)) {
      foundTags.add(tagName);
    }
  }

  if (foundTags.size > 0) {
    const unsupportedTags = Array.from(foundTags);
    if (unsupportedTags.length === 1) {
      errors.push(`<${unsupportedTags[0]}> tag is not allowed.`);
    } else {
      errors.push(`<${unsupportedTags.join('>, <')}> tags are not allowed.`);
    }
  }

  // Check for event handlers (onclick, onerror, onload, etc.)
  const eventHandlerRegex = /\s(on\w+)\s*=/gi;
  const eventHandlers = [];
  let eventMatch;
  while ((eventMatch = eventHandlerRegex.exec(html)) !== null) {
    eventHandlers.push(eventMatch[1]);
  }
  if (eventHandlers.length > 0) {
    const uniqueHandlers = [...new Set(eventHandlers)];
    if (uniqueHandlers.length === 1) {
      errors.push(`${uniqueHandlers[0]} event handler is not allowed.`);
    } else {
      errors.push(`${uniqueHandlers.join(', ')} event handlers are not allowed.`);
    }
  }

  // Check for javascript: URLs
  const javascriptUrlRegex = /javascript\s*:/gi;
  if (javascriptUrlRegex.test(html)) {
    errors.push('javascript: URLs are not allowed.');
  }

  // Check for iframes with untrusted domains
  const iframeRegex = /<iframe[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
  const untrustedIframes = [];
  let iframeMatch;
  while ((iframeMatch = iframeRegex.exec(html)) !== null) {
    const src = iframeMatch[1];
    if (!isValidIframeSrc(src)) {
      untrustedIframes.push(src);
    }
  }
  if (untrustedIframes.length > 0) {
    errors.push('Iframe from untrusted domain is not allowed. Only iframes from trusted domains (YouTube, Facebook, Vimeo, Instagram, Twitter, etc.) are permitted.');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors: errors
    };
  }

  return null; // Valid content
}

/**
 * Validate plain text (should not contain any HTML tags)
 * @param {string} text - Text to validate (original, unsanitized)
 * @returns {object|null} - { isValid: false, errors: [...] } or null if valid
 */
function validateText(text) {
  if (!text || typeof text !== 'string') {
    return null; // Empty content is valid
  }

  const errors = [];
  
  // Check for any HTML tags
  const htmlTagRegex = /<[^>]+>/g;
  if (htmlTagRegex.test(text)) {
    errors.push('HTML tags are not allowed in the name field. Please use plain text only.');
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      errors: errors
    };
  }

  return null; // Valid content
}

/**
 * Sanitize HTML content
 * Allows safe HTML tags and iframes from trusted domains only
 * @param {string} dirty - Unsanitized HTML string
 * @returns {string} - Sanitized HTML string
 */
function sanitizeHTML(dirty) {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }
  
  // First pass: sanitize with configuration
  let clean = sanitizeHtml(dirty, sanitizeConfig);
  
  // Second pass: Additional validation for iframes
  // Remove any iframes that might have slipped through
  const iframeRegex = /<iframe[^>]+src=["']([^"']+)["'][^>]*>/gi;
  clean = clean.replace(iframeRegex, function(match, src) {
    if (isValidIframeSrc(src)) {
      return match;
    }
    return ''; // Remove iframe from untrusted source
  });
  
  return clean;
}

/**
 * Sanitize plain text (removes all HTML)
 * Use this for fields that should only contain text
 * @param {string} dirty - Unsanitized string
 * @returns {string} - Plain text string
 */
function sanitizeText(dirty) {
  if (!dirty || typeof dirty !== 'string') {
    return '';
  }
  
  // Remove all HTML tags, keep only text
  return sanitizeHtml(dirty, {
    allowedTags: [],
    allowedAttributes: {}
  }).trim();
}

module.exports = {
  sanitizeHTML,
  sanitizeText,
  validateHTML,
  validateText,
  isValidIframeSrc,
  TRUSTED_IFRAME_DOMAINS
};

