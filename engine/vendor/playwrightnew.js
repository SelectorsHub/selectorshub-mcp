/**
 * Created by sanjay kumar on 25/05/2025.
 * Enhanced with first() and last() support
 * UPDATED: Added support for legacy >> operator and modern chaining alternatives
 * FIXED: Proper shadow DOM support for chained selectors like .locator().getByRole()
 * UPDATED: Added .and() / .or() operator support (intersection / union)
 */

function generatePlaywrightSelectors(element) {
  if (!element) {
    throw new Error('Please provide a valid DOM element');
  }

  const selectors = [];
  const context = analyzeElementContext(element);

  // Generate all selector types
  generateAllSelectors(element, selectors, context);

  // Custom sorting logic for shadow DOM elements
  if (context.isInShadowRoot) {
    // For shadow DOM: prioritize ID and CSS selectors, then sort by count
    selectors.sort((a, b) => {
      // Check if selector contains ID selector
      const aHasId = a.selector.includes('locator(\'#') || a.selector.includes('locator("#');
      const bHasId = b.selector.includes('locator(\'#') || b.selector.includes('locator("#');
      
      // Prioritize ID selectors
      if (aHasId && !bHasId) return -1;
      if (!aHasId && bHasId) return 1;
      
      // Check if selector is CSS class selector (but not XPath or complex selectors)
      const aIsCss = a.selector.includes('locator(') && 
                     !a.selector.includes('getBy') && 
                     !a.selector.includes('//') &&
                     !a.selector.includes(':has-text');
      const bIsCss = b.selector.includes('locator(') && 
                     !b.selector.includes('getBy') && 
                     !b.selector.includes('//') &&
                     !b.selector.includes(':has-text');
      
      // Prioritize CSS locators
      if (aIsCss && !bIsCss) return -1;
      if (!aIsCss && bIsCss) return 1;
      
      // For same type, sort by count (lowest first)
      return a.count - b.count;
    });
  } else {
    // For non-shadow DOM: sort by match count only (lowest first)
    selectors.sort((a, b) => a.count - b.count);
  }

  return selectors;
}

function convertJavaToJavaScript(javaSelector) {
  if (!javaSelector.includes('AriaRole.') && !javaSelector.includes('.set') && 
      !javaSelector.includes('new ') && javaSelector.includes('page.')) {
    return javaSelector;
  }
  
  let jsSelector = javaSelector;
  
  // Convert AriaRole.BUTTON.setName("text") pattern (shorthand)
  jsSelector = jsSelector.replace(
    /getByRole\(AriaRole\.(\w+)\.setName\((["'])([^"']+)\2\)\)/g, 
    (match, role, quote, name) => `getByRole('${role.toLowerCase()}', { name: '${name.replace(/'/g, "\\'")}' })`
  );
  
  // Convert standalone AriaRole.BUTTON (without setName)
  jsSelector = jsSelector.replace(
    /getByRole\(AriaRole\.(\w+)\)(?!\.)/g, 
    (match, role) => `getByRole('${role.toLowerCase()}')`
  );
  
  // Convert Java builder pattern for getByRole with options
  // Pattern: getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("text"))
  jsSelector = jsSelector.replace(
    /getByRole\(AriaRole\.(\w+),\s*new\s+Page\.GetByRoleOptions\(\)((?:\.\w+\([^)]*\))+)\)/g,
    (match, role, optionChain) => {
      const options = parseJavaOptionChain(optionChain);
      const jsOptions = Object.entries(options)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      return `getByRole('${role.toLowerCase()}', { ${jsOptions} })`;
    }
  );
  
  // Convert Java builder pattern for all other getBy* methods
  // Pattern: getByMethod("value", new Page.GetByMethodOptions().setOption(value))
  jsSelector = jsSelector.replace(
    /(getBy(?:Text|Label|Placeholder|Title|AltText))\((["'])([^"']+)\2,\s*new\s+Page\.\w+Options\(\)((?:\.\w+\([^)]*\))+)\)/g,
    (match, method, quote, mainArg, optionChain) => {
      const options = parseJavaOptionChain(optionChain);
      const jsOptions = Object.entries(options)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      return `${method}('${mainArg.replace(/'/g, "\\'")}', { ${jsOptions} })`;
    }
  );
  
  // Convert simple getBy* methods without options (but not getByRole which was already handled)
  jsSelector = jsSelector.replace(
    /(getBy(?:Text|Label|Placeholder|Title|AltText|TestId))\((["'])([^"']+)\2\)/g,
    (match, method, quote, arg) => `${method}('${arg.replace(/'/g, "\\'")}')` 
  );
  
  return jsSelector.trim().startsWith('page') ? jsSelector : 'page.' + jsSelector.replace(/^\.+/, '');
}

/**
 * Parse Java option chain like .setExact(true).setName("text")
 * @param {string} optionChain - The chain of setter methods
 * @returns {Object} JavaScript options object
 */
function parseJavaOptionChain(optionChain) {
  const options = {};
  const optionMatches = optionChain.matchAll(/\.set(\w+)\(([^)]+)\)/g);
  
  for (const optMatch of optionMatches) {
    const optionName = optMatch[1];
    const optionValue = optMatch[2].trim();
    
    // Convert option name from SetExact to exact
    const jsOptionName = optionName.charAt(0).toLowerCase() + optionName.slice(1);
    
    // Parse option value
    if (optionValue === 'true' || optionValue === 'false') {
      options[jsOptionName] = optionValue;
    } else if (optionValue.match(/^["'](.+?)["']$/)) {
      // String value
      const stringValue = optionValue.slice(1, -1);
      options[jsOptionName] = `'${stringValue.replace(/'/g, "\\'")}'`;
    } else if (optionValue.match(/^\d+$/)) {
      // Numeric value
      options[jsOptionName] = optionValue;
    } else {
      // Other values (keep as-is)
      options[jsOptionName] = optionValue;
    }
  }
  
  return options;
}


/**
 * Count matches for a Playwright selector string
 * ENHANCED: Added support for Python Playwright locators
 * @param {string} selectorString - Playwright selector (JavaScript or Python)
 * @returns {number} Number of matching elements
 */
function countSelectorMatches(selectorString) {
  try {
    
    // Convert C# syntax to JavaScript first ✨ NEW
    selectorString = convertCSharpToJavaScript(selectorString);

    // Convert Python syntax to JavaScript first
    selectorString = convertPythonToJavaScript(selectorString);
    
    // Convert Java syntax to JavaScript
    selectorString = convertJavaToJavaScript(selectorString);
    
    // Normalize legacy >> operator
    selectorString = normalizeLegacyOperators(selectorString);
    
    // Validate selector syntax
    const validation = validateSelectorSyntax(selectorString);
    if (!validation.isValid) {
      return 0;
    }
    
    // Parse the selector to find context (iframe/shadow)
    const context = parseSelectorContext(selectorString);
    
    // Get the root document/shadowRoot to search in
    let rootContext = navigateToContext(context);
    if (!rootContext) return 0;

    // Extract the actual selector part (preserving frameLocator)
    const cleanSelector = extractCleanSelector(selectorString);
    
    // If selector has frameLocator, we need to handle it differently
    if (cleanSelector.includes('frameLocator')) {
      // Extract the final selector after all frameLocators
      const parts = cleanSelector.split(/\.frameLocator\([^)]+\)/);
      const finalSelector = parts[parts.length - 1];
      // Execute count on the final part in the correct context
      return executeCount('page' + finalSelector, rootContext);
    }
    
    // Execute count
    return executeCount(cleanSelector, rootContext);
  } catch (e) {
    console.error('Error in countSelectorMatches:', e);
    return 0;
  }
}

/**
 * Normalize legacy Playwright operators to modern equivalents
 * Handles the >> operator (deprecated) and converts to modern chaining
 * @param {string} selectorString - Original selector string
 * @returns {string} Normalized selector string
 */
function normalizeLegacyOperators(selectorString) {
  // Check if selector contains legacy >> operator
  if (!selectorString.includes('>>')) {
    return selectorString;
  }

  // Extract the base locator call
  const locatorMatch = selectorString.match(/page\.locator\(["'`]([^"'`]+)["'`]\)/);
  if (!locatorMatch) {
    return selectorString;
  }

  const fullLocator = locatorMatch[1];
  
  // Split by >> operator
  const parts = fullLocator.split('>>').map(p => p.trim());
  
  if (parts.length === 1) {
    return selectorString;
  }

  // Build modern chained selector
  let modernSelector = 'page';
  
  parts.forEach((part, index) => {
    // Handle text= syntax
    if (part.startsWith('text=')) {
      const text = part.substring(5);
      modernSelector += `.getByText('${text}')`;
    }
    // Handle regular CSS selectors
    else {
      modernSelector += `.locator('${part}')`;
    }
  });

  return modernSelector;
}

/**
 * Validate Playwright selector syntax
 * ENHANCED: Added validation for legacy >> operator
 * @param {string} selectorString - Playwright selector
 * @returns {Object} {isValid: boolean, error: string|null}
 */
function validateSelectorSyntax(selectorString) {
  // Check if selector starts with 'page'
  if (!selectorString.trim().startsWith('page')) {
    return {
      isValid: false,
      error: 'Selector must start with "page" (e.g., page.locator(...) or page.getByRole(...))'
    };
  }

  // Check for legacy >> operator
  if (selectorString.includes('>>')) {
    return {
      isValid: false,
      error: 'Legacy >> operator detected. Use modern chaining: page.locator("div").locator("text=Company") or page.locator("div").filter({ hasText: "Company" })'
    };
  }

  // Check for common syntax errors
  const errors = [];

  // 1. Check for unclosed quotes with better context
  const singleQuotes = (selectorString.match(/'/g) || []).length;
  const doubleQuotes = (selectorString.match(/"/g) || []).length;
  const backticks = (selectorString.match(/`/g) || []).length;
  
  if (singleQuotes % 2 !== 0) {
    errors.push("Unclosed single quote (')");
  }
  if (doubleQuotes % 2 !== 0) {
    errors.push('Unclosed double quote (")');
  }
  if (backticks % 2 !== 0) {
    errors.push('Unclosed backtick (`). Template literals must be closed with a matching backtick.');
  }

  // 2. Check for unclosed parentheses
  const openParens = (selectorString.match(/\(/g) || []).length;
  const closeParens = (selectorString.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    if (openParens > closeParens) {
      errors.push(`Missing ${openParens - closeParens} closing parenthesis${openParens - closeParens > 1 ? 'es' : ''} ")"`);
    } else {
      errors.push(`Extra ${closeParens - openParens} closing parenthesis${closeParens - openParens > 1 ? 'es' : ''} ")"`);
    }
  }

  // 3. Check for unclosed brackets
  const openBrackets = (selectorString.match(/\[/g) || []).length;
  const closeBrackets = (selectorString.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    if (openBrackets > closeBrackets) {
      errors.push(`Missing ${openBrackets - closeBrackets} closing bracket${openBrackets - closeBrackets > 1 ? 's' : ''} "]"`);
    } else {
      errors.push(`Extra ${closeBrackets - openBrackets} closing bracket${closeBrackets - openBrackets > 1 ? 's' : ''} "]"`);
    }
  }

  // 4. Check for unclosed braces
  const openBraces = (selectorString.match(/\{/g) || []).length;
  const closeBraces = (selectorString.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    if (openBraces > closeBraces) {
      errors.push(`Missing ${openBraces - closeBraces} closing brace${openBraces - closeBraces > 1 ? 's' : ''} "}"`);
    } else {
      errors.push(`Extra ${closeBraces - openBraces} closing brace${closeBraces - openBraces > 1 ? 's' : ''} "}"`);
    }
  }

  // 5. Check for valid Playwright methods
  const validMethods = [
    'getByRole', 'getByText', 'getByLabel', 'getByPlaceholder', 
    'getByAltText', 'getByTitle', 'getByTestId', 'locator',
    'frameLocator', 'filter', 'nth', 'first', 'last', 'and', 'or'
  ];
  
  const methodPattern = /\.([\w]+)\(/g;
  const methods = [];
  let match;
  while ((match = methodPattern.exec(selectorString)) !== null) {
    methods.push(match[1]);
  }
  
  const invalidMethods = methods.filter(m => !validMethods.includes(m));
  if (invalidMethods.length > 0) {
    errors.push(`Invalid Playwright method(s): ${invalidMethods.join(', ')}. Valid methods: ${validMethods.join(', ')}`);
  }

  // 6. Special check for template literal locator
  if (selectorString.includes('locator`')) {
    // Check if template literal is properly closed
    const locatorMatch = selectorString.match(/locator`/g);
    const closingBacktickAfterLocator = selectorString.substring(selectorString.indexOf('locator`') + 7).includes('`');
    
    if (locatorMatch && !closingBacktickAfterLocator) {
      errors.push('Template literal in locator` is not closed. Add a closing backtick (`) at the end.');
    }
  }

  // 7. Check XPath syntax if present
  if (selectorString.includes('//') || selectorString.includes('//*')) {
    // Try different patterns for template literals and regular strings
    let xpathMatch = selectorString.match(/locator`([^`]+)`/); // Template literal
    if (!xpathMatch) xpathMatch = selectorString.match(/locator\('([^']+)'\)/); // Single quotes
    if (!xpathMatch) xpathMatch = selectorString.match(/locator\("([^"]+)"\)/); // Double quotes
    
    if (xpathMatch && xpathMatch[1]) {
      const xpath = xpathMatch[1];
      if (xpath.startsWith('//') || xpath.startsWith('//*')) {
        try {
          // Try to evaluate XPath to check syntax
          document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        } catch (e) {
          errors.push(`Invalid XPath: ${e.message}`);
        }
      }
    } else if (selectorString.includes('//')) {
      // XPath present but couldn't extract - likely syntax error
      errors.push('Could not parse XPath. Check that the locator string is properly formatted.');
    }
  }

  // 8. Check CSS selector syntax if present
  if (selectorString.includes('locator')) {
    // Try different patterns for template literals and regular strings
    let cssMatch = selectorString.match(/locator`([^`]+)`/); // Template literal
    if (!cssMatch) cssMatch = selectorString.match(/locator\('([^']+)'\)/); // Single quotes
    if (!cssMatch) cssMatch = selectorString.match(/locator\("([^"]+)"\)/); // Double quotes
    
    if (cssMatch && cssMatch[1]) {
      const selector = cssMatch[1];
      // Only validate if it's not XPath, has-text, or other Playwright-specific pseudo-classes
      const playwrightPseudoClasses = [':has-text(', ':text-is(', ':text(', ':has(', ':is(', ':visible', ':hidden'];
      const hasPlaywrightPseudo = playwrightPseudoClasses.some(pseudo => selector.includes(pseudo));
      
      if (!selector.startsWith('//') && !selector.startsWith('//*') && !hasPlaywrightPseudo) {
        try {
          // Playwright allows a leading combinator in a chained locator (e.g. .locator('+ td'),
          // .locator('> span'), .locator('~ li')) - it means "relative to the previous match"
          // (an implicit :scope). The browser rejects it on its own, so check it as ':scope + td'.
          const trimmed = selector.trim();
          document.querySelector(/^[>+~]/.test(trimmed) ? ':scope ' + trimmed : selector);
        } catch (e) {
          errors.push(`Invalid CSS selector: ${e.message}`);
        }
      }
    }
  }

  // 9. Check filter syntax
  if (selectorString.includes('.filter(')) {
    if (!selectorString.match(/\.filter\(\s*\{/)) {
      errors.push('Invalid filter syntax. Expected: .filter({ hasText: "..." }) or .filter({ has: ... })');
    }
  }

  // 10. Provide helpful suggestions for common mistakes
  if (backticks % 2 !== 0 && selectorString.includes('locator`')) {
    const example = selectorString.includes('//') 
      ? "page.locator`//tr[td[contains(., 'text')]]//button`" 
      : "page.locator`.my-class`";
    errors.push(`Example of correct template literal syntax: ${example}`);
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      error: errors.join('\n• ')
    };
  }

  return {
    isValid: true,
    error: null
  };
}

/**
 * Parse selector context (iframe chain and shadow root chain)
 * ENHANCED: Handles mixed shadow DOM and iframe contexts
 * FIXED: Don't treat chained locators as shadow DOM - they're just descendant selectors!
 */
function parseSelectorContext(selectorString) {
  const context = {
    iframeSelectors: [],
    shadowSelectors: [],
    hasIframe: false,
    hasShadow: false,
    mixedChain: [] // Track the order: [{type: 'shadow'|'frame', selector: '...'}]
  };

  // IMPORTANT: Chained .locator() calls are NOT shadow DOM traversal!
  // Playwright pierces shadow DOM automatically for ALL locators.
  // We ONLY need to track frameLocator() for iframe navigation.
  
  const allMatches = [];
  
  // Pattern 1: Match single-quoted locators/frameLocators
  const singleQuotePattern = /\.(frameLocator|locator)\('([^']*)'\)/g;
  let match;
  
  while ((match = singleQuotePattern.exec(selectorString)) !== null) {
    allMatches.push({
      type: match[1],
      selector: match[2],
      index: match.index,
      lastIndex: singleQuotePattern.lastIndex
    });
  }
  
  // Pattern 2: Match double-quoted locators/frameLocators
  const doubleQuotePattern = /\.(frameLocator|locator)\("([^"]*)"\)/g;
  while ((match = doubleQuotePattern.exec(selectorString)) !== null) {
    allMatches.push({
      type: match[1],
      selector: match[2],
      index: match.index,
      lastIndex: doubleQuotePattern.lastIndex
    });
  }
  
  // Pattern 3: Match template literal locators/frameLocators (backticks)
  const backtickPattern = /\.(frameLocator|locator)`([^`]*)`/g;
  while ((match = backtickPattern.exec(selectorString)) !== null) {
    allMatches.push({
      type: match[1],
      selector: match[2],
      index: match.index,
      lastIndex: backtickPattern.lastIndex
    });
  }
  
  // Sort matches by their position in the string
  allMatches.sort((a, b) => a.index - b.index);
  
  // Process matches - ONLY track frameLocator for iframes
  allMatches.forEach((match, idx) => {
    if (match.type === 'frameLocator') {
      context.iframeSelectors.push(match.selector);
      context.hasIframe = true;
      context.mixedChain.push({ type: 'iframe', selector: match.selector });
    }
    // NOTE: We don't track .locator() as shadow DOM anymore!
    // Playwright automatically pierces shadow DOM for all locators.
    // Chained .locator() calls are just descendant selectors.
  });

  return context;
}

/**
 * Navigate to the correct context (iframe/shadow root)
 * ENHANCED: Handles iframes inside shadow DOM by processing in correct order
 * FIXED: Use shadow piercing to find iframes
 */
function navigateToContext(context) {
  let currentContext = document;

  // If we have a mixed chain, process in order
  if (context.mixedChain && context.mixedChain.length > 0) {
    for (const item of context.mixedChain) {
      try {
        if (item.type === 'shadow') {
          // Navigate into shadow DOM - find host using shadow piercing
          const host = querySelectorAllDeep(item.selector, currentContext)[0];
          if (!host || !host.shadowRoot) return null;
          currentContext = host.shadowRoot;
        } else if (item.type === 'iframe') {
          // Navigate into iframe - use shadow piercing to find it
          const frame = querySelectorAllDeep(item.selector, currentContext)[0];
          if (!frame) return null;
          currentContext = frame.contentDocument || frame.contentWindow?.document;
          if (!currentContext) return null;
        }
      } catch (e) {
        return null; // Cross-origin or not accessible
      }
    }
    return currentContext;
  }

  // Fallback to original logic
  // Navigate through iframes - use shadow piercing to find them
  if (context.hasIframe) {
    for (const frameSelector of context.iframeSelectors) {
      try {
        // FIXED: Use shadow piercing to find iframe
        const frame = querySelectorAllDeep(frameSelector, currentContext)[0];
        if (!frame) return null;
        currentContext = frame.contentDocument || frame.contentWindow?.document;
        if (!currentContext) return null;
      } catch (e) {
        return null; // Cross-origin or not accessible
      }
    }
  }

  // Shadow DOM is handled by querySelectorAllDeep, no need to navigate

  return currentContext;
}

/**
 * Extract the clean selector from a Playwright selector string
 * ENHANCED: Handle chained locators, getByText, filters, and frameLocator
 * FIXED: Properly preserve frameLocator for iframe navigation AND chained locators with nth()
 */
function extractCleanSelector(selectorString) {
  // Remove page prefix but keep everything else
  let cleaned = selectorString;
  
  // Just remove the 'page.' prefix - keep frameLocator chains intact
  cleaned = cleaned.replace(/^page\./, '');

  // Check if it has .and() / .or() operators - preserve the entire chain
  if (cleaned.match(/\.(and|or)\(/)) {
    return 'page.' + cleaned;
  }
  
  // Check if it has .filter() - if so, preserve the entire chain
  if (cleaned.includes('.filter(')) {
    return 'page.' + cleaned;
  }
  
  // Check if it has .first(), .last(), .nth() - if so, preserve the entire chain
  if (cleaned.match(/\.(first|last|nth)\(/)) {
    return 'page.' + cleaned;
  }
  
  // Check if it has frameLocator - preserve the entire chain
  if (cleaned.includes('frameLocator')) {
    return 'page.' + cleaned;
  }
  
  // CRITICAL FIX: If it has chained locators (multiple .locator() calls), preserve the entire chain
  const chainedLocators = cleaned.match(/\.locator\([^)]+\)/g);
  const chainedGetBy = cleaned.match(/\.(getByText|getByRole|getByLabel)\([^)]+\)/g);
  
  if (chainedLocators && chainedLocators.length > 1) {
    // Return the full chain as-is for proper execution
    return 'page.' + cleaned;
  }
  
  if (chainedGetBy) {
    // Return the full chain as-is
    return 'page.' + cleaned;
  }
  
  // Handle single getBy methods
  const lastGetBy = cleaned.match(/(getBy[A-Za-z]+\(.+\))$/);
  const lastLocator = cleaned.match(/locator\((['"`])(.+?)\1\)(?!.*locator)/);
  
  if (lastGetBy) {
    return 'page.' + lastGetBy[1];
  } else if (lastLocator) {
    return 'page.locator(' + lastLocator[1] + lastLocator[2] + lastLocator[1] + ')';
  }
  
  // Handle chained locators - keep the last one
  const locatorMatches = Array.from(cleaned.matchAll(/locator\((['"`])(.+?)\1\)/g));
  if (locatorMatches.length > 0) {
    const last = locatorMatches[locatorMatches.length - 1];
    return 'page.locator(' + last[1] + last[2] + last[1] + ')';
  }
  
  return cleaned.startsWith('page.') ? cleaned : 'page.' + cleaned;
}

/**
 * Analyze element context (iframe, shadow root, svg)
 * ENHANCED: Handles iframes inside shadow DOM
 */
function analyzeElementContext(element) {
  const context = {
    isInIframe: false,
    iframeChain: [],
    isInShadowRoot: false,
    shadowHosts: [],
    isSvgElement: false,
    rootDocument: element.ownerDocument,
    mixedContext: [] // Array to track the order of shadow/iframe traversal
  };

  // Check if SVG
  if (element.namespaceURI === 'http://www.w3.org/2000/svg') {
    context.isSvgElement = true;
  }

  // Check shadow root ancestry first (from element up to document)
  let node = element;
  let currentDoc = element.ownerDocument;
  
  while (node) {
    const root = node.getRootNode ? node.getRootNode() : null;
    if (root && root instanceof ShadowRoot) {
      context.isInShadowRoot = true;
      context.shadowHosts.unshift(root.host);
      context.mixedContext.unshift({ type: 'shadow', host: root.host });
      node = root.host;
    } else {
      node = node.parentElement;
    }
  }

  // Check iframe ancestry (traversing up through window hierarchy)
  let win = currentDoc?.defaultView;
  while (win && win !== window.top) {
    try {
      const frame = win.frameElement;
      if (frame) {
        context.isInIframe = true;
        context.iframeChain.unshift(frame);
        context.mixedContext.unshift({ type: 'iframe', frame: frame });
        
        // CRITICAL: Check if iframe is inside a shadow DOM
        // Traverse shadow roots from the iframe element
        let iframeNode = frame;
        while (iframeNode) {
          const iframeRoot = iframeNode.getRootNode ? iframeNode.getRootNode() : null;
          if (iframeRoot && iframeRoot instanceof ShadowRoot) {
            context.isInShadowRoot = true;
            // Check if this shadow host is already tracked
            if (!context.shadowHosts.find(h => h === iframeRoot.host)) {
              context.shadowHosts.unshift(iframeRoot.host);
              context.mixedContext.unshift({ type: 'shadow', host: iframeRoot.host });
            }
            iframeNode = iframeRoot.host;
          } else {
            iframeNode = iframeNode.parentElement;
          }
        }
      }
      win = win.parent;
    } catch (e) {
      break; // Cross-origin
    }
  }

  return context;
}

/**
 * Build complete selector with context
 * ENHANCED: Handles iframes inside shadow DOM with proper ordering
 * UPDATED: Uses Playwright's shadow piercing - no shadow host selectors needed
 */
function buildSelectorWithContext(selector, context) {
  let result = selector;

  // Handle mixed context (iframe combinations only, skip shadow DOM hosts)
  if (context.mixedContext && context.mixedContext.length > 0) {
    let chain = 'page';
    
    // Build the chain for iframes only - Playwright pierces shadow DOM automatically
    context.mixedContext.forEach(item => {
      if (item.type === 'iframe') {
        const iframe = item.frame;
        let frameSelector = 'iframe';
        
        if (iframe.id) {
          frameSelector = `#${CSS.escape(iframe.id)}`;
        } else if (iframe.name) {
          frameSelector = `[name="${iframe.name}"]`;
        } else if (iframe.title) {
          frameSelector = `[title="${iframe.title}"]`;
        } else {
          const src = iframe.getAttribute('src');
          if (src) {
            const filename = src.split('/').pop().split('?')[0];
            if (filename) {
              frameSelector = `[src*="${filename}"]`;
            }
          }
        }
        
        chain += `.frameLocator('${frameSelector}')`;
      }
      // Skip shadow DOM hosts - Playwright pierces automatically
    });
    
    // Only modify selector if we actually have iframe chains
    if (chain !== 'page') {
      const baseSelector = result.replace('page.', '').replace('page', '');
      result = chain + '.' + baseSelector;
    }
    // Otherwise return original selector (shadow DOM elements use direct selectors)
  }
  // Fallback: Add iframe chain only (no shadow DOM)
  else if (context.isInIframe && context.iframeChain.length > 0) {
    let chain = 'page';
    context.iframeChain.forEach(iframe => {
      let frameSelector = 'iframe';
      
      if (iframe.id) {
        frameSelector = `#${CSS.escape(iframe.id)}`;
      } else if (iframe.name) {
        frameSelector = `[name="${iframe.name}"]`;
      } else if (iframe.title) {
        frameSelector = `[title="${iframe.title}"]`;
      } else {
        const src = iframe.getAttribute('src');
        if (src) {
          const filename = src.split('/').pop().split('?')[0];
          if (filename) {
            frameSelector = `[src*="${filename}"]`;
          }
        }
      }
      
      chain += `.frameLocator('${frameSelector}')`;
    });
    result = result.replace('page', chain);
  }
  // Shadow DOM elements: no modification needed - Playwright pierces automatically

  return result;
}

/**
 * Count matches in the correct context
 * ENHANCED: Properly handles iframe contexts
 * UPDATED: Uses document for shadow DOM (Playwright pierces automatically)
 */
function countInContext(selector, context) {
  try {
    let doc = document;

    // Navigate to iframe only (shadow DOM is pierced automatically by Playwright)
    if (context.mixedContext && context.mixedContext.length > 0) {
      for (const item of context.mixedContext) {
        try {
          if (item.type === 'iframe') {
            // Navigate into iframe
            const frame = item.frame;
            doc = frame.contentDocument || frame.contentWindow?.document;
            if (!doc) return 0;
          }
          // Skip shadow DOM - Playwright pierces automatically
        } catch (e) {
          return 0;
        }
      }
      return executeCount(selector, doc);
    }

    // Fallback: Navigate to iframe only
    if (context.isInIframe && context.iframeChain.length > 0) {
      const lastFrame = context.iframeChain[context.iframeChain.length - 1];
      doc = lastFrame.contentDocument || lastFrame.contentWindow?.document;
      if (!doc) return 0;
    }

    // For shadow DOM: use document (Playwright pierces automatically)
    // No need to navigate to shadowRoot

    return executeCount(selector, doc);
  } catch (e) {
    return 0;
  }
}

/**
 * Escape string
 */
function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Query selector that pierces shadow DOM (like Playwright does)
 * @param {string} selector - CSS selector
 * @param {Document|ShadowRoot} root - Root element to search from
 * @returns {Array<Element>} All matching elements across shadow boundaries
 */
function querySelectorAllDeep(selector, root = document) {
  const elements = [];
  
  // Get elements in current root
  try {
    elements.push(...Array.from(root.querySelectorAll(selector)));
  } catch (e) {
    // Invalid selector
  }
  
  // Recursively search in shadow roots
  try {
    const allElements = root.querySelectorAll('*');
    allElements.forEach(el => {
      if (el.shadowRoot) {
        elements.push(...querySelectorAllDeep(selector, el.shadowRoot));
      }
    });
  } catch (e) {
    // Error during shadow traversal
  }
  
  return elements;
}

/* ============================================================
 * .and() / .or() OPERATOR SUPPORT (shared helpers)
 * Playwright semantics:
 *   A.and(B) -> elements matching BOTH A and B  (intersection)
 *   A.or(B)  -> elements matching EITHER A or B  (union)
 * ============================================================ */

/**
 * Find the outermost (last) top-level .and()/.or() operator in a selector.
 * Quote- and paren-aware so text like getByText('a.and(b)') is ignored.
 * @param {string} selector
 * @returns {{op: 'and'|'or', left: string, right: string} | null}
 */
function parseAndOrOperator(selector) {
  let depth = 0;
  let quote = null;
  let lastOp = null;

  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i];

    // Skip over quoted string contents
    if (quote) {
      if (ch === quote && selector[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }

    if (ch === '(') { depth++; continue; }
    if (ch === ')') { depth--; continue; }

    if (depth === 0 && ch === '.') {
      if (selector.startsWith('.and(', i)) {
        lastOp = { op: 'and', pos: i, parenPos: i + 4 }; // index of '('
      } else if (selector.startsWith('.or(', i)) {
        lastOp = { op: 'or', pos: i, parenPos: i + 3 };  // index of '('
      }
    }
  }

  if (!lastOp) return null;

  // Find the matching close paren for the operator's argument
  let d = 0, q = null, j = lastOp.parenPos;
  for (; j < selector.length; j++) {
    const ch = selector[j];
    if (q) { if (ch === q && selector[j - 1] !== '\\') q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '(') d++;
    else if (ch === ')') { d--; if (d === 0) break; }
  }

  const left  = selector.slice(0, lastOp.pos).trim();
  const right = selector.slice(lastOp.parenPos + 1, j).trim();
  return { op: lastOp.op, left, right };
}

/**
 * Normalize an operand into a runnable selector.
 * Strips a stray leading `await` and ensures it starts with `page`.
 */
function normalizeAndOrOperand(operand) {
  let o = operand.replace(/\bawait\s+/g, '').trim();
  if (!o.startsWith('page')) o = 'page.' + o.replace(/^\.+/, '');
  return o;
}

/** Intersection of two element arrays (deduped, order preserved). */
function intersectElements(a, b) {
  const setB = new Set(b);
  const seen = new Set();
  const out = [];
  for (const el of a) {
    if (setB.has(el) && !seen.has(el)) { seen.add(el); out.push(el); }
  }
  return out;
}

/** Union of two element arrays (deduped, order preserved). */
function unionElements(a, b) {
  const seen = new Set();
  const out = [];
  for (const el of a) if (!seen.has(el)) { seen.add(el); out.push(el); }
  for (const el of b) if (!seen.has(el)) { seen.add(el); out.push(el); }
  return out;
}

/**
 * Execute count query
 * ENHANCED: Added support for .first(), .last(), .nth() methods and chained locators
 * FIXED: Proper shadow DOM support for chained selectors
 */
function executeCount(selector, doc) {
  // CRITICAL: Check for .first(), .last(), .nth() at the END of the selector
  // BUT we need to execute the full chain first, then apply these modifiers
  
  // Check if selector ends with a modifier
  const hasFirstAtEnd = selector.endsWith('.first()');
  const hasLastAtEnd = selector.endsWith('.last()');
  const nthAtEnd = selector.match(/\.nth\((\d+)\)$/);
  
  // If it has a terminal modifier, remove it temporarily and get the base count
  let baseSelector = selector;
  let applyFirst = false;
  let applyLast = false;
  let applyNth = -1;
  
  if (hasFirstAtEnd) {
    baseSelector = selector.replace(/\.first\(\)$/, '');
    applyFirst = true;
  } else if (hasLastAtEnd) {
    baseSelector = selector.replace(/\.last\(\)$/, '');
    applyLast = true;
  } else if (nthAtEnd) {
    applyNth = parseInt(nthAtEnd[1]);
    baseSelector = selector.replace(/\.nth\(\d+\)$/, '');
  }
  
  // If we stripped a modifier, recursively get the base count first
  if (applyFirst || applyLast || applyNth >= 0) {
    const baseCount = executeCount(baseSelector, doc);
    if (applyFirst || applyLast) {
      return baseCount > 0 ? 1 : 0;
    } else if (applyNth >= 0) {
      const result = applyNth < baseCount ? 1 : 0;
      return result;
    }
  }

  // Chained locator starting with a combinator: .locator('+ td') / .locator('> span') / .locator('~ li')
  {
    const relative = executeRelativeLocatorTail(selector, doc);
    if (relative) return relative.length;
  }

  // --- .and() / .or() operators (returns match count) ---
  {
    const andOr = parseAndOrOperator(selector);
    if (andOr) {
      const leftEls  = executeGetElements(normalizeAndOrOperand(andOr.left), doc);
      const rightEls = executeGetElements(normalizeAndOrOperand(andOr.right), doc);
      const L = Array.isArray(leftEls) ? leftEls : [];
      const R = Array.isArray(rightEls) ? rightEls : [];
      const res = andOr.op === 'and'
        ? intersectElements(L, R)
        : unionElements(L, R);
      return res.length;
    }
  }

  // FIXED: Handle chained locators with multi-level shadow DOM (e.g., .locator().locator().getByText())
  const multiLocatorTextPattern = /\.locator\([^)]+\)(?:\.locator\([^)]+\))*\.getByText\(/;
  
  if (multiLocatorTextPattern.test(selector)) {
    const locatorMatches = Array.from(selector.matchAll(/locator\(['"`]([^'"`]+)['"`]\)/g));
    const textMatch = selector.match(/getByText\(['"`]([^'"`]+)['"`]/);
    const exact = selector.includes('exact: true');
    
    if (locatorMatches.length > 0 && textMatch) {
      const searchText = textMatch[1];
      
      try {
        // Start with the first locator
        const startDoc = doc.ownerDocument || doc;
        let currentElements = Array.from(startDoc.querySelectorAll(locatorMatches[0][1]));
        
        // Traverse through each subsequent locator (before getByText), checking for shadow DOM
        for (let i = 1; i < locatorMatches.length; i++) {
          const nextSelector = locatorMatches[i][1];
          const newElements = [];
          
          currentElements.forEach(el => {
            try {
              // CRITICAL: Check for shadow root at EACH level!
              const searchRoot = el.shadowRoot || el;
              const found = searchRoot.querySelectorAll(nextSelector);
              newElements.push(...Array.from(found));
            } catch (e) {
              // Invalid selector, skip
            }
          });
          
          currentElements = newElements;
        }
        
        // Now search for text in the final set of elements
        let totalCount = 0;
        currentElements.forEach(el => {
          // FIXED: Check for shadow root at the final level too!
          const searchRoot = el.shadowRoot || el;
          const textElements = findByText(searchText, exact, searchRoot);
          totalCount += textElements.length;
        });
        
        return totalCount;
      } catch (e) {
        return 0;
      }
    }
  }

  // FIXED: Handle chained locators with multi-level shadow DOM (e.g., .locator().locator().getByRole())
  // Check if we have one or more locators before a getByRole/getByText/etc
  const locatorWithGetByPattern = /\.locator\([^)]+\)(?:\.locator\([^)]+\))*\.getByRole\(/;
  
  if (locatorWithGetByPattern.test(selector)) {
    const locatorMatches = Array.from(selector.matchAll(/locator\(['"`]([^'"`]+)['"`]\)/g));
    const roleMatch = selector.match(/getByRole\(['"`]([^'"`]+)['"`]/);
    const nameMatch = selector.match(/name:\s*['"`\/](.+?)['"`\/]/);
    
    if (locatorMatches.length > 0 && roleMatch) {
      const role = roleMatch[1];
      const name = nameMatch ? nameMatch[1] : null;
      
      try {
        // CRITICAL FIX: Always start from document root for page.locator() selectors
        // The 'doc' parameter might be a ShadowRoot, but page.locator() should start from document
        const startDoc = doc.ownerDocument || doc;
        
        // Start with the first locator
        let currentElements = Array.from(startDoc.querySelectorAll(locatorMatches[0][1]));
        
        // Traverse through each subsequent locator, checking for shadow DOM at each level
        for (let i = 1; i < locatorMatches.length; i++) {
          const nextSelector = locatorMatches[i][1];
          const newElements = [];
          
          currentElements.forEach((el, idx) => {
            try {
              // CRITICAL: Check for shadow root at EACH level!
              const hasShadow = !!el.shadowRoot;
              const searchRoot = el.shadowRoot || el;
              const found = searchRoot.querySelectorAll(nextSelector);
              newElements.push(...Array.from(found));
            } catch (e) {
              // Invalid selector or no access, skip
            }
          });
          
          currentElements = newElements;
        }
        
        // Now search for the role in the final set of elements
        let totalCount = 0;
        currentElements.forEach((el, idx) => {
          // FIXED: Check for shadow root at the final level too!
          const hasShadow = !!el.shadowRoot;
          const searchRoot = el.shadowRoot || el;
          const roleElements = findByRole(role, name, searchRoot);
          totalCount += roleElements.length;
        });
        
        return totalCount;
      } catch (e) {
        return 0;
      }
    }
  }

  // FIXED: Handle chained locators with multi-level shadow DOM (e.g., .locator().locator().getByLabel())
  const multiLocatorLabelPattern = /\.locator\([^)]+\)(?:\.locator\([^)]+\))*\.getByLabel\(/;
  
  if (multiLocatorLabelPattern.test(selector)) {
    const locatorMatches = Array.from(selector.matchAll(/locator\(['"`]([^'"`]+)['"`]\)/g));
    const labelMatch = selector.match(/getByLabel\(['"`]([^'"`]+)['"`]/);
    const exact = selector.includes('exact: true');
    
    if (locatorMatches.length > 0 && labelMatch) {
      const labelText = labelMatch[1];
      
      try {
        // Start with the first locator
        const startDoc = doc.ownerDocument || doc;
        let currentElements = Array.from(startDoc.querySelectorAll(locatorMatches[0][1]));
        
        // Traverse through each subsequent locator, checking for shadow DOM
        for (let i = 1; i < locatorMatches.length; i++) {
          const nextSelector = locatorMatches[i][1];
          const newElements = [];
          
          currentElements.forEach(el => {
            try {
              // CRITICAL: Check for shadow root at EACH level!
              const searchRoot = el.shadowRoot || el;
              const found = searchRoot.querySelectorAll(nextSelector);
              newElements.push(...Array.from(found));
            } catch (e) {
              // Invalid selector, skip
            }
          });
          
          currentElements = newElements;
        }
        
        // Now search for label in the final set of elements
        let totalCount = 0;
        currentElements.forEach(el => {
          // FIXED: Check for shadow root at the final level too!
          const searchRoot = el.shadowRoot || el;
          const labelElements = findByLabel(labelText, exact, searchRoot);
          totalCount += labelElements.length;
        });
        
        return totalCount;
      } catch (e) {
        return 0;
      }
    }
  }

  // FIXED: Handle chained locators with multi-level shadow DOM (e.g., .locator().locator().getByPlaceholder())
  const multiLocatorPlaceholderPattern = /\.locator\([^)]+\)(?:\.locator\([^)]+\))*\.getByPlaceholder\(/;
  
  if (multiLocatorPlaceholderPattern.test(selector)) {
    const locatorMatches = Array.from(selector.matchAll(/locator\(['"`]([^'"`]+)['"`]\)/g));
    const placeholderMatch = selector.match(/getByPlaceholder\(['"`]([^'"`]+)['"`]/);
    
    if (locatorMatches.length > 0 && placeholderMatch) {
      const placeholder = placeholderMatch[1];
      
      try {
        // Start with the first locator
        const startDoc = doc.ownerDocument || doc;
        let currentElements = Array.from(startDoc.querySelectorAll(locatorMatches[0][1]));
        
        // Traverse through each subsequent locator, checking for shadow DOM
        for (let i = 1; i < locatorMatches.length; i++) {
          const nextSelector = locatorMatches[i][1];
          const newElements = [];
          
          currentElements.forEach(el => {
            try {
              // CRITICAL: Check for shadow root at EACH level!
              const searchRoot = el.shadowRoot || el;
              const found = searchRoot.querySelectorAll(nextSelector);
              newElements.push(...Array.from(found));
            } catch (e) {
              // Invalid selector, skip
            }
          });
          
          currentElements = newElements;
        }
        
        // Now search for placeholder in the final set of elements
        let totalCount = 0;
        currentElements.forEach(el => {
          // FIXED: Check for shadow root at the final level too!
          const searchRoot = el.shadowRoot || el;
          const placeholderElements = searchRoot.querySelectorAll(`[placeholder="${placeholder}"]`);
          totalCount += placeholderElements.length;
        });
        
        return totalCount;
      } catch (e) {
        return 0;
      }
    }
  }

  // Handle chained locators (e.g., .locator().locator()) - even without getBy at the end
  if (selector.match(/\.locator\([^)]+\)\.locator\(/)) {
    const locatorMatches = Array.from(selector.matchAll(/locator\(['"`]([^'"`]+)['"`]\)/g));
    
    if (locatorMatches.length >= 2) {
      try {
        // CRITICAL FIX: Handle both Document and ShadowRoot contexts
        let startDoc = doc;
        if (doc instanceof ShadowRoot) {
          // If doc is a ShadowRoot, get the document from the host
          startDoc = doc.host.ownerDocument;
        } else if (doc.ownerDocument) {
          startDoc = doc.ownerDocument;
        }
        
        let currentElements = Array.from(startDoc.querySelectorAll(locatorMatches[0][1]));
        
        for (let i = 1; i < locatorMatches.length; i++) {
          const nextSelector = locatorMatches[i][1];
          const newElements = [];
          
          currentElements.forEach(el => {
            try {
              // CRITICAL: Check for shadow root and search within it
              const searchRoot = el.shadowRoot || el;
              const found = searchRoot.querySelectorAll(nextSelector);
              newElements.push(...Array.from(found));
            } catch (e) {
              // Invalid selector, skip
            }
          });
          
          currentElements = newElements;
        }
        
        return currentElements.length;
      } catch (e) {
        return 0;
      }
    }
  }

  // getByTestId
if (selector.includes('getByTestId')) {
  const m = selector.match(/getByTestId\(['"`]([^'"`]+)['"`]\)/);
  if (m) {
    return querySelectorAllDeep(`[data-testid="${m[1]}"], [data-test-id="${m[1]}"], [data-test="${m[1]}"], [data-cy="${m[1]}"]`, doc).length;
  }
}

// getByRole - with regex support
if (selector.includes('getByRole')) {
  const roleM = selector.match(/getByRole\(['"`]([^'"`]+)['"`]/);
  
  // Check for regex pattern in name
  const nameRegexM = selector.match(/name:\s*\/([^\/]+)\/([gimsuy]*)/);
  const nameM = selector.match(/name:\s*['"`]([^'"`]+)['"`]/);
  
  if (roleM) {
    if (nameRegexM) {
      const pattern = nameRegexM[1];
      const flags = nameRegexM[2] || '';
      const regex = new RegExp(pattern, flags);
      return countByRoleDeepWithRegex(roleM[1], regex, doc);
    } else if (nameM) {
      return countByRoleDeep(roleM[1], nameM[1], doc);
    } else {
      return countByRoleDeep(roleM[1], null, doc);
    }
  }
}

// getByLabel
if (selector.includes('getByLabel')) {
  const m = selector.match(/getByLabel\(['"`]([^'"`]+)['"`]/);
  const exact = selector.includes('exact: true');
  if (m) return countByLabelDeep(m[1], exact, doc);
}

// getByPlaceholder
if (selector.includes('getByPlaceholder')) {
  const m = selector.match(/getByPlaceholder\(['"`]([^'"`]+)['"`]/);
  if (m) return querySelectorAllDeep(`[placeholder="${m[1]}"]`, doc).length;
}

// getByText - CRITICAL FIX
if (selector.includes('getByText')) {
  const m = selector.match(/getByText\(['"`]([^'"`]+)['"`]/);
  const exact = selector.includes('exact: true');
  if (m) return countByTextDeep(m[1], exact, doc);
}

// getByAltText
if (selector.includes('getByAltText')) {
  const m = selector.match(/getByAltText\(['"`]([^'"`]+)['"`]/);
  if (m) return querySelectorAllDeep(`[alt="${m[1]}"]`, doc).length;
}

// getByTitle
if (selector.includes('getByTitle')) {
  const m = selector.match(/getByTitle\(['"`]([^'"`]+)['"`]/);
  if (m) return querySelectorAllDeep(`[title="${m[1]}"]`, doc).length;
}

  // has-text() with tagname
  if (selector.includes(':has-text(')) {
    const m = selector.match(/locator\(['"`](.+?):has-text\(["'](.+?)["']\)['"`]\)/);
    if (m) {
      const tag = m[1];
      const text = m[2];
      const els = querySelectorAllDeep(tag, doc);
      return Array.from(els).filter(el => {
        const innerText = el.innerText?.trim();
        return innerText && innerText.includes(text);
      }).length;
    }
    
    // Also handle template literal format
    const m2 = selector.match(/locator\(`(.+?):has-text\("(.+?)"\)`\)/);
    if (m2) {
      const tag = m2[1];
      const text = m2[2];
      const els = querySelectorAllDeep(tag, doc);
      return Array.from(els).filter(el => {
        const innerText = el.innerText?.trim();
        return innerText && innerText.includes(text);
      }).length;
    }
    
    // Handle :has-text() without tagname (e.g., page.locator(":has-text('text')"))
    const m3 = selector.match(/locator\(['"`]:has-text\(['"](.+?)['"]\)['"`]\)/);
    if (m3) {
      const text = m3[1];
      const els = querySelectorAllDeep('*', doc);
      return Array.from(els).filter(el => {
        const innerText = el.innerText?.trim();
        return innerText && innerText.includes(text);
      }).length;
    }
  }

  // :text-is() pseudo-class - exact text match
  if (selector.includes(':text-is(')) {
    const m = selector.match(/locator\(['"`]:text-is\(['"](.+?)['"]\)['"`]\)/);
    if (m) {
      const text = m[1];
      const els = querySelectorAllDeep('*', doc);
      return Array.from(els).filter(el => {
        // Check if element has direct text content (not just in children)
        const hasDirectText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
        if (!hasDirectText && el.children.length > 0) return false;
        const innerText = el.innerText?.trim();
        return innerText === text;
      }).length;
    }
  }

  // :text() pseudo-class - partial text match
  if (selector.includes(':text(')) {
    const m = selector.match(/locator\(['"`]:text\(['"](.+?)['"]\)['"`]\)/);
    if (m) {
      const text = m[1];
      const els = querySelectorAllDeep('*', doc);
      return Array.from(els).filter(el => {
        const hasDirectText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
        if (!hasDirectText && el.children.length > 0) return false;
        const innerText = el.innerText?.trim();
        return innerText && innerText.includes(text);
      }).length;
    }
  }

  // :visible pseudo-class - element is visible
  if (selector.includes(':visible')) {
    const m = selector.match(/locator\(['"`]([^'"]+):visible['"`]\)/);
    if (m) {
      const baseSelector = m[1];
      const els = querySelectorAllDeep(baseSelector, doc);
      return Array.from(els).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               el.offsetParent !== null;
      }).length;
    }
  }

  // :hidden pseudo-class - element is hidden
  if (selector.includes(':hidden')) {
    const m = selector.match(/locator\(['"`]([^'"]+):hidden['"`]\)/);
    if (m) {
      const baseSelector = m[1];
      const els = querySelectorAllDeep(baseSelector, doc);
      return Array.from(els).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display === 'none' || 
               style.visibility === 'hidden' || 
               style.opacity === '0' ||
               el.offsetParent === null;
      }).length;
    }
  }

  // XPath selector
  if (selector.includes('//') || selector.includes('//*')) {
    // Try different patterns for template literals and regular strings
    let m = selector.match(/locator`([^`]+)`/); // Template literal with backticks
    if (!m) m = selector.match(/locator\('([^']+)'\)/); // Single quotes
    if (!m) m = selector.match(/locator\("([^"]+)"\)/); // Double quotes
    
    if (m && m[1] && (m[1].startsWith('//') || m[1].startsWith('//*'))) {
      try {
        const xpath = m[1];
        const result = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        return result.snapshotLength;
      } catch (e) {
        return 0;
      }
    }
  }

  // filter hasText - MUST come BEFORE generic locator check
  if (selector.includes('.filter({ hasText:') || selector.includes('.filter({hasText:')) {
    // Match the base locator more carefully
    const baseM = selector.match(/locator\((['"`])([^'"`]+)\1\)/);
    const textM = selector.match(/hasText:\s*(['"`])([^'"`]+)\1/);

    if (baseM && textM) {
      const baseSelector = baseM[2];
      const searchText = textM[2];
      try {
        const els = doc.querySelectorAll(baseSelector);
        const filtered = Array.from(els).filter(el => {
          const text = el.textContent;
          const matches = text && text.includes(searchText);
          return matches;
        });
        return filtered.length;
      } catch (e) {
        return 0;
      }
    }
  }

  // nth - handle inline nth (not at end, which was handled above)
  if (selector.includes('.nth(')) {
    const baseM = selector.match(/locator\((['"`])([^'"`]+)\1\)/);
    const nthM = selector.match(/\.nth\((\d+)\)/);

    if (baseM && nthM && !selector.endsWith(')')) {
      // This is an inline nth, not handled above
      const total = doc.querySelectorAll(baseM[2]).length;
      return parseInt(nthM[1]) < total ? 1 : 0;
    }
  }

  // locator - catch-all for remaining locators (but NOT if it has .filter())
  if (selector.includes('locator') && !selector.includes('.filter(')) {
    let cssSelector = null;
    
    // Try template literal with backticks
    const templateMatch = selector.match(/locator`([^`]+)`/);
    if (templateMatch) {
      cssSelector = templateMatch[1];
    } else {
      // For quoted strings, find the matching closing quote
      if (selector.includes("locator('")) {
        // Single quotes - find matching closing single quote
        const start = selector.indexOf("locator('") + 9;
        const rest = selector.substring(start);
        const end = rest.indexOf("')");
        if (end !== -1) {
          cssSelector = rest.substring(0, end);
        }
      } else if (selector.includes('locator("')) {
        // Double quotes - find matching closing double quote
        const start = selector.indexOf('locator("') + 9;
        const rest = selector.substring(start);
        const end = rest.indexOf('")');
        if (end !== -1) {
          cssSelector = rest.substring(0, end);
        }
      }
    }
    
    if (cssSelector) {
      try {
        const count = querySelectorAllDeep(cssSelector, doc).length;
        return count;
      } catch (e) {
        return 0;
      }
    }
  }

  return 0;
}

/**
 * Count by role (with shadow DOM piercing)
 */
function countByRoleDeep(role, name, doc) {
  const all = querySelectorAllDeep('*', doc);
  return all.filter(el => {
    const r = el.getAttribute('role') || getImplicitRole(el);
    if (r !== role) return false;
    if (name) {
      const n = getAccessibleName(el);
      return n && n.includes(name);
    }
    return true;
  }).length;
}

/**
 * Count by label (with shadow DOM piercing)
 */
function countByLabelDeep(text, exact, doc) {
  let count = 0;
  querySelectorAllDeep('label', doc).forEach(label => {
    const t = label.textContent?.trim();
    const match = exact ? t === text : t?.includes(text);
    if (match) {
      if (label.htmlFor) {
        // Search across shadow boundaries for the target
        const target = querySelectorAllDeep(`#${label.htmlFor}`, doc)[0];
        if (target) count++;
      } else if (label.querySelector('input, select, textarea')) {
        count++;
      }
    }
  });
  querySelectorAllDeep('[aria-label]', doc).forEach(el => {
    const a = el.getAttribute('aria-label');
    const match = exact ? a === text : a?.includes(text);
    if (match) count++;
  });
  return count;
}

/**
 * Count by text (with shadow DOM piercing)
 */
function countByTextDeep(text, exact, doc) {
  const all = querySelectorAllDeep('*', doc);
  return all.filter(el => {
    const hasText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
    if (!hasText && el.children.length > 0) return false;
    const t = el.textContent?.trim();
    return exact ? t === text : t?.includes(text);
  }).length;
}

/**
 * Count by role
 */
function countByRole(role, name, doc) {
  const all = Array.from(doc.querySelectorAll('*'));
  return all.filter(el => {
    const r = el.getAttribute('role') || getImplicitRole(el);
    if (r !== role) return false;
    if (name) {
      const n = getAccessibleName(el);
      return n && n.includes(name);
    }
    return true;
  }).length;
}

/**
 * Count by label
 */
function countByLabel(text, exact, doc) {
  let count = 0;
  doc.querySelectorAll('label').forEach(label => {
    const t = label.textContent?.trim();
    const match = exact ? t === text : t?.includes(text);
    if (match) {
      if (label.htmlFor && doc.getElementById(label.htmlFor)) count++;
      else if (label.querySelector('input, select, textarea')) count++;
    }
  });
  doc.querySelectorAll('[aria-label]').forEach(el => {
    const a = el.getAttribute('aria-label');
    const match = exact ? a === text : a?.includes(text);
    if (match) count++;
  });
  return count;
}

/**
 * Count by text
 */
function countByText(text, exact, doc) {
  const all = Array.from(doc.querySelectorAll('*'));
  return all.filter(el => {
    const hasText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
    if (!hasText && el.children.length > 0) return false;
    const t = el.textContent?.trim();
    return exact ? t === text : t?.includes(text);
  }).length;
}

/**
 * Get implicit ARIA role for an HTML element.
 * Mirrors the ARIA-in-HTML mapping Playwright uses for getByRole().
 * Some roles are contextual (e.g. <li> is only "listitem" inside a list,
 * <header> is only "banner" at the document level), so those are gated.
 */
function getImplicitRole(el) {
  const tag = el.tagName.toLowerCase();
  const type = (el.type || '').toLowerCase(); // normalized for <input>

  // <section>/<form> are landmarks only when they have an accessible name
  const hasName = () => {
    const n = getAccessibleName(el);
    return !!(n && n.trim());
  };
  // <header>/<footer> expose banner/contentinfo only at the document level
  const inSectioning = () =>
    el.closest('article, aside, main, nav, section') !== null;

  switch (tag) {
    case 'a':
    case 'area':
      return el.hasAttribute('href') ? 'link' : null; // no href -> generic

    case 'button':
      return 'button';

    case 'input':
      switch (type) {
        case 'button':
        case 'submit':
        case 'reset':
        case 'image':   return 'button';
        case 'checkbox':return 'checkbox';
        case 'radio':   return 'radio';
        case 'range':   return 'slider';
        case 'number':  return 'spinbutton';
        case 'search':  return el.hasAttribute('list') ? 'combobox' : 'searchbox';
        case 'email':
        case 'tel':
        case 'url':
        case 'text':
        case '':        return el.hasAttribute('list') ? 'combobox' : 'textbox';
        // password, hidden, date, time, color, file, etc. -> no role
        default:        return null;
      }

    case 'select':
      return (el.multiple || (el.size && el.size > 1)) ? 'listbox' : 'combobox';
    case 'textarea':  return 'textbox';
    case 'option':    return 'option';
    case 'optgroup':  return 'group';
    case 'datalist':  return 'listbox';
    case 'output':    return 'status';
    case 'progress':  return 'progressbar';
    case 'meter':     return 'meter';

    case 'img':
      // alt="" intentionally hides the image (presentation/none)
      return el.getAttribute('alt') === '' ? null : 'img';

    // Lists
    case 'ul':
    case 'ol':
    case 'menu':      return 'list';
    case 'li':
      // <li> is a listitem only inside a list container
      return ['ul', 'ol', 'menu'].includes(el.parentElement?.tagName?.toLowerCase())
        ? 'listitem' : null;
    case 'dd':        return 'definition';
    case 'dt':
    case 'dfn':       return 'term';

    // Tables
    case 'table':     return 'table';
    case 'tr':        return 'row';
    case 'td':        return 'cell';
    case 'th': {
      const scope = (el.getAttribute('scope') || '').toLowerCase();
      if (scope === 'row' || scope === 'rowgroup') return 'rowheader';
      return 'columnheader';
    }
    case 'thead':
    case 'tbody':
    case 'tfoot':     return 'rowgroup';
    case 'caption':   return 'caption';

    // Headings
    case 'h1': case 'h2': case 'h3':
    case 'h4': case 'h5': case 'h6': return 'heading';

    // Landmarks
    case 'nav':       return 'navigation';
    case 'main':      return 'main';
    case 'aside':     return 'complementary';
    case 'article':   return 'article';
    case 'search':    return 'search';
    case 'header':    return inSectioning() ? null : 'banner';
    case 'footer':    return inSectioning() ? null : 'contentinfo';
    case 'section':   return hasName() ? 'region' : null;
    case 'form':      return hasName() ? 'form' : null;

    // Grouping / misc
    case 'fieldset':  return 'group';
    case 'details':   return 'group';
    case 'figure':    return 'figure';
    case 'dialog':    return 'dialog';
    case 'hr':        return 'separator';

    default:          return null;
  }
}

/**
 * Get accessible name.
 * Extended so roles whose name derives from content (td, th, option)
 * produce a working { name: ... } variant. listitem is intentionally NOT
 * name-from-content, so <li> correctly yields only page.getByRole('listitem').
 */
function getAccessibleName(el) {
  if (el.getAttribute('aria-label')) return el.getAttribute('aria-label');
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`);
    if (label) return label.textContent?.trim();
  }
  if (el.alt) return el.alt;

  const tag = el.tagName.toLowerCase();

  // Roles whose accessible name comes from the element's text content
  const nameFromContent = [
    'button', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'td', 'th', 'option'
  ];
  if (nameFromContent.includes(tag)) {
    return el.textContent?.trim();
  }

  if (el.placeholder) return el.placeholder;
  return null;
}

/**
 * Generate XPath for element
 */
function generateXPath(el, ctx) {
  const tag = el.tagName.toLowerCase();
  
  // If element has ID, use simple XPath
  if (el.id) {
    return `//*[@id="${el.id}"]`;
  }
  
  // If element has unique attribute
  if (el.name) {
    return `//${tag}[@name="${el.name}"]`;
  }
  
  // Build path from root
  const parts = [];
  let current = el;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    let sibling = current.previousSibling;
    
    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }
    
    const tagName = current.nodeName.toLowerCase();
    const part = index > 0 ? `${tagName}[${index + 1}]` : tagName;
    parts.unshift(part);
    
    current = current.parentNode;
    
    // Stop at body to keep XPath reasonable
    if (tagName === 'body') break;
  }
  
  return '//' + parts.join('/');
}

/**
 * Check if element is in a table
 */
function isInTable(element) {
  return element.closest('table') !== null || 
         element.closest('[role="table"]') !== null ||
         element.closest('[role="grid"]') !== null;
}

/**
 * Get the table row containing the element
 */
function getTableRow(element) {
  // Try standard table row
  let row = element.closest('tr');
  if (row) return row;
  
  // Try ARIA role
  row = element.closest('[role="row"]');
  if (row) return row;
  
  // Try common table-like structures
  const parent = element.closest('.table-row, .grid-row, [class*="row"]');
  if (parent && parent.parentElement) {
    const siblings = Array.from(parent.parentElement.children);
    if (siblings.length > 1 && siblings.every(s => s.classList.toString().includes('row'))) {
      return parent;
    }
  }
  
  return null;
}

/**
 * Extract meaningful text from table cells
 */
function extractCellTexts(row) {
  const cells = [];
  
  // Get all cells in the row
  const tdElements = row.querySelectorAll('td, th, [role="cell"], [role="gridcell"]');
  
  tdElements.forEach((cell, index) => {
    const text = cell.textContent?.trim();
    if (text && text.length > 0 && text.length < 100) {
      // Skip cells that only contain buttons, checkboxes, or icons
      const hasOnlyControls = cell.querySelectorAll('button, input, a, svg').length > 0 && 
                              text.replace(/[^a-zA-Z0-9]/g, '').length < 3;
      
      if (!hasOnlyControls) {
        cells.push({
          index: index,
          text: text,
          element: cell
        });
      }
    }
  });
  
  return cells;
}

/**
 * Get column index of element within row
 */
function getColumnIndex(element, row) {
  const cells = Array.from(row.querySelectorAll('td, th, [role="cell"], [role="gridcell"]'));
  
  // Find which cell contains the element
  for (let i = 0; i < cells.length; i++) {
    if (cells[i].contains(element)) {
      return i;
    }
  }
  
  return -1;
}

/**
 * Escape text for use in XPath with single quotes
 * If text contains single quotes, use concat() function
 */
function escapeXPathText(text) {
  // If no single quotes, wrap in single quotes
  if (!text.includes("'")) {
    return `'${text}'`;
  }
  
  // If text contains single quotes, use concat()
  // Split by single quote and join with concat
  const parts = text.split("'");
  const concatParts = parts.map(part => `'${part}'`).join(`, "'", `);
  return `concat(${concatParts})`;
}

/**
 * Generate smart table-based XPath selectors
 */
function generateSmartTableSelectors(el, row) {
  const selectors = [];
  const cellTexts = extractCellTexts(row);
  
  if (cellTexts.length === 0) {
    return selectors;
  }
  
  const elementTag = el.tagName.toLowerCase();
  const columnIndex = getColumnIndex(el, row);
  
  // Get element identifiers
  const elementType = el.type || elementTag;
  const hasCheckbox = elementType === 'checkbox';
  const hasRadio = elementType === 'radio';
  const hasButton = elementTag === 'button' || elementType === 'button' || elementType === 'submit';
  const hasLink = elementTag === 'a';
  const hasInput = elementTag === 'input';
  
  // Determine the best selector base
  let selectorBase = '';
  if (hasCheckbox) {
    selectorBase = "input[@type='checkbox']";
  } else if (hasRadio) {
    selectorBase = "input[@type='radio']";
  } else if (hasButton) {
    selectorBase = 'button';
  } else if (hasLink) {
    selectorBase = 'a';
  } else if (hasInput) {
    selectorBase = `input[@type='${elementType}']`;
  } else {
    selectorBase = elementTag;
  }
  
  // Strategy 1: Use the first meaningful text cell
  if (cellTexts.length > 0) {
    const firstText = cellTexts[0];
    const escapedText = escapeXPathText(esc(firstText.text));
    
    // Basic text-based selector (using contains for flexibility)
    selectors.push({
      xpath: `//tr[td[contains(., ${escapedText})]]//` + selectorBase,
      description: `${elementTag} in row containing '${firstText.text}'`
    });
    
    // Exact text match (using normalize-space for whitespace handling)
    selectors.push({
      xpath: `//tr[td[normalize-space()=${escapedText}]]//` + selectorBase,
      description: `${elementTag} in row with exact text '${firstText.text}'`
    });
    
    // With position specification
    if (columnIndex >= 0) {
      selectors.push({
        xpath: `//tr[td[contains(., ${escapedText})]]//td[${columnIndex + 1}]//` + selectorBase,
        description: `${elementTag} in column ${columnIndex + 1} of row containing '${firstText.text}'`
      });
    }
  }
  
  // Strategy 2: Use multiple cells for more specificity
  if (cellTexts.length >= 2) {
    const firstText = cellTexts[0];
    const secondText = cellTexts[1];
    const escapedFirst = escapeXPathText(esc(firstText.text));
    const escapedSecond = escapeXPathText(esc(secondText.text));
    
    selectors.push({
      xpath: `//tr[td[contains(., ${escapedFirst})] and td[contains(., ${escapedSecond})]]//` + selectorBase,
      description: `${elementTag} in row with '${firstText.text}' and '${secondText.text}'`
    });
  }
  
  // Strategy 3: Use specific column index with text from another column
  if (cellTexts.length > 0 && columnIndex >= 0) {
    cellTexts.forEach(cellText => {
      if (cellText.index !== columnIndex) {
        const escapedText = escapeXPathText(esc(cellText.text));
        selectors.push({
          xpath: `//tr[td[${cellText.index + 1}][contains(., ${escapedText})]]//td[${columnIndex + 1}]//` + selectorBase,
          description: `${elementTag} in column ${columnIndex + 1} where column ${cellText.index + 1} contains '${cellText.text}'`
        });
      }
    });
  }
  
  // Strategy 4: Use preceding/following sibling text
  const cell = el.closest('td, th, [role="cell"], [role="gridcell"]');
  if (cell) {
    const prevCell = cell.previousElementSibling;
    const nextCell = cell.nextElementSibling;
    
    if (prevCell) {
      const prevText = prevCell.textContent?.trim();
      if (prevText && prevText.length > 0 && prevText.length < 100) {
        const escapedText = escapeXPathText(esc(prevText));
        selectors.push({
          xpath: `//td[contains(., ${escapedText})]/following-sibling::td//` + selectorBase,
          description: `${elementTag} in cell following '${prevText}'`
        });
      }
    }
    
    if (nextCell) {
      const nextText = nextCell.textContent?.trim();
      if (nextText && nextText.length > 0 && nextText.length < 100) {
        const escapedText = escapeXPathText(esc(nextText));
        selectors.push({
          xpath: `//td[contains(., ${escapedText})]/preceding-sibling::td//` + selectorBase,
          description: `${elementTag} in cell preceding '${nextText}'`
        });
      }
    }
  }
  
  // Strategy 5: Use row index with text validation
  const table = row.closest('table, [role="table"], [role="grid"]');
  if (table && cellTexts.length > 0) {
    const rows = Array.from(table.querySelectorAll('tr, [role="row"]'));
    const rowIndex = rows.indexOf(row);
    
    if (rowIndex >= 0) {
      const firstText = cellTexts[0];
      const escapedText = escapeXPathText(esc(firstText.text));
      selectors.push({
        xpath: `//table//tr[${rowIndex + 1}][td[contains(., ${escapedText})]]//` + selectorBase,
        description: `${elementTag} in row ${rowIndex + 1} containing '${firstText.text}'`
      });
    }
  }
  
  // Strategy 6: Use table header correlation
  const headers = getTableHeaders(row);
  if (headers.length > 0 && columnIndex >= 0 && columnIndex < headers.length && cellTexts.length > 0) {
    const headerText = headers[columnIndex];
    const firstText = cellTexts[0];
    
    if (headerText) {
      const escapedHeader = escapeXPathText(esc(headerText));
      const escapedFirst = escapeXPathText(esc(firstText.text));
      selectors.push({
        xpath: `//tr[td[contains(., ${escapedFirst})]]//td[count(//th[contains(., ${escapedHeader})]/preceding-sibling::th) + 1]//` + selectorBase,
        description: `${elementTag} under header '${headerText}' in row with '${firstText.text}'`
      });
    }
  }
  
  return selectors;
}

/**
 * Get table headers
 */
function getTableHeaders(row) {
  const table = row.closest('table, [role="table"], [role="grid"]');
  if (!table) return [];
  
  const headers = [];
  
  // Try thead > tr > th
  const headerRow = table.querySelector('thead tr, tr:first-child');
  if (headerRow) {
    const ths = headerRow.querySelectorAll('th, [role="columnheader"]');
    ths.forEach(th => {
      const text = th.textContent?.trim();
      if (text) headers.push(text);
    });
  }
  
  // If no headers found, try first row
  if (headers.length === 0) {
    const firstRow = table.querySelector('tr, [role="row"]');
    if (firstRow) {
      const cells = firstRow.querySelectorAll('td, th, [role="cell"]');
      cells.forEach(cell => {
        const text = cell.textContent?.trim();
        headers.push(text || '');
      });
    }
  }
  
  return headers;
}

/**
 * Generate Playwright locator from XPath
 */
function xpathToPlaywrightLocator(xpath, description) {
  return {
    selector: `page.locator(\`${xpath}\`)`,
    description: description,
    xpath: xpath
  };
}

/**
 * Generate all selectors
 */
function generateAllSelectors(el, selectors, ctx) {
  const add = (sel) => {
    const count = countInContext(sel, ctx);
    if (count > 0) {
      selectors.push({
        selector: buildSelectorWithContext(sel, ctx),
        count: count
      });
    }
  };

  const tag = el.tagName.toLowerCase();
  const text = (el.innerText || el.textContent)?.trim();

  // For Shadow DOM elements: Generate CSS/ID selectors FIRST
  if (ctx.isInShadowRoot) {
    // 1. ID selector (highest priority in shadow DOM)
    if (el.id) {
      add(`page.locator('#${CSS.escape(el.id)}')`);
    }
    
    // 2. CSS class selectors
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\s+/).filter(c => c);
      if (classes.length > 0) {
        const cls = '.' + classes.map(c => CSS.escape(c)).join('.');
        add(`page.locator('${tag}${cls}')`);
        if (classes.length === 1) {
          add(`page.locator('${cls}')`);
        }
      }
    }
    
    // 3. Name attribute CSS selector
    if (el.name) {
      add(`page.locator('[name="${el.name}"]')`);
      add(`page.locator('${tag}[name="${el.name}"]')`);
    }
    
    // 4. Type attribute for inputs
    if (el.type && tag === 'input') {
      add(`page.locator('input[type="${el.type}"]')`);
    }
  }

  // SMART TABLE SELECTORS - Add these first for priority (unless in shadow DOM)
  if (isInTable(el) && !ctx.isInShadowRoot) {
    const row = getTableRow(el);
    if (row) {
      const smartSelectors = generateSmartTableSelectors(el, row);
      smartSelectors.forEach(smartSel => {
        // Test the XPath directly on the document
        try {
          let doc = document;
          
          // Navigate to iframe if needed
          if (ctx.isInIframe && ctx.iframeChain.length > 0) {
            const lastFrame = ctx.iframeChain[ctx.iframeChain.length - 1];
            doc = lastFrame.contentDocument || lastFrame.contentWindow?.document;
          }
          
          // Navigate to shadow root if needed
          if (ctx.isInShadowRoot && ctx.shadowHosts.length > 0) {
            const lastHost = ctx.shadowHosts[ctx.shadowHosts.length - 1];
            doc = lastHost.shadowRoot;
          }
          
          if (doc) {
            // Evaluate XPath directly
            const result = doc.evaluate(smartSel.xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            const count = result.snapshotLength;
            
            if (count > 0) {
              // Wrap in Playwright locator format
              const playwrightSel = `page.locator(\`${smartSel.xpath}\`)`;
              selectors.push({
                selector: buildSelectorWithContext(playwrightSel, ctx),
                count: count,
                description: smartSel.description,
                type: 'smart-table'
              });
            }
          }
        } catch (e) {
          // Error evaluating XPath, skip this selector
        }
      });
    }
  }

  // Test ID attributes
  // Only use getByTestId() for data-testid (Playwright's default testId attribute)
  if (el.hasAttribute('data-testid')) {
    add(`page.getByTestId('${esc(el.getAttribute('data-testid'))}')`);
  }
  // For other test attributes, use CSS attribute selectors
  ['data-test-id', 'data-test', 'data-cy'].forEach(attr => {
    if (el.hasAttribute(attr)) {
      add(`page.locator('[${attr}="${esc(el.getAttribute(attr))}"]')`);
    }
  });

  // Role
  const role = el.getAttribute('role') || getImplicitRole(el);
  if (role) {
    const name = getAccessibleName(el);
    if (name && name.length < 100) {
      add(`page.getByRole('${role}', { name: '${esc(name)}' })`);
      add(`page.getByRole('${role}', { name: /${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/i })`);
    }
    add(`page.getByRole('${role}')`);
  }

  // Label
  let label = null;
  if (el.id) {
    const l = ctx.rootDocument.querySelector(`label[for="${el.id}"]`);
    if (l) label = l.textContent?.trim();
  }
  if (!label) {
    const l = el.closest('label');
    if (l) label = l.textContent?.trim();
  }
  if (!label && el.getAttribute('aria-label')) {
    label = el.getAttribute('aria-label');
  }
  if (label && label.length < 100) {
    add(`page.getByLabel('${esc(label)}')`);
    add(`page.getByLabel('${esc(label)}', { exact: true })`);
  }

  // Placeholder
  if (el.placeholder && el.placeholder.length < 100) {
    add(`page.getByPlaceholder('${esc(el.placeholder)}')`);
    add(`page.getByPlaceholder('${esc(el.placeholder)}', { exact: true })`);
  }

  // Text
  if (text && text.length > 0 && text.length < 100) {
    add(`page.getByText('${esc(text)}', { exact: true })`);
    add(`page.getByText('${esc(text)}')`);
    add(`page.locator(\'${tag}:has-text("${esc(text)}")\')`);
    
    // Playwright pseudo-class selectors
    add(`page.locator(':text-is("${esc(text)}")')`); // Exact text match
    add(`page.locator(':text("${esc(text)}")')`); // Partial text match
    add(`page.locator(':has-text("${esc(text)}")')`); // Has text (without tagname)
    add(`page.locator('${tag}:text-is("${esc(text)}")')`); // With tagname - exact
    add(`page.locator('${tag}:text("${esc(text)}")')`); // With tagname - partial
  }

  // Alt
  if (el.alt && el.alt.length < 100) {
    add(`page.getByAltText('${esc(el.alt)}')`);
    add(`page.getByAltText('${esc(el.alt)}', { exact: true })`);
  }

  // Title
  if (el.title && el.title.length < 100) {
    add(`page.getByTitle('${esc(el.title)}')`);
    add(`page.getByTitle('${esc(el.title)}', { exact: true })`);
  }

  // CSS selectors (for non-shadow DOM, add them here)
  if (!ctx.isInShadowRoot) {
    if (el.id) {
      add(`page.locator('#${CSS.escape(el.id)}')`);
      // Add visibility variants
      add(`page.locator('#${CSS.escape(el.id)}:visible')`);
    }
    if (el.name) {
      add(`page.locator('[name="${el.name}"]')`);
      add(`page.locator('${tag}[name="${el.name}"]')`);
    }
    if (el.className && typeof el.className === 'string') {
      const classes = el.className.trim().split(/\s+/).filter(c => c);
      if (classes.length > 0) {
        const cls = '.' + classes.map(c => CSS.escape(c)).join('.');
        add(`page.locator('${tag}${cls}')`);
        // Add visibility variant for class selector
        add(`page.locator('${tag}${cls}:visible')`);
        if (classes.length === 1) {
          add(`page.locator('${cls}')`);
        }
      }
    }
    if (el.type && tag === 'input') {
      add(`page.locator('input[type="${el.type}"]')`);
    }
    
    // Add generic tag with :visible pseudo-class
    add(`page.locator('${tag}:visible')`);
  }

  // SVG
  if (ctx.isSvgElement) {
    if (el.id) {
      add(`page.locator('svg #${CSS.escape(el.id)}')`);
    }
    if (el.className?.baseVal) {
      const classes = el.className.baseVal.trim().split(/\s+/).filter(c => c);
      if (classes.length > 0) {
        const cls = '.' + classes.map(c => CSS.escape(c)).join('.');
        add(`page.locator('svg ${tag}${cls}')`);
      }
    }
    ['data-icon', 'data-name', 'aria-label'].forEach(attr => {
      if (el.hasAttribute(attr)) {
        add(`page.locator('svg [${attr}="${el.getAttribute(attr)}"]')`);
      }
    });
    if (text && text.length < 50) {
      add(`page.locator('svg ${tag}:has-text("${esc(text)}")')`);
    }
  }

  // Filter
  if (text && text.length < 100) {
    add(`page.locator('${tag}').filter({ hasText: '${esc(text)}' })`);
    
    // ALSO add filter with .first() for better specificity when there are multiple matches
    add(`page.locator('${tag}').filter({ hasText: '${esc(text)}' }).first()`);
    
    // ALSO add filter with .last() as an alternative
    add(`page.locator('${tag}').filter({ hasText: '${esc(text)}' }).last()`);
  }

  // Nth - only generate if it helps uniqueness
  if (el.parentElement) {
    const siblings = Array.from(el.parentElement.children);
    const idx = siblings.indexOf(el);
    
    if (idx >= 0) {
      // Get parent selector for context
      let parentSelector = el.parentElement.tagName.toLowerCase();
      
      // Make parent selector more specific if possible
      if (el.parentElement.id) {
        parentSelector = `#${CSS.escape(el.parentElement.id)}`;
      } else if (el.parentElement.className && typeof el.parentElement.className === 'string') {
        const classes = el.parentElement.className.trim().split(/\s+/).filter(c => c);
        if (classes.length > 0) {
          const cls = '.' + classes.map(c => CSS.escape(c)).join('.');
          parentSelector = `${el.parentElement.tagName.toLowerCase()}${cls}`;
        }
      }
      
      // Only generate nth selector if parent context makes it meaningful
      // Count how many same-tag siblings exist
      const sameTagSiblings = siblings.filter(s => s.tagName === el.tagName);
      
      if (sameTagSiblings.length > 1) {
        const sameTagIdx = sameTagSiblings.indexOf(el);
        // Use parent > child selector with nth for better specificity
        add(`page.locator('${parentSelector}').locator('${tag}').nth(${sameTagIdx})`);
      }
    }
  }
}

/**
 * Main function
 */
function analyzeElement(element) {
  const ctx = analyzeElementContext(element);
  const selectors = generatePlaywrightSelectors(element);
  displaySelectors(selectors);
  
  return selectors;
}

// Quick access functions
function getBest(el) {
  const s = generatePlaywrightSelectors(el);
  return s[0] || null;
}

function getUnique(el) {
  return generatePlaywrightSelectors(el).filter(s => s.count === 1);
}

/**
 * Get all matching elements for a Playwright selector
 * ENHANCED: Added support for Python Playwright locators
 * @param {string} selectorString - Playwright selector (JavaScript or Python)
 * @returns {Array<Element>} Array of matching DOM elements
 */
function getSelectorMatches(selectorString) {
  try {

    // Convert C# syntax to JavaScript first 
    selectorString = convertCSharpToJavaScript(selectorString);

    // Convert Python syntax to JavaScript first
    selectorString = convertPythonToJavaScript(selectorString);
    
    // Convert Java syntax to JavaScript
    selectorString = convertJavaToJavaScript(selectorString);
    
    // Normalize legacy >> operator
    selectorString = normalizeLegacyOperators(selectorString);
    
    // Validate selector syntax
    const validation = validateSelectorSyntax(selectorString);
    if (!validation.isValid) {
      return "Invalid Playwright Locator: " + validation.error.split("•")[0];
    }
    
    // Parse the selector to find context (iframe/shadow)
    const context = parseSelectorContext(selectorString);
    
    // Get the root document/shadowRoot to search in
    let rootContext = navigateToContext(context);
    if (!rootContext) return [];

    // Extract the actual selector part (preserving frameLocator)
    const cleanSelector = extractCleanSelector(selectorString);
    
    // If selector has frameLocator, we need to handle it differently
    if (cleanSelector.includes('frameLocator')) {
      // Extract the final selector after all frameLocators
      const parts = cleanSelector.split(/\.frameLocator\([^)]+\)/);
      const finalSelector = parts[parts.length - 1];
      // Execute on the final part in the correct context
      return executeGetElements('page' + finalSelector, rootContext);
    }
    
    // Execute and return matching elements
    return executeGetElements(cleanSelector, rootContext);
  } catch (e) {
    console.error('Error in getSelectorMatches:', e);
    return [];
  }
}

/**
 * Chained locator with a leading CSS combinator, e.g.
 *   page.getByRole('gridcell', { name: 'Name' }).locator('+ td')
 *   page.locator('ul').locator('> li')      page.getByText('Total').locator('~ span')
 * Playwright evaluates such CSS relative to each element matched so far (implicit :scope),
 * which also reaches siblings. Returns the matched elements, or null if the selector
 * doesn't end with such a locator.
 */
const RELATIVE_LOCATOR_TAIL = /^(.*)\.locator\((['"`])\s*([>+~](?:(?!\2).)*)\2\)$/;

function executeRelativeLocatorTail(selector, doc) {
  const m = selector.match(RELATIVE_LOCATOR_TAIL);
  if (!m || !m[1].startsWith('page')) return null;
  const head = m[1];
  const relCss = m[3].trim();

  const base = executeGetElements(head, doc);
  if (!Array.isArray(base) || base.length === 0) return [];

  const found = new Set();
  const mark = 'data-sh-pw-scope';
  base.forEach((el) => {
    if (!el || el.nodeType !== 1) return;
    const root = el.getRootNode();                        // Document or ShadowRoot
    const token = 's' + Math.random().toString(36).slice(2);
    const prev = el.getAttribute(mark);
    el.setAttribute(mark, token);
    try {
      root.querySelectorAll(`[${mark}="${token}"] ${relCss}`).forEach((n) => found.add(n));
    } catch (e) {
      // invalid CSS - nothing matches
    } finally {
      if (prev === null) el.removeAttribute(mark); else el.setAttribute(mark, prev);
    }
  });

  return Array.from(found).sort((a, b) =>
    a === b ? 0 : (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
}

/**
 * Execute selector and return matching elements
 * ENHANCED: Added support for .first(), .last(), .nth(), and chained locators
 * FIXED: Proper shadow DOM support for all chained selector types
 */
function executeGetElements(selector, doc) {
  // CRITICAL: Check for .first(), .last(), .nth() at the END of the selector
  // BUT we need to execute the full chain first, then apply these modifiers
  
  // Check if selector ends with a modifier
  const hasFirstAtEnd = selector.endsWith('.first()');
  const hasLastAtEnd = selector.endsWith('.last()');
  const nthAtEnd = selector.match(/\.nth\((\d+)\)$/);
  
  // If it has a terminal modifier, remove it temporarily and get the base elements
  let baseSelector = selector;
  let applyFirst = false;
  let applyLast = false;
  let applyNth = -1;
  
  if (hasFirstAtEnd) {
    baseSelector = selector.replace(/\.first\(\)$/, '');
    applyFirst = true;
  } else if (hasLastAtEnd) {
    baseSelector = selector.replace(/\.last\(\)$/, '');
    applyLast = true;
  } else if (nthAtEnd) {
    applyNth = parseInt(nthAtEnd[1]);
    baseSelector = selector.replace(/\.nth\(\d+\)$/, '');
  }
  
  // If we stripped a modifier, recursively get the base elements first
  if (applyFirst || applyLast || applyNth >= 0) {
    const allElements = executeGetElements(baseSelector, doc);
    if (applyFirst) {
      return allElements.length > 0 ? [allElements[0]] : [];
    } else if (applyLast) {
      return allElements.length > 0 ? [allElements[allElements.length - 1]] : [];
    } else if (applyNth >= 0) {
      return applyNth < allElements.length ? [allElements[applyNth]] : [];
    }
  }

  // Chained locator starting with a combinator: .locator('+ td') / .locator('> span') / .locator('~ li')
  {
    const relative = executeRelativeLocatorTail(selector, doc);
    if (relative) return relative;
  }

  // --- .and() / .or() operators (returns matching elements) ---
  {
    const andOr = parseAndOrOperator(selector);
    if (andOr) {
      const leftEls  = executeGetElements(normalizeAndOrOperand(andOr.left), doc);
      const rightEls = executeGetElements(normalizeAndOrOperand(andOr.right), doc);
      const L = Array.isArray(leftEls) ? leftEls : [];
      const R = Array.isArray(rightEls) ? rightEls : [];
      return andOr.op === 'and'
        ? intersectElements(L, R)
        : unionElements(L, R);
    }
  }

  // FIXED: Handle chained locators with multi-level shadow DOM (e.g., .locator().locator().getByText())
  const multiLocatorTextPattern = /\.locator\([^)]+\)(?:\.locator\([^)]+\))*\.getByText\(/;
  
  if (multiLocatorTextPattern.test(selector)) {
    const locatorMatches = Array.from(selector.matchAll(/locator\(['"`]([^'"`]+)['"`]\)/g));
    const textMatch = selector.match(/getByText\(['"`]([^'"`]+)['"`]/);
    const exact = selector.includes('exact: true');
    
    if (locatorMatches.length > 0 && textMatch) {
      const searchText = textMatch[1];
      
      try {
        // Start with the first locator
        const startDoc = doc.ownerDocument || doc;
        let currentElements = Array.from(startDoc.querySelectorAll(locatorMatches[0][1]));
        
        // Traverse through each subsequent locator (before getByText), checking for shadow DOM
        for (let i = 1; i < locatorMatches.length; i++) {
          const nextSelector = locatorMatches[i][1];
          const newElements = [];
          
          currentElements.forEach(el => {
            try {
              // CRITICAL: Check for shadow root at EACH level!
              const searchRoot = el.shadowRoot || el;
              const found = searchRoot.querySelectorAll(nextSelector);
              newElements.push(...Array.from(found));
            } catch (e) {
              // Invalid selector, skip
            }
          });
          
          currentElements = newElements;
        }
        
        // Now search for text in the final set of elements
        const allMatches = [];
        currentElements.forEach(el => {
          // FIXED: Check for shadow root at the final level too!
          const searchRoot = el.shadowRoot || el;
          const textElements = findByText(searchText, exact, searchRoot);
          allMatches.push(...textElements);
        });
        
        return allMatches;
      } catch (e) {
        return [];
      }
    }
  }

  // FIXED: Handle chained locators with multi-level shadow DOM (e.g., .locator().locator().getByRole())
  const multiLocatorPattern = /\.locator\([^)]+\)(?:\.locator\([^)]+\))+\.getBy/;
  const hasMultipleLocators = multiLocatorPattern.test(selector);
  
  if (hasMultipleLocators || selector.match(/\.locator\([^)]+\)\.getByRole\(/)) {
    const locatorMatches = Array.from(selector.matchAll(/locator\(['"`]([^'"`]+)['"`]\)/g));
    const roleMatch = selector.match(/getByRole\(['"`]([^'"`]+)['"`]/);
    const nameMatch = selector.match(/name:\s*['"`\/](.+?)['"`\/]/);
    
    if (locatorMatches.length > 0 && roleMatch) {
      const role = roleMatch[1];
      const name = nameMatch ? nameMatch[1] : null;
      
      try {
        // Start with the first locator
        const startDoc = doc.ownerDocument || doc;
        let currentElements = Array.from(startDoc.querySelectorAll(locatorMatches[0][1]));
        
        // Traverse through each subsequent locator, checking for shadow DOM at each level
        for (let i = 1; i < locatorMatches.length; i++) {
          const nextSelector = locatorMatches[i][1];
          const newElements = [];
          
          currentElements.forEach(el => {
            try {
              // CRITICAL: Check for shadow root at EACH level!
              const searchRoot = el.shadowRoot || el;
              const found = searchRoot.querySelectorAll(nextSelector);
              newElements.push(...Array.from(found));
            } catch (e) {
              // Invalid selector or no access, skip
            }
          });
          
          currentElements = newElements;
        }
        
        // Now search for the role in the final set of elements
        const allMatches = [];
        currentElements.forEach(el => {
          // FIXED: Check for shadow root at the final level too!
          const searchRoot = el.shadowRoot || el;
          const roleElements = findByRole(role, name, searchRoot);
          allMatches.push(...roleElements);
        });
        
        return allMatches;
      } catch (e) {
        return [];
      }
    }
  }

  // FIXED: Handle chained locators with multi-level shadow DOM (e.g., .locator().locator().getByLabel())
  const multiLocatorLabelPattern = /\.locator\([^)]+\)(?:\.locator\([^)]+\))*\.getByLabel\(/;
  
  if (multiLocatorLabelPattern.test(selector)) {
    const locatorMatches = Array.from(selector.matchAll(/locator\(['"`]([^'"`]+)['"`]\)/g));
    const labelMatch = selector.match(/getByLabel\(['"`]([^'"`]+)['"`]/);
    const exact = selector.includes('exact: true');
    
    if (locatorMatches.length > 0 && labelMatch) {
      const labelText = labelMatch[1];
      
      try {
        // Start with the first locator
        const startDoc = doc.ownerDocument || doc;
        let currentElements = Array.from(startDoc.querySelectorAll(locatorMatches[0][1]));
        
        // Traverse through each subsequent locator, checking for shadow DOM
        for (let i = 1; i < locatorMatches.length; i++) {
          const nextSelector = locatorMatches[i][1];
          const newElements = [];
          
          currentElements.forEach(el => {
            try {
              // CRITICAL: Check for shadow root at EACH level!
              const searchRoot = el.shadowRoot || el;
              const found = searchRoot.querySelectorAll(nextSelector);
              newElements.push(...Array.from(found));
            } catch (e) {
              // Invalid selector, skip
            }
          });
          
          currentElements = newElements;
        }
        
        // Now search for label in the final set of elements
        const allMatches = [];
        currentElements.forEach(el => {
          // FIXED: Check for shadow root at the final level too!
          const searchRoot = el.shadowRoot || el;
          const labelElements = findByLabel(labelText, exact, searchRoot);
          allMatches.push(...labelElements);
        });
        
        return allMatches;
      } catch (e) {
        return [];
      }
    }
  }

  // FIXED: Handle chained locators with multi-level shadow DOM (e.g., .locator().locator().getByPlaceholder())
  const multiLocatorPlaceholderPattern = /\.locator\([^)]+\)(?:\.locator\([^)]+\))*\.getByPlaceholder\(/;
  
  if (multiLocatorPlaceholderPattern.test(selector)) {
    const locatorMatches = Array.from(selector.matchAll(/locator\(['"`]([^'"`]+)['"`]\)/g));
    const placeholderMatch = selector.match(/getByPlaceholder\(['"`]([^'"`]+)['"`]/);
    
    if (locatorMatches.length > 0 && placeholderMatch) {
      const placeholder = placeholderMatch[1];
      
      try {
        // Start with the first locator
        const startDoc = doc.ownerDocument || doc;
        let currentElements = Array.from(startDoc.querySelectorAll(locatorMatches[0][1]));
        
        // Traverse through each subsequent locator, checking for shadow DOM
        for (let i = 1; i < locatorMatches.length; i++) {
          const nextSelector = locatorMatches[i][1];
          const newElements = [];
          
          currentElements.forEach(el => {
            try {
              // CRITICAL: Check for shadow root at EACH level!
              const searchRoot = el.shadowRoot || el;
              const found = searchRoot.querySelectorAll(nextSelector);
              newElements.push(...Array.from(found));
            } catch (e) {
              // Invalid selector, skip
            }
          });
          
          currentElements = newElements;
        }
        
        // Now search for placeholder in the final set of elements
        const allMatches = [];
        currentElements.forEach(el => {
          // FIXED: Check for shadow root at the final level too!
          const searchRoot = el.shadowRoot || el;
          const placeholderElements = searchRoot.querySelectorAll(`[placeholder="${placeholder}"]`);
          allMatches.push(...Array.from(placeholderElements));
        });
        
        return allMatches;
      } catch (e) {
        return [];
      }
    }
  }

  // Handle chained locators (e.g., .locator().locator()) - even without getBy at the end
  if (selector.match(/\.locator\([^)]+\)\.locator\(/)) {
    const locatorMatches = Array.from(selector.matchAll(/locator\(['"`]([^'"`]+)['"`]\)/g));
    
    if (locatorMatches.length >= 2) {
      try {
        // CRITICAL FIX: Handle both Document and ShadowRoot contexts
        let startDoc = doc;
        if (doc instanceof ShadowRoot) {
          // If doc is a ShadowRoot, get the document from the host
          startDoc = doc.host.ownerDocument;
        } else if (doc.ownerDocument) {
          startDoc = doc.ownerDocument;
        }
        
        let currentElements = Array.from(startDoc.querySelectorAll(locatorMatches[0][1]));
        
        for (let i = 1; i < locatorMatches.length; i++) {
          const nextSelector = locatorMatches[i][1];
          const newElements = [];
          
          currentElements.forEach(el => {
            try {
              // CRITICAL: Check for shadow root and search within it
              const searchRoot = el.shadowRoot || el;
              const found = searchRoot.querySelectorAll(nextSelector);
              newElements.push(...Array.from(found));
            } catch (e) {
              // Invalid selector, skip
            }
          });
          
          currentElements = newElements;
        }
        
        return currentElements;
      } catch (e) {
        return [];
      }
    }
  }

   // getByTestId
  if (selector.includes('getByTestId')) {
    const m = selector.match(/getByTestId\(['"`]([^'"`]+)['"`]\)/);
    if (m) {
      return querySelectorAllDeep(
        `[data-testid="${m[1]}"], [data-test-id="${m[1]}"], [data-test="${m[1]}"], [data-cy="${m[1]}"]`,
        doc
      );
    }
  }

  // getByRole - IMPROVED PATTERN with regex support
  if (selector.includes('getByRole')) {
    const roleM = selector.match(/getByRole\(['"`]([^'"`]+)['"`]/);
    
    // Check for regex pattern in name
    const nameRegexM = selector.match(/name:\s*\/([^\/]+)\/([gimsuy]*)/);
    const nameM = selector.match(/name:\s*['"`]([^'"`]+)['"`]/);
    
    if (roleM) {
      if (nameRegexM) {
        // Regex pattern for name
        const pattern = nameRegexM[1];
        const flags = nameRegexM[2] || '';
        const regex = new RegExp(pattern, flags);
        return findByRoleDeepWithRegex(roleM[1], regex, doc);
      } else if (nameM) {
        // String pattern for name
        return findByRoleDeep(roleM[1], nameM[1], doc);
      } else {
        // No name filter
        return findByRoleDeep(roleM[1], null, doc);
      }
    }
  }

  // getByLabel - IMPROVED PATTERN
  if (selector.includes('getByLabel')) {
    const m = selector.match(/getByLabel\(['"`]([^'"`]+)['"`]/);
    const exact = selector.includes('exact: true');
    if (m) return findByLabelDeep(m[1], exact, doc);
  }

  // getByPlaceholder - IMPROVED PATTERN
  if (selector.includes('getByPlaceholder')) {
    const m = selector.match(/getByPlaceholder\(['"`]([^'"`]+)['"`]/);
    if (m) return querySelectorAllDeep(`[placeholder="${m[1]}"]`, doc);
  }

  // getByText - IMPROVED PATTERN (CRITICAL FIX)
  if (selector.includes('getByText')) {
    const m = selector.match(/getByText\(['"`]([^'"`]+)['"`]/);
    const exact = selector.includes('exact: true');
    if (m) return findByTextDeep(m[1], exact, doc);
  }

  // getByAltText - IMPROVED PATTERN
  if (selector.includes('getByAltText')) {
    const m = selector.match(/getByAltText\(['"`]([^'"`]+)['"`]/);
    if (m) return querySelectorAllDeep(`[alt="${m[1]}"]`, doc);
  }

  // getByTitle - IMPROVED PATTERN
  if (selector.includes('getByTitle')) {
    const m = selector.match(/getByTitle\(['"`]([^'"`]+)['"`]/);
    if (m) return querySelectorAllDeep(`[title="${m[1]}"]`, doc);
  }

  // has-text() with tagname
  if (selector.includes(':has-text(')) {
    const m = selector.match(/locator\(['"`](.+?):has-text\(["'](.+?)["']\)['"`]\)/);
    if (m) {
      const tag = m[1];
      const text = m[2];
      const els = querySelectorAllDeep(tag, doc);
      return Array.from(els).filter(el => {
        const innerText = el.innerText?.trim();
        return innerText && innerText.includes(text);
      });
    }
    
    // Also handle template literal format
    const m2 = selector.match(/locator\(`(.+?):has-text\("(.+?)"\)`\)/);
    if (m2) {
      const tag = m2[1];
      const text = m2[2];
      const els = querySelectorAllDeep(tag, doc);
      return Array.from(els).filter(el => {
        const innerText = el.innerText?.trim();
        return innerText && innerText.includes(text);
      });
    }
    
    // Handle :has-text() without tagname (e.g., page.locator(":has-text('text')"))
    const m3 = selector.match(/locator\(['"`]:has-text\(['"](.+?)['"]\)['"`]\)/);
    if (m3) {
      const text = m3[1];
      const els = querySelectorAllDeep('*', doc);
      return Array.from(els).filter(el => {
        const innerText = el.innerText?.trim();
        return innerText && innerText.includes(text);
      });
    }
  }

  // :text-is() pseudo-class - exact text match
  if (selector.includes(':text-is(')) {
    const m = selector.match(/locator\(['"`]:text-is\(['"](.+?)['"]\)['"`]\)/);
    if (m) {
      const text = m[1];
      const els = querySelectorAllDeep('*', doc);
      return Array.from(els).filter(el => {
        // Check if element has direct text content (not just in children)
        const hasDirectText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
        if (!hasDirectText && el.children.length > 0) return false;
        const innerText = el.innerText?.trim();
        return innerText === text;
      });
    }
  }

  // :text() pseudo-class - partial text match
  if (selector.includes(':text(')) {
    const m = selector.match(/locator\(['"`]:text\(['"](.+?)['"]\)['"`]\)/);
    if (m) {
      const text = m[1];
      const els = querySelectorAllDeep('*', doc);
      return Array.from(els).filter(el => {
        const hasDirectText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
        if (!hasDirectText && el.children.length > 0) return false;
        const innerText = el.innerText?.trim();
        return innerText && innerText.includes(text);
      });
    }
  }

  // :visible pseudo-class - element is visible
  if (selector.includes(':visible')) {
    const m = selector.match(/locator\(['"`]([^'"]+):visible['"`]\)/);
    if (m) {
      const baseSelector = m[1];
      const els = querySelectorAllDeep(baseSelector, doc);
      return Array.from(els).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               el.offsetParent !== null;
      });
    }
  }

  // :hidden pseudo-class - element is hidden
  if (selector.includes(':hidden')) {
    const m = selector.match(/locator\(['"`]([^'"]+):hidden['"`]\)/);
    if (m) {
      const baseSelector = m[1];
      const els = querySelectorAllDeep(baseSelector, doc);
      return Array.from(els).filter(el => {
        const style = window.getComputedStyle(el);
        return style.display === 'none' || 
               style.visibility === 'hidden' || 
               style.opacity === '0' ||
               el.offsetParent === null;
      });
    }
  }

  // XPath selector
  if (selector.includes('//') || selector.includes('//*')) {
    // Try different patterns for template literals and regular strings
    let m = selector.match(/locator`([^`]+)`/); // Template literal with backticks
    if (!m) m = selector.match(/locator\('([^']+)'\)/); // Single quotes
    if (!m) m = selector.match(/locator\("([^"]+)"\)/); // Double quotes
    
    if (m && m[1] && (m[1].startsWith('//') || m[1].startsWith('//*'))) {
      try {
        const xpath = m[1];
        const result = doc.evaluate(xpath, doc, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        const matches = [];
        for (let i = 0; i < result.snapshotLength; i++) {
          matches.push(result.snapshotItem(i));
        }
        return matches;
      } catch (e) {
        return [];
      }
    }
  }

  // filter hasText - MUST come BEFORE generic locator
  if (selector.includes('.filter({ hasText:') || selector.includes('.filter({hasText:')) {
    // Match the base locator more carefully - non-greedy
    const baseM = selector.match(/locator\((['"`])([^'"`]+)\1\)/);
    const textM = selector.match(/hasText:\s*(['"`])([^'"`]+)\1/);
    if (baseM && textM) {
      const baseSelector = baseM[2];
      const searchText = textM[2];
      try {
        const els = doc.querySelectorAll(baseSelector);
        return Array.from(els).filter(el => {
          // Playwright uses innerText for hasText filter
          // innerText gives rendered text, respecting visibility
          const text = el.innerText;
          if (!text) return false;
          
          // Check if this element's innerText contains the search string
          return text.includes(searchText);
        });
      } catch (e) {
        return [];
      }
    }
  }

  // filter with has
  if (selector.includes('.filter({ has:')) {
    const baseM = selector.match(/locator\((['"`])([^'"`]+)\1\)/);
    const hasM = selector.match(/has:\s*page\.locator\((['"`])([^'"`]+)\1\)/);
    if (baseM && hasM) {
      const baseSelector = baseM[2];
      const childSelector = hasM[2];
      try {
        const els = doc.querySelectorAll(baseSelector);
        return Array.from(els).filter(el => {
          try {
            return el.querySelector(childSelector) !== null;
          } catch (e) {
            return false;
          }
        });
      } catch (e) {
        return [];
      }
    }
  }

  // CSS selector (regular locator) - AFTER filter checks, skip if has .filter()
  if (selector.includes('locator') && !selector.includes('.filter(')) {
    let cssSelector = null;
    
    // Try template literal with backticks
    const templateMatch = selector.match(/locator`([^`]+)`/);
    if (templateMatch) {
      cssSelector = templateMatch[1];
    } else {
      // For quoted strings, we need to find the matching closing quote
      // Check which quote type is used
      if (selector.includes("locator('")) {
        // Single quotes - find matching closing single quote
        const start = selector.indexOf("locator('") + 9; // length of "locator('"
        const rest = selector.substring(start);
        const end = rest.indexOf("')");
        if (end !== -1) {
          cssSelector = rest.substring(0, end);
        }
      } else if (selector.includes('locator("')) {
        // Double quotes - find matching closing double quote
        const start = selector.indexOf('locator("') + 9; // length of 'locator("'
        const rest = selector.substring(start);
        const end = rest.indexOf('")');
        if (end !== -1) {
          cssSelector = rest.substring(0, end);
        }
      }
    }
    
    if (cssSelector) {
      try {
        // Make sure it's not an XPath
        if (!cssSelector.startsWith('//') && !cssSelector.startsWith('//*')) {
          return querySelectorAllDeep(cssSelector, doc);
        }
      } catch (e) {
        return [];
      }
    }
  }

  // nth - handle inline nth (not at end, which was handled above)
  if (selector.includes('.nth(')) {
    const baseM = selector.match(/locator\((['"`])([^'"`]+)\1\)/);
    const nthM = selector.match(/\.nth\((\d+)\)/);
    if (baseM && nthM && !selector.endsWith(')')) {
      // This is an inline nth, not handled above
      const all = Array.from(doc.querySelectorAll(baseM[2]));
      const index = parseInt(nthM[1]);
      return index < all.length ? [all[index]] : [];
    }
  }

  // locator - catch-all
  if (selector.includes('locator')) {
    const m = selector.match(/locator\((['"`])([^'"`]+)\1\)/) || selector.match(/locator\(`([^`]+)`\)/);
    if (m) {
      try {
        const cssSelector = m[2] || m[1];
        return querySelectorAllDeep(cssSelector, doc);
      } catch (e) {
        return [];
      }
    }
  }

  return [];
}

/**
 * Find elements by role (with shadow DOM piercing)
 */
function findByRoleDeep(role, name, doc) {
  const all = querySelectorAllDeep('*', doc);
  return all.filter(el => {
    const r = el.getAttribute('role') || getImplicitRole(el);
    if (r !== role) return false;
    if (name) {
      const n = getAccessibleName(el);
      return n && n.includes(name);
    }
    return true;
  });
}

/**
 * Find elements by label (with shadow DOM piercing)
 */
function findByLabelDeep(text, exact, doc) {
  const matches = [];
  querySelectorAllDeep('label', doc).forEach(label => {
    const t = label.textContent?.trim();
    const match = exact ? t === text : t?.includes(text);
    if (match) {
      if (label.htmlFor) {
        const target = querySelectorAllDeep(`#${label.htmlFor}`, doc)[0];
        if (target) matches.push(target);
      } else {
        const input = label.querySelector('input, select, textarea');
        if (input) matches.push(input);
      }
    }
  });
  querySelectorAllDeep('[aria-label]', doc).forEach(el => {
    const a = el.getAttribute('aria-label');
    const match = exact ? a === text : a?.includes(text);
    if (match && !matches.includes(el)) matches.push(el);
  });
  return matches;
}

/**
 * Find elements by text (with shadow DOM piercing)
 */
function findByTextDeep(text, exact, doc) {
  const all = querySelectorAllDeep('*', doc);
  return all.filter(el => {
    const hasText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
    if (!hasText && el.children.length > 0) return false;
    const t = el.textContent?.trim();
    return exact ? t === text : t?.includes(text);
  });
}

/**
 * Find elements by role
 */
function findByRole(role, name, doc) {
  const all = Array.from(doc.querySelectorAll('*'));
  return all.filter(el => {
    const r = el.getAttribute('role') || getImplicitRole(el);
    if (r !== role) return false;
    if (name) {
      const n = getAccessibleName(el);
      return n && n.includes(name);
    }
    return true;
  });
}

/**
 * Find elements by label
 */
function findByLabel(text, exact, doc) {
  const matches = [];
  doc.querySelectorAll('label').forEach(label => {
    const t = label.textContent?.trim();
    const match = exact ? t === text : t?.includes(text);
    if (match) {
      if (label.htmlFor) {
        const target = doc.getElementById(label.htmlFor);
        if (target) matches.push(target);
      } else {
        const input = label.querySelector('input, select, textarea');
        if (input) matches.push(input);
      }
    }
  });
  doc.querySelectorAll('[aria-label]').forEach(el => {
    const a = el.getAttribute('aria-label');
    const match = exact ? a === text : a?.includes(text);
    if (match && !matches.includes(el)) matches.push(el);
  });
  return matches;
}

/**
 * Find elements by text
 */
function findByText(text, exact, doc) {
  const all = Array.from(doc.querySelectorAll('*'));
  return all.filter(el => {
    const hasText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
    if (!hasText && el.children.length > 0) return false;
    const t = el.textContent?.trim();
    return exact ? t === text : t?.includes(text);
  });
}

/**
 * Test a selector and show matches
 * ENHANCED: Works correctly with .first(), .last(), and chained locators
 */
function testSelector(selectorString) {
  const elements = getSelectorMatches(selectorString);
  const count = elements.length;
  
  const icon = count === 1 ? '🟢' : count <= 3 ? '🟡' : count === 0 ? '🔴' : '🔴';
  
  // Display matched elements
  if (count > 0) {
    elements.slice(0, 5).forEach((el, i) => {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const classes = el.className && typeof el.className === 'string' ? 
        `.${el.className.split(' ').filter(c => c).slice(0, 2).join('.')}` : '';
      const text = el.textContent?.trim().substring(0, 30) || '';
      const textDisplay = text ? ` "${text}${text.length > 30 ? '...' : ''}"` : '';
    });
  }
  return elements;
}

/**
 * Display detailed info about matched elements
 * ENHANCED: Works correctly with .first(), .last(), and chained locators
 */
function inspectMatches(selectorString) {
  const elements = getSelectorMatches(selectorString);
  
  if (elements.length === 0) {
    return elements;
  }
  
  elements.forEach((el, i) => {
    const text = el.textContent?.trim();
    
    // Show key attributes
    const attrs = ['data-testid', 'data-test', 'aria-label', 'placeholder', 'alt', 'title', 'href'];
    const foundAttrs = attrs.filter(a => el.hasAttribute(a));
    if (foundAttrs.length > 0) {
      foundAttrs.forEach(a => {
      });
    }
  });
  
  return elements;
}

// Stub function for displaySelectors (you can implement this as needed)
function displaySelectors(selectors) {

}

/**
 * DEMO: Show how to convert legacy >> syntax to modern equivalents
 */
function demoLegacyConversion() {
  const legacyExamples = [
    'page.locator("div[class=\'userform\'] >> text=Company")',
    'page.locator("table >> tr >> button")',
    'page.locator(".container >> [data-testid=\'submit\']")'
  ];
  
  legacyExamples.forEach(legacy => {
    const modern = normalizeLegacyOperators(legacy);
  });
}

/**
 * UTILITY: List all elements in shadow DOM (for debugging)
 * @param {Element} root - Root element to start from (default: document.body)
 * @returns {Array} List of all elements with their location info
 */
function listAllShadowElements(root = document.body) {
  const result = [];
  
  function traverse(element, path = []) {
    const info = {
      tag: element.tagName?.toLowerCase(),
      id: element.id || null,
      classes: element.className && typeof element.className === 'string' ? element.className.split(' ').filter(c => c) : [],
      path: path.join(' > '),
      hasShadow: !!element.shadowRoot
    };
    
    result.push(info);
    
    // Traverse shadow DOM
    if (element.shadowRoot) {
      const shadowChildren = element.shadowRoot.querySelectorAll('*');
      shadowChildren.forEach(child => {
        traverse(child, [...path, `${info.tag}${info.id ? '#' + info.id : ''}`, '(shadow)']);
      });
    }
    
    // Traverse regular children (but not if we're in shadow DOM, as querySelectorAll('*') already got them)
  }
  
  // Get all elements
  const allElements = root.querySelectorAll('*');
  allElements.forEach(el => traverse(el, []));
  
  return result;
}



/**
 * Convert Python Playwright syntax to JavaScript
 * @param {string} pythonSelector - Python Playwright selector (e.g., 'page.get_by_role("button", name="Submit")')
 * @returns {string} JavaScript equivalent
 */
function convertPythonToJavaScript(pythonSelector) {
  if (!pythonSelector.includes('_') && !pythonSelector.includes('name=') && !pythonSelector.includes('re.compile')) {
    return pythonSelector; // Already JavaScript syntax
  }
  
  let jsSelector = pythonSelector;
  
  // Convert snake_case methods to camelCase
  const methodMappings = {
    'get_by_role': 'getByRole',
    'get_by_text': 'getByText',
    'get_by_label': 'getByLabel',
    'get_by_placeholder': 'getByPlaceholder',
    'get_by_alt_text': 'getByAltText',
    'get_by_title': 'getByTitle',
    'get_by_test_id': 'getByTestId',
    'frame_locator': 'frameLocator'
  };
  
  Object.entries(methodMappings).forEach(([python, js]) => {
    jsSelector = jsSelector.replace(new RegExp(`\\.${python}\\(`, 'g'), `.${js}(`);
  });
  
  // Convert Python regex pattern: re.compile(r"pattern", re.IGNORECASE) -> /pattern/i
  jsSelector = jsSelector.replace(
    /re\.compile\(r["']([^"']+)["'](?:,\s*re\.(\w+))?\)/g,
    (match, pattern, flag) => {
      let jsFlags = '';
      if (flag) {
        const flagMap = {
          'IGNORECASE': 'i',
          'MULTILINE': 'm',
          'DOTALL': 's',
          'I': 'i',
          'M': 'm',
          'S': 's'
        };
        jsFlags = flagMap[flag] || '';
      }
      return `/${pattern}/${jsFlags}`;
    }
  );
  
  // Convert Python regex pattern with multiple flags: re.compile(r"pattern", re.IGNORECASE | re.MULTILINE)
  jsSelector = jsSelector.replace(
    /re\.compile\(r["']([^"']+)["'],\s*([^)]+)\)/g,
    (match, pattern, flags) => {
      let jsFlags = '';
      if (flags.includes('IGNORECASE') || flags.includes('re.I')) jsFlags += 'i';
      if (flags.includes('MULTILINE') || flags.includes('re.M')) jsFlags += 'm';
      if (flags.includes('DOTALL') || flags.includes('re.S')) jsFlags += 's';
      return `/${pattern}/${jsFlags}`;
    }
  );
  
  // Convert Python named parameters with regex to JavaScript object syntax
  // Pattern: method("value", name=/pattern/i) -> method('value', { name: /pattern/i })
  jsSelector = jsSelector.replace(
    /(getByRole|getByText|getByLabel|getByPlaceholder)\(["']([^"']+)["'],\s*name=\/([^\/]+)\/([gimsuy]*)\)/g,
    (match, method, value, pattern, flags) => {
      return `${method}('${value.replace(/'/g, "\\'")}', { name: /${pattern}/${flags} })`;
    }
  );
  
  // Convert Python named parameters to JavaScript object syntax
  // Pattern: method("value", name="text") -> method('value', { name: 'text' })
  jsSelector = jsSelector.replace(
    /(getByRole|getByText|getByLabel|getByPlaceholder)\(["']([^"']+)["'],\s*name=["']([^"']+)["']\)/g,
    (match, method, value, name) => {
      return `${method}('${value.replace(/'/g, "\\'")}', { name: '${name.replace(/'/g, "\\'")}' })`;
    }
  );
  
  // Convert Python exact parameter: exact=True -> { exact: true }
  jsSelector = jsSelector.replace(
    /(getByText|getByLabel|getByPlaceholder)\(["']([^"']+)["'],\s*exact=True\)/g,
    (match, method, value) => {
      return `${method}('${value.replace(/'/g, "\\'")}', { exact: true })`;
    }
  );
  
  // Convert Python exact parameter: exact=False -> { exact: false }
  jsSelector = jsSelector.replace(
    /(getByText|getByLabel|getByPlaceholder)\(["']([^"']+)["'],\s*exact=False\)/g,
    (match, method, value) => {
      return `${method}('${value.replace(/'/g, "\\'")}', { exact: false })`;
    }
  );
  
  // Handle has_text in filter: filter(has_text="text") -> filter({ hasText: "text" })
  jsSelector = jsSelector.replace(
    /\.filter\(\s*has_text=["']([^"']+)["']\s*\)/g,
    (match, text) => {
      return `.filter({ hasText: '${text.replace(/'/g, "\\'")}' })`;
    }
  );
  
  // Handle has in filter: filter(has=page.locator("selector")) -> filter({ has: page.locator("selector") })
  jsSelector = jsSelector.replace(
    /\.filter\(\s*has=([^)]+)\)/g,
    (match, locator) => {
      return `.filter({ has: ${locator} })`;
    }
  );
  
  // Convert nth() if needed
  jsSelector = jsSelector.replace(/\.nth\((\d+)\)/g, '.nth($1)');
  
  // Convert first() and last()
  jsSelector = jsSelector.replace(/\.first\(\)/g, '.first()');
  jsSelector = jsSelector.replace(/\.last\(\)/g, '.last()');
  
  return jsSelector.trim();
}


/**
 * Find elements by role with regex name matching (with shadow DOM piercing)
 */
function findByRoleDeepWithRegex(role, nameRegex, doc) {
  const all = querySelectorAllDeep('*', doc);
  return all.filter(el => {
    const r = el.getAttribute('role') || getImplicitRole(el);
    if (r !== role) return false;
    if (nameRegex) {
      const n = getAccessibleName(el);
      return n && nameRegex.test(n);
    }
    return true;
  });
}

/**
 * Count by role with regex name matching (with shadow DOM piercing)
 */
function countByRoleDeepWithRegex(role, nameRegex, doc) {
  const all = querySelectorAllDeep('*', doc);
  return all.filter(el => {
    const r = el.getAttribute('role') || getImplicitRole(el);
    if (r !== role) return false;
    if (nameRegex) {
      const n = getAccessibleName(el);
      return n && nameRegex.test(n);
    }
    return true;
  }).length;
}


/**
 * Convert C# Playwright syntax to JavaScript
 * @param {string} csharpSelector - C# Playwright selector
 * @returns {string} JavaScript equivalent
 */
function convertCSharpToJavaScript(csharpSelector) {
  if (!csharpSelector.includes('Page.') && !csharpSelector.includes('AriaRole.') && 
      !csharpSelector.includes('new ') && csharpSelector.includes('page.')) {
    return csharpSelector; // Already JavaScript syntax
  }
  
  let jsSelector = csharpSelector;
  
  // Convert Page. to page.
  jsSelector = jsSelector.replace(/\bPage\./g, 'page.');
  
  // Convert PascalCase method names to camelCase
  const methodMappings = {
    'GetByRole': 'getByRole',
    'GetByText': 'getByText',
    'GetByLabel': 'getByLabel',
    'GetByPlaceholder': 'getByPlaceholder',
    'GetByAltText': 'getByAltText',
    'GetByTitle': 'getByTitle',
    'GetByTestId': 'getByTestId',
    'Locator': 'locator',
    'FrameLocator': 'frameLocator',
    'Filter': 'filter',
    'First': 'first',
    'Last': 'last',
    'Nth': 'nth'
  };
  
  Object.entries(methodMappings).forEach(([csharp, js]) => {
    jsSelector = jsSelector.replace(new RegExp(`\\.${csharp}\\(`, 'g'), `.${js}(`);
  });
  
  // Convert AriaRole.Button -> 'button'
  jsSelector = jsSelector.replace(/AriaRole\.(\w+)/g, (match, role) => {
    const jsRole = role.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
    return `'${jsRole}'`;
  });
  
  // Convert C# property initializers to JavaScript object notation
  // { Exact = true } -> { exact: true }
  jsSelector = jsSelector.replace(/\{\s*([^}]+)\s*\}/g, (match) => {
    // Skip if already converted to JavaScript
    if (match.includes(':') && !match.includes('=')) return match;
    
    // Split by comma and convert each property
    const properties = match.slice(1, -1).split(',').map(prop => {
      const [key, value] = prop.split('=').map(s => s.trim());
      if (!key || !value) return prop; // Return unchanged if malformed
      
      const jsKey = key.charAt(0).toLowerCase() + key.slice(1);
      const jsValue = convertCSharpPropertyValue(value);
      return `${jsKey}: ${jsValue}`;
    });
    
    return `{ ${properties.join(', ')} }`;
  });
  
  // FIRST: Remove new Page.XxxOptions (while uppercase still exists)
jsSelector = jsSelector.replace(/new\s+Page\.\w+Options\s*(\{[^}]*\})/g, '$1');
jsSelector = jsSelector.replace(/new\s+Locator\.\w+Options\s*(\{[^}]*\})/g, '$1');

// THEN: Convert Page. to page.
jsSelector = jsSelector.replace(/\bPage\./g, 'page.');
  
  return jsSelector.trim().startsWith('page') ? jsSelector : 'page.' + jsSelector.replace(/^\.+/, '');
}

/**
 * Convert C# property value to JavaScript equivalent
 * @param {string} value - C# value (e.g., 'true', '"text"', 'new Regex(...)')
 * @returns {string} JavaScript equivalent
 */
function convertCSharpPropertyValue(value) {
  value = value.trim();
  
  // Handle boolean values (C# lowercase)
  if (value === 'true') return 'true';
  if (value === 'false') return 'false';
  
  // Handle string values (convert double quotes to single)
  if (value.startsWith('"') && value.endsWith('"')) {
    return `'${value.slice(1, -1).replace(/'/g, "\\'")}'`;
  }
  
  // Handle numeric values
  if (/^\d+$/.test(value)) return value;
  
  // Handle Regex pattern: new Regex(@"pattern", RegexOptions.IgnoreCase)
  if (value.includes('new Regex')) {
    const regexMatch = value.match(/new\s+Regex\(@["']([^"']+)["'](?:,\s*RegexOptions\.(\w+(?:\s*\|\s*RegexOptions\.\w+)*))?\)/);
    if (regexMatch) {
      const pattern = regexMatch[1];
      let flags = '';
      
      if (regexMatch[2]) {
        const flagStr = regexMatch[2];
        if (flagStr.includes('IgnoreCase') || flagStr.includes('I')) flags += 'i';
        if (flagStr.includes('Multiline') || flagStr.includes('M')) flags += 'm';
        if (flagStr.includes('Singleline') || flagStr.includes('S')) flags += 's';
      }
      
      return `/${pattern}/${flags}`;
    }
  }
  
  // Handle page.Locator() or other locator references
  if (value.includes('Page.Locator') || value.includes('page.locator')) {
    return convertCSharpToJavaScript(value);
  }
  
  return value;
}