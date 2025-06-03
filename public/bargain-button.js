;(() => {
  console.log("[Bargenix] Bargenix button script v4.4 loaded")

  // Default configuration
  const defaultConfig = {
    buttonText: "Bargain a Deal",
    buttonPosition: "after-buy-button", // after-buy-button, after-add-to-cart, before-buy-button
    buttonColor: "#4F46E5",
    textColor: "#FFFFFF",
    borderRadius: "8px",
    fontSize: "14px",
    padding: "10px 15px",
    smartMode: true,
    customCss: "",
    debug: true,
    chatbotUrl: "", // Custom chatbot URL
  }

  // Actual configuration (will be updated from server)
  let config = { ...defaultConfig }

  // Track if initialization has been completed
  let initialized = false

  // Store customer data
  let customerData = {
    id: null,
    email: null,
    name: null,
    isLoggedIn: false,
  }

  // Analytics event queue
  const analyticsQueue = []
  let processingQueue = false
  let queueTimer = null
  const MAX_QUEUE_SIZE = 10
  const QUEUE_PROCESS_INTERVAL = 5000 // 5 seconds

  // Debug logging function
  function log(...args) {
    if (config.debug) {
      console.log("[Bargenix]", ...args)
    }
  }

  // Function to load configuration from server
  async function loadConfiguration() {
    try {
      const shop = window.location.hostname
      const appUrl = getAppUrl()
      const response = await fetch(`${appUrl}/api/button-config?shop=${shop}&t=${Date.now()}`, {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.settings) {
          log("Loaded configuration from server:", data.settings)

          // Update config with server settings
          config = {
            ...config,
            buttonText: data.settings.button_text || config.buttonText,
            buttonPosition: data.settings.button_position || config.buttonPosition,
            buttonColor: data.settings.button_color || config.buttonColor,
            textColor: data.settings.text_color || config.textColor,
            borderRadius: data.settings.border_radius || config.borderRadius,
            fontSize: data.settings.font_size || config.fontSize,
            padding: data.settings.padding || config.padding,
            smartMode: data.settings.smart_mode !== undefined ? data.settings.smart_mode : config.smartMode,
            customCss: data.settings.custom_css || config.customCss,
            chatbotUrl: data.settings.chatbot_url || config.chatbotUrl,
          }

          // If button already exists, update it
          updateExistingButton()
        }
      }
    } catch (error) {
      log("Error loading configuration:", error)
    }
  }

  // Function to get app URL from script src
  function getAppUrl() {
    const scripts = document.getElementsByTagName("script")
    for (const script of scripts) {
      if (script.src && script.src.includes("bargain-button.js")) {
        const url = new URL(script.src)
        return `${url.protocol}//${url.hostname}`
      }
    }
    return "https://dashboard.bargenix.in"
  }

  // Function to update existing button if it exists
  function updateExistingButton() {
    // Remove any duplicate buttons first
    removeDuplicateButtons()

    const existingButton = document.getElementById("bargenix-bargain-button")
    if (existingButton) {
      log("Updating existing button with new configuration")
      existingButton.textContent = config.buttonText
      applyButtonStyles(existingButton)
    }
  }

  // Function to remove duplicate bargain buttons
  function removeDuplicateButtons() {
    const buttons = document.querySelectorAll(".bargenix-bargain-button")
    if (buttons.length > 1) {
      log(`Found ${buttons.length} bargain buttons, removing duplicates`)
      // Keep the first one, remove the rest
      for (let i = 1; i < buttons.length; i++) {
        buttons[i].parentNode.removeChild(buttons[i])
      }
    }
  }

  // Function to add the bargain button
  async function addBargainButton() {
    // Check if we're on a product page
    if (!isProductPage()) {
      log("Not a product page, skipping")
      return
    }

    // Remove any duplicate buttons first
    removeDuplicateButtons()

    // Check if button already exists
    if (document.getElementById("bargenix-bargain-button")) {
      log("Button already exists, updating styles")
      updateExistingButton()
      return
    }

    log("Adding bargain button to product page")

    // Get product and variant information
    const productId = getProductIdFromPage()
    const variantId = getVariantIdFromPage()
    const shopDomain = window.location.hostname

    if (!productId) {
      log("Could not determine product ID, skipping")
      return
    }

    try {
      // Always show the button, regardless of eligibility
      // The chatbot will handle showing the appropriate message
      const bargainButton = createBargainButton()

      // Store the variant ID as a data attribute for later use
      bargainButton.setAttribute("data-variant-id", variantId)

      insertButton(bargainButton)

      // Track button view
      trackBargainEvent(shopDomain, productId, variantId, "button_view", {
        productTitle: getProductTitle(),
        productPrice: getProductPrice(),
        variantTitle: getVariantTitle(),
        deviceType: getDeviceType(),
      })

      // Add event listener for variant changes
      setupVariantChangeListener(bargainButton)
    } catch (error) {
      log("Error adding bargain button:", error)
    }
  }

  // Function to get device type
  function getDeviceType() {
    const ua = navigator.userAgent
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return "tablet"
    }
    if (
      /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)
    ) {
      return "mobile"
    }
    return "desktop"
  }

  // Function to setup variant change listener
  function setupVariantChangeListener(bargainButton) {
    // Listen for variant selection changes
    const variantSelectors = document.querySelectorAll('select[name="id"], input[name="id"]')

    variantSelectors.forEach((selector) => {
      selector.addEventListener("change", function () {
        const newVariantId = this.value
        log(`Variant changed to: ${newVariantId}`)

        // Update the button's data attribute
        bargainButton.setAttribute("data-variant-id", newVariantId)

        // Track variant change
        const productId = getProductIdFromPage()
        const shopDomain = window.location.hostname

        trackBargainEvent(shopDomain, productId, newVariantId, "variant_change", {
          productTitle: getProductTitle(),
          productPrice: getProductPrice(),
          variantTitle: getVariantTitle(),
          deviceType: getDeviceType(),
        })
      })
    })
  }

  // Function to check if we're on a product page
  function isProductPage() {
    // Check URL patterns common for product pages
    const url = window.location.href
    if (url.includes("/products/")) {
      log("Product page detected via URL")
      return true
    }

    // Check for common product page elements
    const productElements = [
      'form[action*="/cart/add"]',
      'button[name="add"]',
      ".product-form",
      ".product__info-container",
      ".shopify-payment-button",
      ".product-single__meta",
      "h1.product-single__title",
      "h1.product__title",
      ".product__title",
    ]

    for (const selector of productElements) {
      if (document.querySelector(selector)) {
        log("Product page detected via element:", selector)
        return true
      }
    }

    log("Not a product page")
    return false
  }

  // Function to create the bargain button
  function createBargainButton() {
    const button = document.createElement("button")
    button.id = "bargenix-bargain-button"
    button.className = "bargenix-bargain-button"
    button.textContent = config.buttonText
    button.setAttribute("type", "button")
    button.setAttribute("data-bargenix-button", "true")

    // Apply styles
    applyButtonStyles(button)

    // Add click event
    button.addEventListener("click", (e) => {
      e.preventDefault()
      handleBargainButtonClick(button)
    })

    return button
  }

  // Enhanced AI-powered style detection
  function detectThemeButtonStyles() {
    try {
      log("Running AI-powered style detection")

      // First, try to find the Buy Now button as it's usually more distinctive
      const buyNowButton = findBuyNowButton()

      // Then try Add to Cart button
      const addToCartButton = findAddToCartButton()

      // Use the first button we found, preferring Buy Now
      const themeButton = buyNowButton || addToCartButton

      if (!themeButton) {
        log("No theme buttons found for style detection")
        return null
      }

      log("Using button for style detection:", themeButton.outerHTML.substring(0, 100) + "...")

      // Get computed styles
      const styles = window.getComputedStyle(themeButton)

      // Extract all relevant style properties
      const buttonStyles = {
        backgroundColor: styles.backgroundColor,
        textColor: styles.color,
        borderRadius: styles.borderRadius,
        fontSize: styles.fontSize,
        fontFamily: styles.fontFamily,
        fontWeight: styles.fontWeight,
        lineHeight: styles.lineHeight,
        textTransform: styles.textTransform,
        letterSpacing: styles.letterSpacing,
        border: styles.border,
        borderColor: styles.borderColor,
        borderWidth: styles.borderWidth,
        borderStyle: styles.borderStyle,
        boxShadow: styles.boxShadow,
        textShadow: styles.textShadow,
        transition: styles.transition,
        padding: `${styles.paddingTop} ${styles.paddingRight} ${styles.paddingBottom} ${styles.paddingLeft}`,
        margin: `${styles.marginTop} ${styles.marginRight} ${styles.marginBottom} ${styles.marginLeft}`,
        width: styles.width === "auto" ? "100%" : styles.width,
        height: styles.height,
        display: styles.display,
        alignItems: styles.alignItems,
        justifyContent: styles.justifyContent,
        textAlign: styles.textAlign,
        cursor: styles.cursor,
        opacity: styles.opacity,
        outline: styles.outline,
        position: styles.position,
      }

      // Check if the button has a gradient background
      if (styles.backgroundImage && styles.backgroundImage !== "none" && styles.backgroundImage.includes("gradient")) {
        buttonStyles.backgroundImage = styles.backgroundImage
      }

      // Check for flex properties
      if (styles.display === "flex" || styles.display === "inline-flex") {
        buttonStyles.flexDirection = styles.flexDirection
        buttonStyles.flexWrap = styles.flexWrap
        buttonStyles.flexGrow = styles.flexGrow
        buttonStyles.flexShrink = styles.flexShrink
      }

      // Check for grid properties
      if (styles.display === "grid" || styles.display === "inline-grid") {
        buttonStyles.gridTemplateColumns = styles.gridTemplateColumns
        buttonStyles.gridTemplateRows = styles.gridTemplateRows
        buttonStyles.gridGap = styles.gridGap
      }

      // Check for any custom properties
      const customProps = {}
      for (let i = 0; i < styles.length; i++) {
        const prop = styles[i]
        if (prop.startsWith("--")) {
          customProps[prop] = styles.getPropertyValue(prop)
        }
      }

      if (Object.keys(customProps).length > 0) {
        buttonStyles.customProperties = customProps
      }

      // Get parent element styles for context
      const parentStyles = window.getComputedStyle(themeButton.parentNode)
      buttonStyles.parentBackgroundColor = parentStyles.backgroundColor

      log("Detected theme button styles:", buttonStyles)

      return buttonStyles
    } catch (error) {
      log("Error in AI-powered style detection:", error)
      return null
    }
  }

  // Function to find Buy Now button
  function findBuyNowButton() {
    const buyNowSelectors = [
      ".shopify-payment-button button",
      ".shopify-payment-button__button",
      'button[data-testid="Checkout-button"]',
      'button:contains("Buy it now")',
      'button:contains("Buy Now")',
      "button.buy-now",
      "button.buy-it-now",
      'button[aria-label="Buy it now"]',
      'button[aria-label="Buy Now"]',
    ]

    for (const selector of buyNowSelectors) {
      try {
        const elements = document.querySelectorAll(selector)
        if (elements && elements.length > 0) {
          for (const el of elements) {
            // Check if the text content contains "buy" and "now"
            const text = el.textContent.toLowerCase()
            if (text.includes("buy") && text.includes("now")) {
              log("Found Buy Now button with selector:", selector)
              return el
            }
          }
        }
      } catch (e) {
        // Some selectors might not be supported in all browsers
        continue
      }
    }

    // Try a more generic approach - look for buttons with "buy" and "now" in their text
    const allButtons = document.querySelectorAll("button")
    for (const button of allButtons) {
      const text = button.textContent.toLowerCase()
      if (text.includes("buy") && text.includes("now")) {
        log("Found Buy Now button with text search")
        return button
      }
    }

    return null
  }

  // Function to find Add to Cart button
  function findAddToCartButton() {
    const addToCartSelectors = [
      'button[name="add"]',
      "button.add-to-cart",
      "button.product-form__cart-submit",
      "button.product-form--atc-button",
      "button.add_to_cart",
      "button.product-submit",
      'button[data-action="add-to-cart"]',
      "button.product-form__submit",
      "button#AddToCart",
      "button#add-to-cart",
      'input[name="add"]',
      "input.add-to-cart",
      'form[action*="/cart/add"] button[type="submit"]',
    ]

    for (const selector of addToCartSelectors) {
      const button = document.querySelector(selector)
      if (button) {
        log("Found Add to Cart button with selector:", selector)
        return button
      }
    }

    // Try a more generic approach - look for buttons with "add" and "cart" in their text
    const allButtons = document.querySelectorAll("button")
    for (const button of allButtons) {
      const text = button.textContent.toLowerCase()
      if ((text.includes("add") && text.includes("cart")) || text.includes("add to cart")) {
        log("Found Add to Cart button with text search")
        return button
      }
    }

    return null
  }

  // Function to detect button hover styles with enhanced AI approach
  function detectButtonHoverStyles() {
    try {
      // First try to find the Buy Now button
      const buyNowButton = findBuyNowButton()

      // Then try Add to Cart button
      const addToCartButton = findAddToCartButton()

      // Use the first button we found, preferring Buy Now
      const themeButton = buyNowButton || addToCartButton

      if (!themeButton) {
        return null
      }

      // Get original styles
      const originalStyles = window.getComputedStyle(themeButton)

      // Create a comprehensive snapshot of original styles
      const originalSnapshot = {
        backgroundColor: originalStyles.backgroundColor,
        color: originalStyles.color,
        borderColor: originalStyles.borderColor,
        borderWidth: originalStyles.borderStyle,
        boxShadow: originalStyles.boxShadow,
        textShadow: originalStyles.textShadow,
        transform: originalStyles.transform,
        opacity: originalStyles.opacity,
        filter: originalStyles.filter,
        backgroundImage: originalStyles.backgroundImage,
        outline: originalStyles.outline,
        textDecoration: originalStyles.textDecoration,
      }

      // Simulate hover
      themeButton.dispatchEvent(
        new MouseEvent("mouseover", {
          bubbles: true,
          cancelable: true,
        }),
      )

      // Small delay to allow any transitions to start
      setTimeout(() => {
        // Get hover styles
        const hoverStyles = window.getComputedStyle(themeButton)

        // Create a comprehensive snapshot of hover styles
        const hoverSnapshot = {
          backgroundColor: hoverStyles.backgroundColor,
          color: hoverStyles.color,
          borderColor: hoverStyles.borderColor,
          borderWidth: hoverStyles.borderStyle,
          boxShadow: hoverStyles.boxShadow,
          textShadow: hoverStyles.textShadow,
          transform: hoverStyles.transform,
          opacity: hoverStyles.opacity,
          filter: hoverStyles.filter,
          backgroundImage: hoverStyles.backgroundImage,
          outline: hoverStyles.outline,
          textDecoration: hoverStyles.textDecoration,
        }

        // Reset to original state
        themeButton.dispatchEvent(
          new MouseEvent("mouseout", {
            bubbles: true,
            cancelable: true,
          }),
        )

        // Compare and return only the properties that changed
        const changedProperties = {}
        for (const prop in hoverSnapshot) {
          if (hoverSnapshot[prop] !== originalSnapshot[prop]) {
            changedProperties[prop] = hoverSnapshot[prop]
          }
        }

        log("Detected hover style changes:", changedProperties)

        return Object.keys(changedProperties).length > 0 ? changedProperties : null
      }, 50)

      // Default return in case the timeout hasn't completed
      return null
    } catch (error) {
      log("Error detecting button hover styles:", error)
      return null
    }
  }

  // Function to apply styles to the button with AI-enhanced matching
  function applyButtonStyles(button) {
    // Start with base styles
    let buttonStyle = `
      display: block;
      width: 100%;
      text-align: center;
      margin-top: 10px;
      transition: all 0.2s ease;
      cursor: pointer;
      font-weight: 500;
      background-color: ${config.buttonColor};
      color: ${config.textColor};
      border-radius: ${config.borderRadius};
      font-size: ${config.fontSize};
      padding: ${config.padding};
      border: none;
    `

    // If smart mode is enabled, try to match the theme's button style
    if (config.smartMode) {
      const themeStyles = detectThemeButtonStyles()
      if (themeStyles) {
        log("Smart mode: Using AI-detected theme button styles")

        // Build a comprehensive style string from detected properties
        buttonStyle = `
          display: ${themeStyles.display || "block"};
          width: ${themeStyles.width || "100%"};
          text-align: ${themeStyles.textAlign || "center"};
          margin-top: 10px;
          cursor: ${themeStyles.cursor || "pointer"};
          font-family: ${themeStyles.fontFamily || "inherit"};
          font-weight: ${themeStyles.fontWeight || "500"};
          font-size: ${themeStyles.fontSize || config.fontSize};
          line-height: ${themeStyles.lineHeight || "normal"};
          letter-spacing: ${themeStyles.letterSpacing || "normal"};
          text-transform: ${themeStyles.textTransform || "none"};
          background-color: ${themeStyles.backgroundColor || config.buttonColor};
          color: ${themeStyles.textColor || config.textColor};
          border-radius: ${themeStyles.borderRadius || config.borderRadius};
          padding: ${themeStyles.padding || config.padding};
          border: ${themeStyles.border || "none"};
          box-shadow: ${themeStyles.boxShadow || "none"};
          text-shadow: ${themeStyles.textShadow || "none"};
          transition: ${themeStyles.transition || "all 0.2s ease"};
          opacity: ${themeStyles.opacity || "1"};
          outline: ${themeStyles.outline || "none"};
        `

        // Add background image if it exists (for gradients)
        if (themeStyles.backgroundImage) {
          buttonStyle += `background-image: ${themeStyles.backgroundImage};`
        }

        // Add flex properties if applicable
        if (themeStyles.display === "flex" || themeStyles.display === "inline-flex") {
          buttonStyle += `
            flex-direction: ${themeStyles.flexDirection || "row"};
            flex-wrap: ${themeStyles.flexWrap || "nowrap"};
            flex-grow: ${themeStyles.flexGrow || "0"};
            flex-shrink: ${themeStyles.flexShrink || "1"};
            align-items: ${themeStyles.alignItems || "center"};
            justify-content: ${themeStyles.justifyContent || "center"};
          `
        }

        // Add grid properties if applicable
        if (themeStyles.display === "grid" || themeStyles.display === "inline-grid") {
          buttonStyle += `
            grid-template-columns: ${themeStyles.gridTemplateColumns || "auto"};
            grid-template-rows: ${themeStyles.gridTemplateRows || "auto"};
            grid-gap: ${themeStyles.gridGap || "0"};
          `
        }

        // Add any custom CSS properties
        if (themeStyles.customProperties) {
          for (const prop in themeStyles.customProperties) {
            buttonStyle += `${prop}: ${themeStyles.customProperties[prop]};`
          }
        }
      }
    }

    // Add any custom CSS
    if (config.customCss) {
      buttonStyle += config.customCss
    }

    // Apply the styles
    button.setAttribute("style", buttonStyle)

    // Add hover effect with AI-enhanced detection
    const originalStyle = buttonStyle
    button.addEventListener("mouseover", function () {
      // If smart mode is enabled, try to match the hover effect
      if (config.smartMode) {
        const hoverStyles = detectButtonHoverStyles()
        if (hoverStyles) {
          let hoverStyle = originalStyle

          // Apply detected hover styles
          for (const prop in hoverStyles) {
            // Convert camelCase to kebab-case for CSS
            const cssProperty = prop.replace(/([A-Z])/g, "-$1").toLowerCase()
            hoverStyle += `${cssProperty}: ${hoverStyles[prop]};`
          }

          this.setAttribute("style", hoverStyle)
          return
        }
      }

      // Default hover effect
      this.style.backgroundColor = darkenColor(config.buttonColor, 10)
      this.style.opacity = "0.95"
    })

    button.addEventListener("mouseout", function () {
      this.setAttribute("style", originalStyle)
    })
  }

  // Function to darken a color
  function darkenColor(color, percent) {
    try {
      // Convert hex to RGB
      let r, g, b
      if (color.startsWith("#")) {
        const hex = color.substring(1)
        r = Number.parseInt(hex.substring(0, 2), 16)
        g = Number.parseInt(hex.substring(2, 4), 16)
        b = Number.parseInt(hex.substring(4, 6), 16)
      } else if (color.startsWith("rgb")) {
        const match = color.match(/rgba?$$(\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?$$/)
        if (match) {
          r = Number.parseInt(match[1])
          g = Number.parseInt(match[2])
          b = Number.parseInt(match[3])
        } else {
          return color
        }
      } else {
        return color
      }

      // Darken
      r = Math.max(0, Math.floor((r * (100 - percent)) / 100))
      g = Math.max(0, Math.floor((g * (100 - percent)) / 100))
      b = Math.max(0, Math.floor((b * (100 - percent)) / 100))

      // Convert back to hex
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
    } catch (error) {
      log("Error darkening color:", error)
      return color
    }
  }

  // Function to insert the button in the best location
  function insertButton(bargainButton) {
    // First check if the button already exists
    if (document.getElementById("bargenix-bargain-button")) {
      log("Button already exists, not inserting a new one")
      return true
    }

    // Determine insertion strategy based on button position setting
    if (config.buttonPosition === "after-buy-button") {
      if (insertAfterBuyNowButton(bargainButton)) return true
    } else if (config.buttonPosition === "after-add-to-cart") {
      if (insertAfterAddToCartButton(bargainButton)) return true
    } else if (config.buttonPosition === "before-buy-button") {
      if (insertBeforeBuyNowButton(bargainButton)) return true
    }

    // If the specified position didn't work, try all strategies
    if (config.buttonPosition !== "after-buy-button" && insertAfterBuyNowButton(bargainButton)) return true
    if (config.buttonPosition !== "after-add-to-cart" && insertAfterAddToCartButton(bargainButton)) return true
    if (config.buttonPosition !== "before-buy-button" && insertBeforeBuyNowButton(bargainButton)) return true

    // Try other fallback strategies
    if (insertInCartForm(bargainButton)) return true
    if (insertAfterPrice(bargainButton)) return true
    if (insertInProductInfo(bargainButton)) return true

    // Last resort - add to body with fixed position
    log("No suitable insertion point found, adding fixed position button")
    bargainButton.style.position = "fixed"
    bargainButton.style.bottom = "20px"
    bargainButton.style.right = "20px"
    bargainButton.style.zIndex = "9999"
    bargainButton.style.width = "auto"
    bargainButton.style.maxWidth = "200px"
    document.body.appendChild(bargainButton)
    return true
  }

  // Strategy 1: Insert after Buy Now button
  function insertAfterBuyNowButton(bargainButton) {
    const buyNowButton = findBuyNowButton()
    if (buyNowButton) {
      log("Found Buy it now button, inserting after it")
      if (buyNowButton.parentNode) {
        buyNowButton.parentNode.insertBefore(bargainButton, buyNowButton.nextSibling)
        return true
      }
    }
    return false
  }

  // Strategy 2: Insert after Add to Cart button
  function insertAfterAddToCartButton(bargainButton) {
    const addToCartButton = findAddToCartButton()
    if (addToCartButton) {
      log("Found Add to cart button, inserting after it")
      if (addToCartButton.parentNode) {
        addToCartButton.parentNode.insertBefore(bargainButton, addToCartButton.nextSibling)
        return true
      }
    }
    return false
  }

  // Strategy 3: Insert before Buy Now button
  function insertBeforeBuyNowButton(bargainButton) {
    const buyNowButton = findBuyNowButton()
    if (buyNowButton) {
      log("Found Buy it now button, inserting before it")
      if (buyNowButton.parentNode) {
        buyNowButton.parentNode.insertBefore(bargainButton, buyNowButton)
        return true
      }
    }
    return false
  }

  // Strategy 4: Insert in cart form
  function insertInCartForm(bargainButton) {
    const cartForm = document.querySelector('form[action*="/cart/add"]')
    if (cartForm) {
      log("Found cart form, appending to it")
      cartForm.appendChild(bargainButton)
      return true
    }
    return false
  }

  // Strategy 5: Insert after price
  function insertAfterPrice(bargainButton) {
    const priceElement = document.querySelector(".price, .product__price, .product-single__price")
    if (priceElement && priceElement.parentNode) {
      log("Found price element, inserting after it")
      priceElement.parentNode.insertBefore(bargainButton, priceElement.nextSibling)
      return true
    }
    return false
  }

  // Strategy 6: Insert in product info
  function insertInProductInfo(bargainButton) {
    const productInfoContainer = document.querySelector(
      ".product__info-container, .product-single__meta, .product-details",
    )
    if (productInfoContainer) {
      log("Found product info container, appending to it")
      productInfoContainer.appendChild(bargainButton)
      return true
    }
    return false
  }

  // Function to get product ID from the page
  function getProductIdFromPage() {
    // Try to get product ID from meta tags
    const metaTag = document.querySelector('meta[property="og:product_id"], meta[name="product-id"]')
    if (metaTag && metaTag.content) {
      return metaTag.content
    }

    // Try to get from JSON-LD
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]')
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent)
        if (data && data["@type"] === "Product" && data.productID) {
          return data.productID
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    // Try to get from URL
    const urlMatch = window.location.pathname.match(/\/products\/([^/?#]+)/)
    if (urlMatch && urlMatch[1]) {
      return urlMatch[1]
    }

    // Try to get from form
    const addToCartForm = document.querySelector('form[action*="/cart/add"]')
    if (addToCartForm) {
      const idInput = addToCartForm.querySelector('input[name="id"]')
      if (idInput && idInput.value) {
        return idInput.value
      }
    }

    // Try to get from Shopify object if available
    if (window.ShopifyAnalytics && window.ShopifyAnalytics.meta && window.ShopifyAnalytics.meta.product) {
      return window.ShopifyAnalytics.meta.product.id.toString()
    }

    return null
  }

  // Function to get variant ID
  function getVariantIdFromPage() {
    // Try to get from form
    const addToCartForm = document.querySelector('form[action*="/cart/add"]')
    if (addToCartForm) {
      const idInput = addToCartForm.querySelector('input[name="id"], select[name="id"]')
      if (idInput && idInput.value) {
        return idInput.value
      }
    }

    // Try to get from URL
    const urlParams = new URLSearchParams(window.location.search)
    const variantParam = urlParams.get("variant")
    if (variantParam) {
      return variantParam
    }

    // Try to get from Shopify object if available
    if (window.ShopifyAnalytics && window.ShopifyAnalytics.meta && window.ShopifyAnalytics.meta.selectedVariantId) {
      return window.ShopifyAnalytics.meta.selectedVariantId.toString()
    }

    return "default"
  }

  // Update the createChatbotContainer function to be responsive
  function createChatbotContainer() {
    let container = document.getElementById("bargenix-chatbot-container")
    if (!container) {
      container = document.createElement("div")
      container.id = "bargenix-chatbot-container"

      // Add responsive meta tag if not present
      if (!document.querySelector('meta[name="viewport"]')) {
        const viewport = document.createElement("meta")
        viewport.name = "viewport"
        viewport.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
        document.head.appendChild(viewport)
      }

      document.body.appendChild(container)
    }
    return container
  }

  // Function to handle bargain button click
  function handleBargainButtonClick(button) {
    log("Bargain button clicked")

    // Get product information
    const productId = getProductIdFromPage()
    // Get the variant ID from the button's data attribute (which is updated when variants change)
    const variantId = button.getAttribute("data-variant-id") || getVariantIdFromPage()
    const productTitle = getProductTitle()
    const productPrice = getProductPrice()
    const shopDomain = window.location.hostname

    log("Product info:", { productId, variantId, productTitle, productPrice, shopDomain })

    if (!productId) {
      alert("Could not identify the product. Please try again or contact the store owner.")
      return
    }

    // Instead of using an iframe, let's create a direct UI in a div
    showDirectChatbotUI(shopDomain, productId, variantId, productTitle, productPrice)

    // Track this interaction\
    trackBargainEvent(shopDomain, productId, variantId, "button_click", {
      productTitle,
      productPrice,
      variantTitle: getVariantTitle(),
      deviceType: getDeviceType(),
    })
  }

  // Function to show a direct chatbot UI without iframe
  function showDirectChatbotUI(shopDomain, productId, variantId, productTitle, productPrice) {
    // Create or get chatbot container
    let container = document.getElementById("bargenix-chatbot-container")
    if (!container) {
      container = document.createElement("div")
      container.id = "bargenix-chatbot-container"
      document.body.appendChild(container)
    }

    // Apply common container styles for a cleaner look
    container.style.position = "fixed"
    container.style.zIndex = "999999"
    container.style.transition = "all 0.3s ease"
    container.style.background = "#fff"
    container.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.1)"
    container.style.borderRadius = "16px"
    container.style.overflow = "hidden"
    container.style.fontFamily =
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif"

    // Responsive positioning and sizing
    if (window.innerWidth < 768) {
      // Mobile styling
      container.style.left = "50%"
      container.style.bottom = "20px"
      container.style.transform = "translateX(-50%)"
      container.style.width = "calc(100% - 40px)"
      container.style.maxWidth = "400px"
      container.style.height = "auto"
      container.style.maxHeight = "450px"
    } else {
      // Desktop styling
      container.style.right = "20px"
      container.style.bottom = "20px"
      container.style.width = "360px"
      container.style.maxWidth = "90vw"
      container.style.height = "auto"
      container.style.maxHeight = "450px"
    }

    // Show loading state
    container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">
      <div style="display: flex; align-items: center;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="19" cy="12" r="1"></circle>
          <circle cx="5" cy="12" r="1"></circle>
        </svg>
        <span style="margin-left: 12px; font-weight: 500; color: #555;">Bargain now</span>
      </div>
      <div>
        <button id="bargenix-minimize-btn" style="background: none; border: none; cursor: pointer; padding: 4px; margin-right: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button id="bargenix-close-btn" style="background: none; border: none; cursor: pointer; padding: 4px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
    <div style="padding: 32px 20px; text-align: center;">
      <div style="width: 36px; height: 36px; border: 3px solid #f3f3f3; border-top: 3px solid #0052ff; border-radius: 50%; margin: 0 auto; animation: bargenix-spin 1s linear infinite;"></div>
      <p style="margin-top: 16px; color: #666; font-size: 14px;">Checking status...</p>
    </div>
    <div style="padding: 10px; border-top: 1px solid #f0f0f0; text-align: center; font-size: 12px; color: #888;">
      Powered by <span style="color: #555; font-weight: 500;">Bargenix AI</span>
    </div>
    <style>
      @keyframes bargenix-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `

    // Add event listeners
    document.getElementById("bargenix-close-btn").addEventListener("click", () => {
      container.style.display = "none"
      trackBargainEvent(shopDomain, productId, variantId, "chatbot_close", {
        productTitle,
        productPrice,
        deviceType: getDeviceType(),
      })
    })

    document.getElementById("bargenix-minimize-btn").addEventListener("click", () => {
      if (container.style.height === "60px") {
        container.style.height = "auto"
        trackBargainEvent(shopDomain, productId, variantId, "chatbot_restore", {
          productTitle,
          productPrice,
          deviceType: getDeviceType(),
        })
      } else {
        container.style.height = "60px"
        container.style.overflow = "hidden"
        trackBargainEvent(shopDomain, productId, variantId, "chatbot_minimize", {
          productTitle,
          productPrice,
          deviceType: getDeviceType(),
        })
      }
    })

    // Track chatbot view
    trackBargainEvent(shopDomain, productId, variantId, "chatbot_view", {
      productTitle,
      productPrice,
      variantTitle: getVariantTitle(),
      deviceType: getDeviceType(),
    })

    // Check bargaining status
    checkBargainingStatus(container, shopDomain, productId, variantId, productTitle, productPrice)
  }

  // Function to check bargaining status and update UI
  async function checkBargainingStatus(container, shopDomain, productId, variantId, productTitle, productPrice) {
    try {
      const appUrl = getAppUrl()
      const timestamp = Date.now()

      log(`Checking bargaining status: ${shopDomain}, ${productId}, ${variantId}`)

      const response = await fetch(
        `${appUrl}/api/bargain/product-check?shop=${encodeURIComponent(shopDomain)}&productId=${encodeURIComponent(productId)}&variantId=${encodeURIComponent(variantId)}&t=${timestamp}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          mode: "cors",
          credentials: "omit",
        },
      )

      // Improved error handling - don't throw errors for non-OK responses
      // Instead, handle them gracefully
      if (!response.ok) {
        log(`Server returned status ${response.status}`)
        // Show error UI but don't throw an exception
        showErrorUI(container, `Server returned status ${response.status}`, shopDomain, productId, variantId)
        return
      }

      const data = await response.json()
      log("Bargaining status response:", data)

      // Update UI based on bargaining status
      updateChatbotUI(container, data, shopDomain, productId, variantId, productTitle, productPrice)
    } catch (error) {
      log("Error checking bargaining status:", error)

      // Show error UI
      showErrorUI(container, error.message, shopDomain, productId, variantId)
    }
  }

  // Function to update chatbot UI based on bargaining status
  function updateChatbotUI(container, data, shopDomain, productId, variantId, productTitle, productPrice) {
    const isBargainingEnabled = data.bargainingEnabled === true

    // Apply common container styles for a cleaner look
    container.style.position = "fixed"
    container.style.zIndex = "999999"
    container.style.transition = "all 0.3s ease"
    container.style.background = "#fff"
    container.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.1)"
    container.style.borderRadius = "16px"
    container.style.overflow = "hidden"
    container.style.fontFamily =
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif"

    // Responsive positioning and sizing
    if (window.innerWidth < 768) {
      // Mobile styling
      container.style.left = "50%"
      container.style.bottom = "20px"
      container.style.transform = "translateX(-50%)"
      container.style.width = "calc(100% - 40px)"
      container.style.maxWidth = "400px"
      container.style.height = "auto"
      container.style.maxHeight = "450px" // Limit height on mobile
    } else {
      // Desktop styling
      container.style.right = "20px"
      container.style.bottom = "20px"
      container.style.width = "360px"
      container.style.maxWidth = "90vw"
      container.style.height = "auto"
      container.style.maxHeight = "450px" // Limit height on desktop too
    }

    // Common HTML structure for both states
    const headerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">
      <div style="display: flex; align-items: center;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="19" cy="12" r="1"></circle>
          <circle cx="5" cy="12" r="1"></circle>
        </svg>
        <span style="margin-left: 12px; font-weight: 500; color: #555;">Bargain now</span>
      </div>
      <div>
        <button id="bargenix-minimize-btn" style="background: none; border: none; cursor: pointer; padding: 4px; margin-right: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button id="bargenix-close-btn" style="background: none; border: none; cursor: pointer; padding: 4px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
  `

    const footerHTML = `
    <div style="padding: 10px; border-top: 1px solid #f0f0f0; text-align: center; font-size: 12px; color: #888;">
      Powered by <span style="color: #555; font-weight: 500;">Bargenix AI</span>
    </div>
  `

    // Common chat icon
    const chatIconHTML = `
    <div style="width: 60px; height: 60px; background-color: #0052ff; border-radius: 50%; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center;">
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>
    </div>
  `

    if (isBargainingEnabled) {
      // Bargaining enabled UI - more concise
      container.innerHTML = `
      ${headerHTML}
      <div style="display: flex; flex-direction: column;">
        <div style="padding: 24px 20px 16px; text-align: center;">
          ${chatIconHTML}
          <p style="color: #666; margin: 0 0 20px 0; line-height: 1.4; font-size: 14px;">
            Start bargaining for this product
          </p>
          <button id="bargenix-start-chat-btn" style="width: 100%; padding: 12px; background-color: #0052ff; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 15px; transition: background-color 0.2s ease;">
            Start chat
          </button>
        </div>
      </div>
      ${footerHTML}
    `
    } else {
      // Bargaining not enabled UI with Request Bargain feature
      container.innerHTML = `
        ${headerHTML}
        <div style="display: flex; flex-direction: column;">
          <div style="padding: 24px 20px 16px; text-align: center;">
            ${chatIconHTML}
            <p style="color: #666; margin: 0 0 20px 0; line-height: 1.4; font-size: 14px;">
              Bargaining is not available for this product.
            </p>
            <button id="bargenix-request-bargain-btn" style="width: 100%; padding: 12px; background-color: #4CAF50; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 15px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Request Bargain
            </button>
            <p style="text-align: center; color: #666; margin: 0 0 12px 0; font-size: 13px;">Browse other products</p>
            <button id="bargenix-view-products-btn" style="width: 100%; padding: 12px; background-color: #0052ff; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s ease;">
              <span>View enabled products</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 8px;">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        </div>
        ${footerHTML}
      `
    }

    // Add event listeners
    document.getElementById("bargenix-close-btn").addEventListener("click", () => {
      container.style.display = "none"

      // Track close
      trackBargainEvent(shopDomain, productId, variantId, "chatbot_close", {
        productTitle: data.productTitle || productTitle,
        productPrice: data.productPrice || productPrice,
        deviceType: getDeviceType(),
      })
    })

    document.getElementById("bargenix-minimize-btn").addEventListener("click", () => {
      if (container.style.height === "60px") {
        // Restore
        container.style.height = "auto"

        // Track chatbot restore
        trackBargainEvent(shopDomain, productId, variantId, "chatbot_restore", {
          productTitle: data.productTitle || productTitle,
          productPrice: data.productPrice || productPrice,
          deviceType: getDeviceType(),
        })
      } else {
        // Minimize - just show header
        container.style.height = "60px"
        container.style.overflow = "hidden"

        // Track chatbot minimize
        trackBargainEvent(shopDomain, productId, variantId, "chatbot_minimize", {
          productTitle: data.productTitle || productTitle,
          productPrice: data.productPrice || productPrice,
          deviceType: getDeviceType(),
        })
      }
    })

    if (isBargainingEnabled) {
      // Start chat button click handler
      document.getElementById("bargenix-start-chat-btn").addEventListener("click", () => {
        // Start chat logic with customer authentication
        log("Start chat button clicked - initiating customer authentication")

        // Add hover effect
        const startChatBtn = document.getElementById("bargenix-start-chat-btn")
        startChatBtn.addEventListener("mouseover", function () {
          this.style.backgroundColor = "#0043d1"
        })
        startChatBtn.addEventListener("mouseout", function () {
          this.style.backgroundColor = "#0052ff"
        })

        // Check if customer is logged in
        checkCustomerLoginStatus(
          shopDomain,
          productId,
          variantId,
          data.productTitle || productTitle,
          data.productPrice || productPrice,
        )

        // Track this action
        trackBargainEvent(shopDomain, productId, variantId, "chat_started", {
          productTitle: data.productTitle || productTitle,
          productPrice: data.productPrice || productPrice,
          deviceType: getDeviceType(),
        })
      })
    } else {
      // View products button click handler
      const viewProductsBtn = document.getElementById("bargenix-view-products-btn")

      // Add hover effect
      viewProductsBtn.addEventListener("mouseover", function () {
        this.style.backgroundColor = "#0043d1"
      })
      viewProductsBtn.addEventListener("mouseout", function () {
        this.style.backgroundColor = "#0052ff"
      })

      viewProductsBtn.addEventListener("click", () => {
        window.open(`https://${shopDomain}/collections/all`, "_blank")

        // Track this action
        trackBargainEvent(shopDomain, productId, variantId, "view_enabled_products", {
          productTitle: data.productTitle || productTitle,
          productPrice: data.productPrice || productPrice,
          deviceType: getDeviceType(),
        })
      })

      // Request Bargain button click handler
      const requestBargainBtn = document.getElementById("bargenix-request-bargain-btn")

      // Add hover effect
      requestBargainBtn.addEventListener("mouseover", function () {
        this.style.backgroundColor = "#43A047"
      })
      requestBargainBtn.addEventListener("mouseout", function () {
        this.style.backgroundColor = "#4CAF50"
      })

      requestBargainBtn.addEventListener("click", async () => {
        // Change button to loading state
        requestBargainBtn.disabled = true
        requestBargainBtn.innerHTML = `
          <div style="width: 16px; height: 16px; border: 2px solid #ffffff; border-top: 2px solid transparent; border-radius: 50%; margin-right: 8px; animation: bargenix-spin 1s linear infinite;"></div>
          Submitting...
        `

        try {
          // Gather comprehensive product information
          const productInfo = getDetailedProductInfo(productId, variantId)

          // Submit the bargain request with all product details
          const appUrl = getAppUrl()
          const response = await fetch(`${appUrl}/api/bargain/request`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              // Basic info
              shop_domain: shopDomain,
              product_id: productId,
              variant_id: variantId,

              // Product details
              product_title: productInfo.title || data.productTitle || productTitle,
              product_price: productInfo.price || data.productPrice || productPrice,
              product_handle: productInfo.handle,
              product_image_url: productInfo.imageUrl,
              product_type: productInfo.type,
              product_vendor: productInfo.vendor,
              product_tags: productInfo.tags,
              product_collections: productInfo.collections,

              // Variant details
              variant_title: productInfo.variantTitle,
              variant_sku: productInfo.sku,
              variant_inventory_quantity: productInfo.inventoryQuantity,

              // Customer info (if logged in)
              customer_id: customerData.id,
              customer_email: customerData.email,
              customer_name: customerData.name,
              customer_phone: customerData.phone,

              // Analytics data
              device_type: getDeviceType(),
              browser: getBrowserInfo(),
              referrer_url: document.referrer,
              session_id: window.bargenixSessionId,

              // Currency and pricing
              currency_code: productInfo.currencyCode || "USD",
              original_price: productInfo.compareAtPrice || productInfo.price || productPrice,
            }),
          })

          const result = await response.json()

          if (result.success) {
            // Show success message
            container.innerHTML = `
              ${headerHTML}
              <div style="padding: 24px 20px 16px; text-align: center;">
                <div style="width: 60px; height: 60px; background-color: #4CAF50; border-radius: 50%; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center;">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <h3 style="margin: 0 0 8px 0; color: #333; font-size: 16px; font-weight: 600;">Request Submitted!</h3>
                <p style="color: #666; margin: 0 0 20px 0; line-height: 1.4; font-size: 14px;">
                  Thank you for your interest! We've sent your bargain request to the store owner.
                </p>
                <button id="bargenix-close-success-btn" style="width: 100%; padding: 12px; background-color: #0052ff; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 15px;">
                  Close
                </button>
              </div>
              ${footerHTML}
            `

            // Add event listener for the close button
            document.getElementById("bargenix-close-success-btn").addEventListener("click", () => {
              container.style.display = "none"
            })

            // Add hover effect
            const closeSuccessBtn = document.getElementById("bargenix-close-success-btn")
            closeSuccessBtn.addEventListener("mouseover", function () {
              this.style.backgroundColor = "#0043d1"
            })
            closeSuccessBtn.addEventListener("mouseout", function () {
              this.style.backgroundColor = "#0052ff"
            })

            // Track successful request
            trackBargainEvent(shopDomain, productId, variantId, "bargain_request_submitted", {
              productTitle: data.productTitle || productTitle,
              productPrice: data.productPrice || productPrice,
              deviceType: getDeviceType(),
            })
          } else {
            throw new Error(result.message || "Failed to submit request")
          }
        } catch (error) {
          log("Error submitting bargain request:", error)

          // Show error message
          requestBargainBtn.disabled = false
          requestBargainBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Request Bargain
          `

          // Show error toast
          const errorToast = document.createElement("div")
          errorToast.style.position = "fixed"
          errorToast.style.bottom = "20px"
          errorToast.style.left = "50%"
          errorToast.style.transform = "translateX(-50%)"
          errorToast.style.backgroundColor = "#ff3b30"
          errorToast.style.color = "white"
          errorToast.style.padding = "12px 20px"
          errorToast.style.borderRadius = "8px"
          errorToast.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)"
          errorToast.style.zIndex = "1000000"
          errorToast.style.fontFamily =
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif"
          errorToast.style.fontSize = "14px"
          errorToast.textContent = "Failed to submit bargain request. Please try again."

          document.body.appendChild(errorToast)

          // Remove toast after 3 seconds
          setTimeout(() => {
            document.body.removeChild(errorToast)
          }, 3000)

          // Track failed request
          trackBargainEvent(shopDomain, productId, variantId, "bargain_request_failed", {
            productTitle: data.productTitle || productTitle,
            productPrice: data.productPrice || productPrice,
            error: error.message,
            deviceType: getDeviceType(),
          })
        }
      })
    }
  }

  // Function to show error UI
  function showErrorUI(container, errorMessage, shopDomain, productId, variantId) {
    // Apply common container styles for a cleaner look
    container.style.position = "fixed"
    container.style.zIndex = "999999"
    container.style.transition = "all 0.3s ease"
    container.style.background = "#fff"
    container.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.1)"
    container.style.borderRadius = "16px"
    container.style.overflow = "hidden"
    container.style.fontFamily =
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif"

    // Responsive positioning and sizing
    if (window.innerWidth < 768) {
      // Mobile styling
      container.style.left = "50%"
      container.style.bottom = "20px"
      container.style.transform = "translateX(-50%)"
      container.style.width = "calc(100% - 40px)"
      container.style.maxWidth = "400px"
      container.style.height = "auto"
      container.style.maxHeight = "450px"
    } else {
      // Desktop styling
      container.style.right = "20px"
      container.style.bottom = "20px"
      container.style.width = "360px"
      container.style.maxWidth = "90vw"
      container.style.height = "auto"
      container.style.maxHeight = "450px"
    }

    container.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">
      <div style="display: flex; align-items: center;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="19" cy="12" r="1"></circle>
          <circle cx="5" cy="12" r="1"></circle>
        </svg>
        <span style="margin-left: 12px; font-weight: 500; color: #555;">Bargain now</span>
      </div>
      <div>
        <button id="bargenix-minimize-btn" style="background: none; border: none; cursor: pointer; padding: 4px; margin-right: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </button>
        <button id="bargenix-close-btn" style="background: none; border: none; cursor: pointer; padding: 4px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
    </div>
    <div style="padding: 24px 20px 16px; text-align: center;">
      <div style="width: 60px; height: 60px; background-color: #ffebe9; border-radius: 50%; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center;">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h3 style="margin: 0 0 8px 0; color: #333; font-size: 16px; font-weight: 600;">Something went wrong</h3>
      <p style="margin: 0 0 16px 0; color: #666; font-size: 13px;">${errorMessage}</p>
      <button id="bargenix-retry-btn" style="padding: 10px 20px; background-color: #0052ff; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; transition: background-color 0.2s ease; font-size: 14px;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
          <path d="M23 4v6h-6"></path>
          <path d="M1 20v-6h6"></path>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"></path>
          <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"></path>
        </svg>
        Try again
      </button>
    </div>
    <div style="padding: 10px; border-top: 1px solid #f0f0f0; text-align: center; font-size: 12px; color: #888;">
      Powered by <span style="color: #555; font-weight: 500;">Bargenix AI</span>
    </div>
  `

    // Add event listeners
    document.getElementById("bargenix-close-btn").addEventListener("click", () => {
      container.style.display = "none"

      // Track error close
      trackBargainEvent(shopDomain, productId, variantId, "error_close", {
        error: errorMessage,
        deviceType: getDeviceType(),
      })
    })

    document.getElementById("bargenix-minimize-btn").addEventListener("click", () => {
      if (container.style.height === "60px") {
        container.style.height = "auto"
      } else {
        container.style.height = "60px"
        container.style.overflow = "hidden"
      }
    })

    const retryBtn = document.getElementById("bargenix-retry-btn")

    // Add hover effect
    retryBtn.addEventListener("mouseover", function () {
      this.style.backgroundColor = "#0043d1"
    })
    retryBtn.addEventListener("mouseout", function () {
      this.style.backgroundColor = "#0052ff"
    })

    retryBtn.addEventListener("click", () => {
      // Get product information again
      const productId = getProductIdFromPage()
      const variantId = container.getAttribute("data-variant-id") || getVariantIdFromPage()
      const productTitle = getProductTitle()
      const productPrice = getProductPrice()
      const shopDomain = window.location.hostname

      // Track retry
      trackBargainEvent(shopDomain, productId, variantId, "error_retry", {
        error: errorMessage,
        deviceType: getDeviceType(),
      })

      // Try again
      checkBargainingStatus(container, shopDomain, productId, variantId, productTitle, productPrice)
    })
  }

  // Function to get variant title
  function getVariantTitle() {
    // Try to get from select element
    const variantSelect = document.querySelector('select[name="id"]')
    if (variantSelect) {
      const selectedOption = variantSelect.options[variantSelect.selectedIndex]
      if (selectedOption) {
        return selectedOption.text.trim()
      }
    }

    // Try to get from radio buttons
    const selectedRadio = document.querySelector('input[name="id"]:checked')
    if (selectedRadio) {
      const label = document.querySelector(`label[for="${selectedRadio.id}"]`)
      if (label) {
        return label.textContent.trim()
      }
    }

    return "Default Variant"
  }

  // Find the getProductTitle function and replace it with this improved version:

  // Function to get product title
  function getProductTitle() {
    try {
      // Try to get from structured data first (most reliable)
      const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]')
      for (const script of jsonLdScripts) {
        try {
          const data = JSON.parse(script.textContent)
          if (data && data["@type"] === "Product" && data.name) {
            log("Found product title in structured data:", data.name)
            return data.name
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }

      // Try meta tags
      const metaTitle = document.querySelector('meta[property="og:title"], meta[name="twitter:title"]')
      if (metaTitle && metaTitle.content) {
        const title = metaTitle.content.replace(/\s*\|.*$/, "").trim() // Remove store name if present
        log("Found product title in meta tags:", title)
        return title
      }

      // Try common selectors
      const selectors = [
        "h1.product__title",
        "h1.product-single__title",
        "h1.product-title",
        'h1[itemprop="name"]',
        ".product__title",
        ".product-single__title",
        ".product-title",
        ".product-meta h1",
        ".product_title",
        ".product-name h1",
        ".product-info h1",
        ".product-details h1",
      ]

      for (const selector of selectors) {
        const element = document.querySelector(selector)
        if (element) {
          const title = element.textContent.trim()
          log("Found product title with selector:", selector, title)
          return title
        }
      }

      // Fallback to any h1
      const h1 = document.querySelector("h1")
      if (h1) {
        const title = h1.textContent.trim()
        log("Found product title in h1:", title)
        return title
      }

      // Last resort - try to extract from page title
      const pageTitle = document.title
      if (pageTitle) {
        // Try to remove store name and other common suffixes
        const cleanTitle = pageTitle.replace(/\s*[|\-–—]\s*.*$/, "").trim()
        log("Extracted product title from page title:", cleanTitle)
        return cleanTitle
      }

      log("Could not find product title, using fallback")
      return "Product"
    } catch (error) {
      log("Error getting product title:", error)
      return "Product"
    }
  }

  // Function to get product price
  function getProductPrice() {
    const selectors = [
      ".product__price",
      ".product-single__price",
      ".product-price",
      ".price--main",
      ".money",
      'span[itemprop="price"]',
      ".price",
      ".price-item",
      ".product__current-price",
      ".product-price__price",
      "[data-product-price]",
      ".product-single__price .money",
      ".product__price .money",
    ]

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector)
      if (elements && elements.length > 0) {
        for (const element of elements) {
          // Extract price, removing currency symbols and whitespace
          const priceText = element.textContent.trim()
          if (!priceText) continue

          // Try to extract numeric value using regex
          const priceMatch = priceText.match(/[\d,]+\.?\d*/)
          if (priceMatch) {
            // Remove commas and convert to float
            const price = Number.parseFloat(priceMatch[0].replace(/,/g, ""))
            if (!isNaN(price) && price > 0) {
              log("Found price:", price, "from element:", element.outerHTML)
              return price
            }
          }
        }
      }
    }

    // Fallback: Try to find any element containing a price pattern
    const allElements = document.querySelectorAll("*")
    for (const element of allElements) {
      if (element.childNodes.length === 1 && element.firstChild.nodeType === 3) {
        // Text node
        const text = element.textContent.trim()
        // Look for currency symbols followed by numbers
        if (/[$₹€£¥₽₩][\d,]+\.?\d*/.test(text) || /[\d,]+\.?\d*[$₹€£¥₽₩]/.test(text)) {
          const priceMatch = text.match(/[\d,]+\.?\d*/)
          if (priceMatch) {
            const price = Number.parseFloat(priceMatch[0].replace(/,/g, ""))
            if (!isNaN(price) && price > 0) {
              log("Found price using fallback:", price, "from element:", element.outerHTML)
              return price
            }
          }
        }
      }
    }

    // Last resort: Look for structured data in the page
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]')
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent)
        if (data && data.offers && data.offers.price) {
          const price = Number.parseFloat(data.offers.price)
          if (!isNaN(price) && price > 0) {
            log("Found price in structured data:", price)
            return price
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }

    log("Could not find price, defaulting to 0")
    return 0
  }

  // Check for URL parameters indicating a return from login/signup
  function checkReturnFromAuth() {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      const isBargainReturn = urlParams.get("bargenix_bargain") === "true"
      let productId = urlParams.get("product_id")
      let variantId = urlParams.get("variant_id")
      let shouldRestore = false

      // Check URL parameters first
      if (isBargainReturn && productId && variantId) {
        log("Detected return from authentication via URL parameters")
        shouldRestore = true
      }
      // If not in URL, check localStorage as fallback
      else if (!isBargainReturn) {
        try {
          const authInProgress = localStorage.getItem("bargenix_auth_in_progress")
          if (authInProgress === "true") {
            productId = localStorage.getItem("bargenix_product_id")
            variantId = localStorage.getItem("bargenix_variant_id")
            const shopDomain = localStorage.getItem("bargenix_shop_domain") || window.location.hostname

            if (productId && variantId) {
              log("Detected return from authentication via localStorage")
              shouldRestore = true
            }
          }
        } catch (e) {
          // localStorage might not be available
          log("Could not check localStorage for auth state:", e)
        }
      }

      if (shouldRestore) {
        log("Found product and variant IDs:", { productId, variantId })

        // Clean up URL if needed
        if (isBargainReturn) {
          const cleanUrl = window.location.pathname + window.location.hash
          window.history.replaceState({}, document.title, cleanUrl)
        }

        // Clean up localStorage
        try {
          localStorage.removeItem("bargenix_auth_in_progress")
          localStorage.removeItem("bargenix_product_id")
          localStorage.removeItem("bargenix_variant_id")
          localStorage.removeItem("bargenix_shop_domain")
        } catch (e) {
          // Ignore localStorage errors
        }

        // Check if customer is now logged in and restore the chat
        setTimeout(() => {
          const shopDomain = window.location.hostname
          checkCustomerLoginStatus(shopDomain, productId, variantId, getProductTitle(), getProductPrice())
        }, 500) // Small delay to ensure the page is fully loaded
      }
    } catch (error) {
      log("Error checking return from auth:", error)
    }
  }

  // Initialize the script
  async function init() {
    // Check if already initialized to prevent duplicate initialization
    if (initialized) {
      log("Script already initialized, skipping")
      return
    }

    initialized = true
    log("Initializing Bargenix button script v4.4 loaded")

    // Check if returning from login/signup immediately
    checkReturnFromAuth()

    // Remove any existing buttons first to prevent duplicates
    removeDuplicateButtons()

    await loadConfiguration()

    // Add the button immediately and then check for updates
    addBargainButton()

    // Also try after a short delay in case the theme loads elements dynamically
    setTimeout(() => {
      log("Delayed initialization")
      removeDuplicateButtons() // Remove any duplicates that might have been added
      addBargainButton()

      // Check again for auth return after a delay
      checkReturnFromAuth()
    }, 1000)

    // Re-check periodically in case of dynamic content loading or theme changes
    setInterval(() => {
      removeDuplicateButtons() // Always check for and remove duplicates
      if (document.getElementById("bargenix-bargain-button") === null && isProductPage()) {
        log("Periodic check - button not found, re-adding")
        addBargainButton()
      }
    }, 2000)

    // Set up analytics queue processing timer
    queueTimer = setInterval(processAnalyticsQueue, QUEUE_PROCESS_INTERVAL)

    // Process queue on page unload
    window.addEventListener("beforeunload", processAnalyticsQueue)
  }

  // Run the initialization
  init()

  // Also try on page load events
  window.addEventListener("load", () => {
    log("Window load event, checking for button")
    removeDuplicateButtons() // Remove any duplicates that might have been added
    setTimeout(addBargainButton, 500)
  })

  // Try on DOM mutations to catch dynamic content loading
  if (window.MutationObserver) {
    log("Setting up MutationObserver")
    const observer = new MutationObserver((mutations) => {
      // Check for duplicate buttons and remove them
      const buttons = document.querySelectorAll(".bargenix-bargain-button")
      if (buttons.length > 1) {
        removeDuplicateButtons()
      }

      if (document.getElementById("bargenix-bargain-button") === null && isProductPage()) {
        log("DOM changed, re-adding button")
        addBargainButton()
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })
  }

  // Expose global function for manual triggering
  window.bargenixAddButton = () => {
    removeDuplicateButtons()
    addBargainButton()
  }

  window.bargenixUpdateConfig = (newConfig) => {
    config = { ...config, ...newConfig }
    updateExistingButton()
  }

  // Function to track bargain events
  function trackBargainEvent(shop, productId, variantId, eventType, eventData = {}) {
    try {
      // Create a session ID if one doesn't exist
      if (!window.bargenixSessionId) {
        window.bargenixSessionId = "bx_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9)
      }

      // Format the event data properly
      const event = {
        shop_domain: shop,
        product_id: productId,
        variant_id: variantId || "default",
        event_type: eventType,
        session_id: window.bargenixSessionId,
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        landing_page: window.location.href,
        device_type: getDeviceType(),
        timestamp: new Date().toISOString(),
        customer_id: customerData.id || null,
        customer_email: customerData.email || null,
        customer_name: customerData.name || null,
        is_logged_in: customerData.isLoggedIn || false,
        ...eventData,
      }

      // Add to queue
      analyticsQueue.push(event)
      log(`Added event to queue: ${eventType}`)

      // Process queue if it reaches max size
      if (analyticsQueue.length >= MAX_QUEUE_SIZE) {
        log("Queue reached max size, processing immediately")
        processAnalyticsQueue()
      }
    } catch (error) {
      log("Error tracking event:", error)
    }
  }

  // Function to process the analytics queue
  async function processAnalyticsQueue() {
    if (processingQueue) {
      log("Analytics queue processing already in progress")
      return
    }

    if (analyticsQueue.length === 0) {
      log("Analytics queue is empty")
      return
    }

    processingQueue = true
    log(`Processing analytics queue (size: ${analyticsQueue.length})`)

    try {
      const appUrl = getAppUrl()
      const eventsToSend = analyticsQueue.splice(0, MAX_QUEUE_SIZE) // Take up to MAX_QUEUE_SIZE events

      // Add more debugging information
      log("Sending analytics events to:", `${appUrl}/api/bargain/analytics/batch`)
      log("First event in batch:", eventsToSend[0])

      // Use the bargain/analytics/batch endpoint which has proper CORS headers
      const response = await fetch(`${appUrl}/api/bargain/analytics/batch`, {
        method: "POST",
        mode: "cors",
        credentials: "omit",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ events: eventsToSend }),
      })

      const responseData = await response.json().catch((e) => ({ success: false, error: "Failed to parse response" }))

      if (response.ok && responseData.success) {
        log(
          `Successfully sent ${eventsToSend.length} analytics events, server processed ${responseData.ids ? responseData.ids.length : 0}`,
        )

        // If some events failed on the server side, add them back to the queue
        if (responseData.failedCount && responseData.failedCount > 0) {
          log(`Server failed to process ${responseData.failedCount} events, will retry later`)
          // We don't know which events failed, so we can't add them back specifically
          // Instead, we'll just track that some events failed
        }
      } else {
        log("Failed to send analytics events:", response.status, responseData.error || "Unknown error")
        // Put the events back in the queue if the request failed
        if (eventsToSend) {
          analyticsQueue.unshift(...eventsToSend)
        }
      }
    } catch (error) {
      log("Error sending analytics events:", error)
      // Put the events back in the queue if there was an error
      if (eventsToSend) {
        analyticsQueue.unshift(...eventsToSend)
      }
    } finally {
      processingQueue = false
      if (analyticsQueue.length > 0) {
        // More events to process, set a timer
        clearTimeout(queueTimer)
        queueTimer = setTimeout(processAnalyticsQueue, QUEUE_PROCESS_INTERVAL)
      }
    }
  }

  // Find the checkCustomerLoginStatus function and replace it with this improved version:

  // Function to check customer login status
  function checkCustomerLoginStatus(shopDomain, productId, variantId, productTitle, productPrice) {
    try {
      log(`Checking customer login status for shop: ${shopDomain}`)

      // Initialize customer data
      let isLoggedIn = false
      let customerId = null
      let customerEmail = null
      let customerName = null
      let customerPhone = null

      // Method 1: Check window.Shopify.customer (most reliable)
      if (window.Shopify && window.Shopify.customer && window.Shopify.customer.id) {
        isLoggedIn = true
        customerId = window.Shopify.customer.id
        customerEmail = window.Shopify.customer.email
        customerName =
          window.Shopify.customer.name ||
          `${window.Shopify.customer.firstName || ""} ${window.Shopify.customer.lastName || ""}`.trim()
        customerPhone = window.Shopify.customer.phone

        log("Customer is logged in via Shopify.customer:", { customerId, customerEmail, customerName })
      }
      // Method 2: Check ShopifyAnalytics
      else if (
        window.ShopifyAnalytics &&
        window.ShopifyAnalytics.meta &&
        window.ShopifyAnalytics.meta.page &&
        window.ShopifyAnalytics.meta.page.customerId
      ) {
        isLoggedIn = true
        customerId = window.ShopifyAnalytics.meta.page.customerId
        customerEmail = window.ShopifyAnalytics.meta.page.customerEmail || ""
        customerName = window.ShopifyAnalytics.meta.page.customerName || ""

        log("Customer is logged in via ShopifyAnalytics:", { customerId, customerEmail, customerName })
      }
      // Method 3: Check for customer data in script tags
      else {
        const customerScripts = document.querySelectorAll("script")
        for (const script of customerScripts) {
          if (script.textContent && script.textContent.includes('"customer"') && script.textContent.includes('"id"')) {
            try {
              // Look for customer object in script content
              const customerMatch = script.textContent.match(/"customer"\s*:\s*{[^}]+}/g)
              if (customerMatch) {
                log("Found potential customer data in script:", customerMatch[0])

                // Try to extract customer info using regex
                const idMatch = script.textContent.match(/"id"\s*:\s*(\d+)/)
                const emailMatch = script.textContent.match(/"email"\s*:\s*"([^"]+)"/)
                const nameMatch = script.textContent.match(/"(?:name|display_name)"\s*:\s*"([^"]+)"/)

                if (idMatch && idMatch[1]) {
                  isLoggedIn = true
                  customerId = idMatch[1]
                  customerEmail = emailMatch ? emailMatch[1] : ""
                  customerName = nameMatch ? nameMatch[1] : ""
                  log("Extracted customer data from script:", { customerId, customerEmail, customerName })
                  break
                }
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }

      // Method 4: Check for login indicators in the DOM and try to extract customer ID
      if (!isLoggedIn || (isLoggedIn && !customerId)) {
        log("Checking DOM for customer data")

        // Look for customer ID in data attributes
        const customerDataElements = document.querySelectorAll(
          "[data-customer-id], [data-customer], [data-customer-account-id]",
        )
        for (const element of customerDataElements) {
          const id =
            element.getAttribute("data-customer-id") ||
            element.getAttribute("data-customer") ||
            element.getAttribute("data-customer-account-id")
          if (id) {
            customerId = id
            isLoggedIn = true
            log("Found customer ID in data attribute:", customerId)
            break
          }
        }

        // Look for customer ID in script tags (common in Shopify themes)
        if (!customerId) {
          const scripts = document.querySelectorAll("script:not([src])")
          for (const script of scripts) {
            if (script.textContent) {
              // Look for customer object patterns in inline scripts
              const customerIdMatch =
                script.textContent.match(/customer[\s\S]*?id['"]*?:\s*?['"]?(\d+)['"]?/i) ||
                script.textContent.match(/customer_id['"]*?:\s*?['"]?(\d+)['"]?/i)

              if (customerIdMatch && customerIdMatch[1]) {
                customerId = customerIdMatch[1]
                isLoggedIn = true
                log("Found customer ID in script content:", customerId)

                // Try to extract email and name too
                const emailMatch = script.textContent.match(/customer[\s\S]*?email['"]*?:\s*?['"]([^'"]+)['"]/i)
                if (emailMatch && emailMatch[1]) {
                  customerEmail = emailMatch[1]
                }

                const nameMatch =
                  script.textContent.match(/customer[\s\S]*?name['"]*?:\s*?['"]([^'"]+)['"]/i) ||
                  script.textContent.match(/customer[\s\S]*?first_name['"]*?:\s*?['"]([^'"]+)['"]/i)
                if (nameMatch && nameMatch[1]) {
                  customerName = nameMatch[1]
                }

                break
              }
            }
          }
        }

        // Look for account links or login indicators
        const accountLink = document.querySelector('a[href*="/account"]')
        const logoutLink = document.querySelector('a[href*="/account/logout"]')
        const customerNameElement = document.querySelector(".customer-name, .account-name")

        if (
          logoutLink ||
          (accountLink && accountLink.textContent && !accountLink.textContent.toLowerCase().includes("login"))
        ) {
          log("Customer appears to be logged in based on DOM elements")
          isLoggedIn = true

          // Try to extract customer name from DOM
          if (customerNameElement) {
            customerName = customerNameElement.textContent.trim()
          }
        }
      }

      // If we still don't have a customer ID but we think they're logged in, try one more approach
      if (isLoggedIn && !customerId) {
        // Check for customer ID in meta tags
        const metaTags = document.querySelectorAll("meta")
        for (const tag of metaTags) {
          const name = tag.getAttribute("name")
          const content = tag.getAttribute("content")
          if (name && content && (name.includes("customer") || name.includes("user"))) {
            if (name.includes("id")) {
              customerId = content
              log("Found customer ID in meta tag:", customerId)
              break
            }
          }
        }

        // If we still don't have an ID but we're confident they're logged in, generate a temporary ID
        if (!customerId) {
          // Generate a deterministic ID based on shop domain and other factors
          // This ensures the same user gets the same ID across sessions
          const shopHash = hashCode(shopDomain)
          customerId = `temp_${shopHash}_${Date.now()}`
          log("Generated temporary customer ID:", customerId)
        }
      }

      // Proceed with login check
      proceedWithLoginCheck()

      function proceedWithLoginCheck() {
        // Update global customer data
        customerData = {
          id: customerId,
          email: customerEmail,
          name: customerName,
          phone: customerPhone,
          isLoggedIn: isLoggedIn,
        }

        log("Final customer data:", customerData)

        // Make sure the chatbot container exists
        let container = document.getElementById("bargenix-chatbot-container")
        if (!container) {
          container = createChatbotContainer()
          if (isLoggedIn) {
            container.style.display = "block"
          }
        }

        if (isLoggedIn && customerId) {
          log("Customer is logged in with valid ID, starting chat")
          startChat(shopDomain, productId, variantId, productTitle, productPrice)
          return true
        } else {
          log("Customer is not logged in or no valid customer data found, showing login prompt")
          showLoginPrompt(shopDomain, productId, variantId, productTitle, productPrice)
          return false
        }
      }
    } catch (error) {
      log("Error checking customer login status:", error)
      const container = document.getElementById("bargenix-chatbot-container")
      if (container) {
        showErrorUI(container, "Error checking login status. Please try again.", shopDomain, productId, variantId)
      }
      return false
    }
  }

  // Update the startChat function to properly display customer data and open iframe chatbot
  function startChat(shopDomain, productId, variantId, productTitle, productPrice) {
    log("Starting chat with customer data:", customerData)

    // Get the container
    const container = document.getElementById("bargenix-chatbot-container")
    if (!container) return

    // Collect required data for chatbot
    const customerId = customerData.id || null
    const customerEmail = customerData.email || null
    const customerName = customerData.name || null

    if (!customerId) {
      log("No customer ID available, cannot start chat")
      showErrorUI(container, "Customer ID not found. Please try logging in again.", shopDomain, productId, variantId)
      return
    }

    // Construct the chatbot URL with required parameters
    const chatbotURL = `https://chatbot.bargenix.in/?customer_id=${encodeURIComponent(customerId)}&variant_id=${encodeURIComponent(variantId)}&shop_domain=${encodeURIComponent(shopDomain)}&product_id=${encodeURIComponent(productId)}&product_title=${encodeURIComponent(productTitle)}&product_price=${encodeURIComponent(productPrice)}`

    log("Opening chatbot with URL:", chatbotURL)

    // Detect if mobile device
    const isMobile =
      window.innerWidth <= 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

    if (isMobile) {
      // Mobile: Full screen experience with proper z-index layering
      container.style.position = "fixed"
      container.style.top = "0"
      container.style.left = "0"
      container.style.width = "100vw"
      container.style.height = "100vh"
      container.style.zIndex = "2147483647" // Maximum z-index
      container.style.background = "#ffffff"
      container.style.borderRadius = "0"
      container.style.overflow = "hidden"
      container.style.boxShadow = "none"
      container.style.padding = "0"
      container.style.margin = "0"
      container.style.border = "none"
      container.style.lineHeight = "0"
      container.style.fontSize = "0"

      // Create full screen iframe for mobile
      container.innerHTML = `
<iframe 
  id="bargenix-chatbot-iframe"
  src="${chatbotURL}"
  style="
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
    margin: 0;
    padding: 0;
    overflow: hidden;
    display: block;
    line-height: 0;
    font-size: 0;
    background: #ffffff;
    z-index: 1;
  "
  frameborder="0"
  scrolling="no"
  allow="clipboard-write; microphone; camera"
  title="Bargenix AI Chatbot"
></iframe>
`
    } else {
      // Desktop: Fixed dimensions with proper positioning
      container.style.position = "fixed"
      container.style.bottom = "20px"
      container.style.right = "20px"
      container.style.width = "400px"
      container.style.height = "600px"
      container.style.zIndex = "999999"
      container.style.background = "transparent"
      container.style.borderRadius = "12px"
      container.style.overflow = "hidden"
      container.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.12)"
      container.style.padding = "0"
      container.style.margin = "0"
      container.style.border = "none"
      container.style.lineHeight = "0"
      container.style.fontSize = "0"

      // Create desktop iframe with exact dimensions
      container.innerHTML = `
<iframe 
  id="bargenix-chatbot-iframe"
  src="${chatbotURL}"
  width="400"
  height="600"
  style="
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
    margin: 0;
    padding: 0;
    overflow: hidden;
    display: block;
    line-height: 0;
    font-size: 0;
    background: transparent;
    border-radius: 12px;
  "
  frameborder="0"
  scrolling="no"
  allow="clipboard-write; microphone; camera"
  title="Bargenix AI Chatbot"
></iframe>
`
    }

    // Add orientation change listener for mobile
    if (isMobile) {
      const handleOrientationChange = () => {
        setTimeout(() => {
          container.style.width = "100vw"
          container.style.height = "100vh"
          const iframe = document.getElementById("bargenix-chatbot-iframe")
          if (iframe) {
            iframe.style.width = "100%"
            iframe.style.height = "100%"
          }
        }, 100)
      }

      window.addEventListener("orientationchange", handleOrientationChange)
      window.addEventListener("resize", handleOrientationChange)

      // Store cleanup function
      container.setAttribute("data-cleanup", "true")
    }

    // Add escape key listener
    if (isMobile) {
      const handleEscapeKey = (event) => {
        if (event.key === "Escape") {
          container.style.display = "none"
          document.removeEventListener("keydown", handleEscapeKey)
        }
      }
      document.addEventListener("keydown", handleEscapeKey)
    }

    // Track chat started with device info
    trackBargainEvent(shopDomain, productId, variantId, "chatbot_iframe_started", {
      productTitle,
      productPrice,
      customerId,
      customerEmail,
      customerName,
      chatbotURL,
      deviceType: getDeviceType(),
      isMobile: isMobile,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
    })
  }

  // Function to detect mobile devices more accurately
  function isMobileDevice() {
    return (
      window.innerWidth <= 768 ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform))
    )
  }

  // Function to handle iframe-specific errors and fallbacks
  function handleIframeError(
    container,
    shopDomain,
    productId,
    variantId,
    productTitle,
    productPrice,
    errorType,
    errorMessage,
  ) {
    log(`Iframe error (${errorType}):`, errorMessage)

    // Show error UI with fallback options
    container.innerHTML = `
    <div style="display: flex; flex-direction: column; height: 100%; width: 100%;">
      <!-- Header with close button -->
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background-color: #f8f9fa; border-bottom: 1px solid #e9ecef;">
        <div style="display: flex; align-items: center;">
          <div style="width: 32px; height: 32px; background-color: #ff3b30; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <span style="font-weight: 600; color: #333; font-size: 14px;">Chatbot Error</span>
        </div>
        <button id="bargenix-close-error-btn" style="background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <!-- Error content -->
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; background-color: #fff;">
        <div style="width: 60px; height: 60px; background-color: #ffebe9; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ff3b30" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        
        <h3 style="margin: 0 0 8px 0; color: #333; font-size: 16px; font-weight: 600; text-align: center;">Unable to Load Chatbot</h3>
        <p style="color: #666; margin: 0 0 20px 0; line-height: 1.5; font-size: 14px; text-align: center;">
          ${errorMessage || "We're having trouble connecting to our AI chatbot. Please try again or contact support."}
        </p>
        
        <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
          <button id="bargenix-retry-iframe-btn" style="width: 100%; padding: 10px; background-color: #0052ff; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 14px; transition: background-color 0.2s ease;">
            Try Again
          </button>
          
          <button id="bargenix-contact-support-btn" style="width: 100%; padding: 10px; background-color: transparent; color: #0052ff; border: 1px solid #0052ff; border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 14px; transition: all 0.2s ease;">
            Contact Support
          </button>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="padding: 8px 12px; border-top: 1px solid #e9ecef; text-align: center; font-size: 12px; color: #888; background-color: #f8f9fa;">
        Powered by <span style="color: #555; font-weight: 500;">Bargenix AI</span>
      </div>
    </div>
  `

    // Add event listeners
    document.getElementById("bargenix-close-error-btn").addEventListener("click", () => {
      container.style.display = "none"
    })

    document.getElementById("bargenix-retry-iframe-btn").addEventListener("click", () => {
      // Retry starting the chat
      startChat(shopDomain, productId, variantId, productTitle, productPrice)
    })

    document.getElementById("bargenix-contact-support-btn").addEventListener("click", () => {
      // Open support page or email
      window.open(
        `mailto:support@bargenix.com?subject=Chatbot Error - ${errorType}&body=Product: ${productTitle}%0ACustomer ID: ${customerData.id || "Not logged in"}%0AError: ${errorMessage}`,
        "_blank",
      )
    })

    // Add hover effects
    const retryBtn = document.getElementById("bargenix-retry-iframe-btn")
    retryBtn.addEventListener("mouseover", function () {
      this.style.backgroundColor = "#0043d1"
    })
    retryBtn.addEventListener("mouseout", function () {
      this.style.backgroundColor = "#0052ff"
    })

    const supportBtn = document.getElementById("bargenix-contact-support-btn")
    supportBtn.addEventListener("mouseover", function () {
      this.style.backgroundColor = "#f8f9fa"
    })
    supportBtn.addEventListener("mouseout", function () {
      this.style.backgroundColor = "transparent"
    })

    // Track error handling
    trackBargainEvent(shopDomain, productId, variantId, "chatbot_error_handled", {
      productTitle,
      productPrice,
      errorType,
      errorMessage,
      customerId: customerData.id || null,
      deviceType: getDeviceType(),
    })
  }

  // Function to get detailed product information
  async function getDetailedProductInfo(productId, variantId) {
    try {
      const shopDomain = window.location.hostname
      const appUrl = getAppUrl()
      const timestamp = Date.now()

      log(`Fetching detailed product info: ${shopDomain}, ${productId}, ${variantId}`)

      const response = await fetch(
        `${appUrl}/api/product-details?shop=${encodeURIComponent(shopDomain)}&productId=${encodeURIComponent(productId)}&variantId=${encodeURIComponent(variantId)}&t=${timestamp}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
          mode: "cors",
          credentials: "omit",
        },
      )

      if (!response.ok) {
        log(`Server returned status ${response.status} while fetching product details`)
        return {}
      }

      const data = await response.json()
      log("Detailed product info response:", data)

      if (data.success && data.product) {
        return data.product
      } else {
        log("Could not retrieve detailed product info")
        return {}
      }
    } catch (error) {
      log("Error fetching detailed product info:", error)
      return {}
    }
  }

  // Function to get browser information
  function getBrowserInfo() {
    let browser = "Unknown"

    try {
      if (navigator.userAgent.includes("Chrome")) {
        browser = "Chrome"
      } else if (navigator.userAgent.includes("Firefox")) {
        browser = "Firefox"
      } else if (navigator.userAgent.includes("Safari")) {
        browser = "Safari"
      } else if (navigator.userAgent.includes("Edge")) {
        browser = "Edge"
      } else if (navigator.userAgent.includes("Opera") || navigator.userAgent.includes("OPR")) {
        browser = "Opera"
      } else if (navigator.userAgent.includes("MSIE") || !!document.documentMode === true) {
        browser = "IE" // Internet Explorer
      }
    } catch (error) {
      log("Error getting browser info:", error)
    }

    return browser
  }

  // Function to show login prompt
  function showLoginPrompt(shopDomain, productId, variantId, productTitle, productPrice) {
    log("Showing login prompt")

    // Get the container
    const container = document.getElementById("bargenix-chatbot-container")
    if (!container) return

    // Apply common container styles for a cleaner look
    container.style.position = "fixed"
    container.style.zIndex = "999999"
    container.style.transition = "all 0.3s ease"
    container.style.background = "#fff"
    container.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.1)"
    container.style.borderRadius = "16px"
    container.style.overflow = "hidden"
    container.style.fontFamily =
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif"

    // Responsive positioning and sizing
    if (window.innerWidth < 768) {
      // Mobile styling
      container.style.left = "50%"
      container.style.bottom = "20px"
      container.style.transform = "translateX(-50%)"
      container.style.width = "calc(100% - 40px)"
      container.style.maxWidth = "400px"
      container.style.height = "auto"
      container.style.maxHeight = "450px"
    } else {
      // Desktop styling
      container.style.right = "20px"
      container.style.bottom = "20px"
      container.style.width = "360px"
      container.style.maxWidth = "90vw"
      container.style.height = "auto"
      container.style.maxHeight = "450px"
    }

    // Construct the login/signup URL with return URL
    const returnUrl = encodeURIComponent(
      `${window.location.pathname}?bargenix_bargain=true&product_id=${productId}&variant_id=${variantId}`,
    )
    const authUrl = `https://${shopDomain}/account/login?return_url=${returnUrl}`
    const registerUrl = `https://${shopDomain}/account/register?return_url=${returnUrl}`

    // Store product and variant IDs in localStorage
    try {
      localStorage.setItem("bargenix_auth_in_progress", "true")
      localStorage.setItem("bargenix_product_id", productId)
      localStorage.setItem("bargenix_variant_id", variantId)
      localStorage.setItem("bargenix_shop_domain", shopDomain)
    } catch (e) {
      // localStorage might not be available
      log("Could not save auth state to localStorage:", e)
    }

    // Update UI with login prompt
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f0f0f0;">
        <div style="display: flex; align-items: center;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="19" cy="12" r="1"></circle>
            <circle cx="5" cy="12" r="1"></circle>
          </svg>
          <span style="margin-left: 12px; font-weight: 500; color: #555;">Bargain now</span>
        </div>
        <div>
          <button id="bargenix-minimize-btn" style="background: none; border: none; cursor: pointer; padding: 4px; margin-right: 8px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
          <button id="bargenix-close-btn" style="background: none; border: none; cursor: pointer; padding: 4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
      <div style="padding: 24px 20px 16px; text-align: center;">
        <div style="width: 60px; height: 60px; background-color: #fff3cd; border-radius: 50%; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center;">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#856404" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
            <polyline points="10 17 15 12 10 7"></polyline>
            <line x1="15" y1="12" x2="3" y2="12"></line>
          </svg>
        </div>
        <h3 style="margin: 0 0 8px 0; color: #333; font-size: 16px; font-weight: 600;">Login Required</h3>
        <p style="color: #666; margin: 0 0 20px 0; line-height: 1.4; font-size: 14px;">
          Please log in to start bargaining.
        </p>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <a href="${authUrl}" style="padding: 10px 20px; background-color: #0052ff; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: background-color 0.2s ease; font-size: 14px; text-decoration: none;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
              <polyline points="10 17 15 12 10 7"></polyline>
              <line x1="15" y1="12" x2="3" y2="12"></line>
            </svg>
            Log In
          </a>
          <a href="${registerUrl}" style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; transition: background-color 0.2s ease; font-size: 14px; text-decoration: none;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            Sign Up
          </a>
        </div>
      </div>
      <div style="padding: 10px; border-top: 1px solid #f0f0f0; text-align: center; font-size: 12px; color: #888;">
        Powered by <span style="color: #555; font-weight: 500;">Bargenix AI</span>
      </div>
    `

    // Add event listeners
    document.getElementById("bargenix-close-btn").addEventListener("click", () => {
      container.style.display = "none"

      // Track close
      trackBargainEvent(shopDomain, productId, variantId, "login_prompt_close", {
        productTitle,
        productPrice,
        deviceType: getDeviceType(),
      })
    })

    document.getElementById("bargenix-minimize-btn").addEventListener("click", () => {
      if (container.style.height === "60px") {
        container.style.height = "auto"
      } else {
        container.style.height = "60px"
        container.style.overflow = "hidden"
      }
    })
  }

  // Add this helper function at the end of the file
  function hashCode(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36)
  }
})()
