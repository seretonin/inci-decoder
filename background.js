chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "searchProduct") {
    const searchUrl = `https://incidecoder.com/search?query=${encodeURIComponent(message.query)}`;
    
    fetch(searchUrl)
      .then(async (response) => {
        const html = await response.text();
        // If the URL has redirected to a product details page
        const isProductPage = response.url.includes("/products/");
        sendResponse({
          success: true,
          redirected: isProductPage,
          url: response.url,
          html: html
        });
      })
      .catch((error) => {
        console.error("Error searching product:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep the message channel open for async response
  }

  if (message.action === "fetchUrl") {
    fetch(message.url)
      .then(async (response) => {
        const html = await response.text();
        sendResponse({ success: true, html: html, url: response.url });
      })
      .catch((error) => {
        console.error("Error fetching URL:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }

  if (message.action === "decodeIngredients") {
    const formData = new FormData();
    formData.append("texts", JSON.stringify([message.ingredients]));
    formData.append("mode", "txttxt");
    formData.append("g-recaptcha-response", "");

    fetch("https://incidecoder.com/decode-inci/text", {
      method: "POST",
      body: formData
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        sendResponse({ success: true, data: data });
      })
      .catch((error) => {
        console.error("Error decoding ingredients:", error);
        sendResponse({ success: false, error: error.message });
      });

    return true;
  }
});
