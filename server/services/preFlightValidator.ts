/**
 * Pre-Flight Validator Service
 * Checks if a website has required compliance documents (Privacy Policy, Terms of Service)
 * before attempting WhatsApp Business Account connection.
 */

import axios from "axios";
import { JSDOM } from "jsdom";

export interface ValidationResult {
  url: string;
  hasPrivacyPolicy: boolean;
  hasTermsOfService: boolean;
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a website URL for required compliance documents.
 * Checks for Privacy Policy and Terms of Service pages.
 */
export async function validateWebsite(url: string): Promise<ValidationResult> {
  const errors: string[] = [];
  let hasPrivacyPolicy = false;
  let hasTermsOfService = false;

  try {
    // Validate URL format
    const urlObj = new URL(url);
    const normalizedUrl = urlObj.toString();

    // Fetch the website content with timeout
    let htmlContent: string;
    try {
      const response = await axios.get(normalizedUrl, {
        timeout: 10000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        maxRedirects: 5,
      });
      htmlContent = response.data;
    } catch (fetchError) {
      if (axios.isAxiosError(fetchError)) {
        if (fetchError.code === "ECONNABORTED") {
          errors.push("Website request timed out. Please check if the URL is accessible.");
        } else if (fetchError.response?.status === 404) {
          errors.push("Website not found (404). Please verify the URL.");
        } else if (fetchError.response?.status === 403) {
          errors.push("Access to website is forbidden (403). Please check permissions.");
        } else {
          errors.push(`Failed to access website: ${fetchError.message}`);
        }
      } else {
        errors.push("Failed to fetch website content.");
      }
      return {
        url,
        hasPrivacyPolicy,
        hasTermsOfService,
        isValid: false,
        errors,
      };
    }

    // Parse HTML and check for compliance pages
    try {
      const dom = new JSDOM(htmlContent);
      const document = dom.window.document;
      const pageText = (document.body.textContent || "").toLowerCase();
      const pageHtml = htmlContent.toLowerCase();

      // Check for Privacy Policy
      // Look for links, text content, and common patterns
      const privacyPatterns = [
        /privacy\s*policy/i,
        /privacy\s*statement/i,
        /data\s*protection/i,
        /privacy\s*&\s*security/i,
        /href=["']([^"']*privacy[^"']*)["']/i,
      ];

      hasPrivacyPolicy = privacyPatterns.some((pattern) => {
        return pattern.test(pageHtml);
      });

      // Check for Terms of Service
      const termsPatterns = [
        /terms\s*of\s*service/i,
        /terms\s*&\s*conditions/i,
        /terms\s*of\s*use/i,
        /user\s*agreement/i,
        /service\s*agreement/i,
        /href=["']([^"']*terms[^"']*)["']/i,
      ];

      hasTermsOfService = termsPatterns.some((pattern) => {
        return pattern.test(pageHtml);
      });
    } catch (parseError) {
      errors.push("Failed to parse website content.");
      return {
        url,
        hasPrivacyPolicy,
        hasTermsOfService,
        isValid: false,
        errors,
      };
    }

    // Validate that both required documents exist
    if (!hasPrivacyPolicy) {
      errors.push(
        "Privacy Policy not found. Meta requires a Privacy Policy on your website."
      );
    }
    if (!hasTermsOfService) {
      errors.push(
        "Terms of Service not found. Meta requires Terms of Service on your website."
      );
    }

    const isValid = hasPrivacyPolicy && hasTermsOfService && errors.length === 0;

    return {
      url,
      hasPrivacyPolicy,
      hasTermsOfService,
      isValid,
      errors,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    errors.push(`Validation error: ${errorMessage}`);

    return {
      url,
      hasPrivacyPolicy,
      hasTermsOfService,
      isValid: false,
      errors,
    };
  }
}

/**
 * Validates multiple websites in parallel.
 */
export async function validateWebsites(urls: string[]): Promise<ValidationResult[]> {
  return Promise.all(urls.map((url) => validateWebsite(url)));
}
