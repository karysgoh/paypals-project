/**
 * PayNow QR Code Generator for Singapore
 * 
 * PayNow QR codes follow EMV QR Code Specification and contain:
 * - Merchant info (recipient's PayNow ID)
 * - Transaction amount
 * - Currency (SGD = 702)
 * - Reference information
 * 
 * How it works:
 * 1. Create EMV data fields with specific tags
 * 2. Format each field as Tag-Length-Value (TLV)
 * 3. Calculate CRC checksum
 * 4. Generate QR code from the final string
 */

class PayNowQRGenerator {
  constructor() {
    // EMV QR Code Data Objects (Tags)
    this.TAGS = {
      PAYLOAD_FORMAT: '00',           // Always "01"
      POINT_OF_INITIATION: '01',      // "11" for static, "12" for dynamic
      MERCHANT_ACCOUNT_INFO: '26',    // PayNow merchant info
      MERCHANT_CATEGORY: '52',        // "0000" for person-to-person
      TRANSACTION_CURRENCY: '53',     // "702" for SGD
      TRANSACTION_AMOUNT: '54',       // Amount in SGD
      COUNTRY_CODE: '58',             // "SG" for Singapore
      MERCHANT_NAME: '59',            // Recipient name
      MERCHANT_CITY: '60',            // "Singapore"
      ADDITIONAL_DATA: '62',          // Reference and other info
      CRC: '63'                       // CRC checksum
    };

    // PayNow specific sub-tags (within Merchant Account Info)
    this.PAYNOW_TAGS = {
      DOMAIN: '00',        // "SG.PAYNOW"
      PROXY_TYPE: '01',    // "0" = Mobile, "2" = UEN, "3" = VPA
      PROXY_VALUE: '02',   // Actual phone/NRIC/UEN
      AMOUNT_EDITABLE: '03' // "1" = editable, "0" = fixed
    };
  }

  /**
   * Generate PayNow QR code data string
   * @param {Object} params - Payment parameters
   * @param {string} params.recipient - Singapore phone number (+6591234567 or 91234567)
   * @param {number} params.amount - Amount in SGD
   * @param {string} params.merchantName - Recipient's name
   * @param {string} params.reference - Payment reference
   * @param {boolean} params.editableAmount - Whether amount can be edited
   * @returns {string} EMV QR code data string
   */
  generateQRData({
    recipient,
    amount,
    merchantName,
    reference = '',
    editableAmount = false
  }) {
    try {
      // Step 1: Determine proxy type based on recipient format
      const proxyType = this.getProxyType(recipient);
      
      // Step 2: Build PayNow merchant account info
      const paynowInfo = this.buildPayNowInfo({
        recipient,
        proxyType,
        editableAmount
      });

      // Step 3: Build main EMV data
      let emvData = '';
      
      // Payload format indicator
      emvData += this.formatTLV(this.TAGS.PAYLOAD_FORMAT, '01');
      
      // Point of initiation method (static QR)
      emvData += this.formatTLV(this.TAGS.POINT_OF_INITIATION, '11');
      
      // PayNow merchant account information
      emvData += this.formatTLV(this.TAGS.MERCHANT_ACCOUNT_INFO, paynowInfo);
      
      // Merchant category code (person-to-person)
      emvData += this.formatTLV(this.TAGS.MERCHANT_CATEGORY, '0000');
      
      // Transaction currency (SGD)
      emvData += this.formatTLV(this.TAGS.TRANSACTION_CURRENCY, '702');
      
      // Transaction amount (if specified)
      if (amount && amount > 0) {
        emvData += this.formatTLV(this.TAGS.TRANSACTION_AMOUNT, amount.toFixed(2));
      }
      
      // Country code
      emvData += this.formatTLV(this.TAGS.COUNTRY_CODE, 'SG');
      
      // Merchant name
      emvData += this.formatTLV(this.TAGS.MERCHANT_NAME, merchantName);
      
      // Merchant city
      emvData += this.formatTLV(this.TAGS.MERCHANT_CITY, 'Singapore');
      
      // Additional data (reference)
      if (reference) {
        const additionalData = this.formatTLV('01', reference); // Bill reference
        emvData += this.formatTLV(this.TAGS.ADDITIONAL_DATA, additionalData);
      }
      
      // Step 4: Calculate and append CRC
      const crcData = emvData + this.TAGS.CRC + '04'; // CRC tag + length
      const crc = this.calculateCRC16(crcData);
      emvData += this.formatTLV(this.TAGS.CRC, crc);
      
      return emvData;
      
    } catch (error) {
      throw new Error(`Failed to generate PayNow QR data: ${error.message}`);
    }
  }

  /**
   * Build PayNow-specific merchant account information
   */
  buildPayNowInfo({ recipient, proxyType, editableAmount }) {
    let paynowData = '';
    
    // PayNow domain
    paynowData += this.formatTLV(this.PAYNOW_TAGS.DOMAIN, 'SG.PAYNOW');
    
    // Proxy type (0=Mobile, 2=UEN, 3=VPA)
    paynowData += this.formatTLV(this.PAYNOW_TAGS.PROXY_TYPE, proxyType);
    
    // Proxy value (cleaned recipient ID)
    const cleanRecipient = this.cleanRecipient(recipient, proxyType);
    paynowData += this.formatTLV(this.PAYNOW_TAGS.PROXY_VALUE, cleanRecipient);
    
    // Amount editable flag
    paynowData += this.formatTLV(this.PAYNOW_TAGS.AMOUNT_EDITABLE, editableAmount ? '1' : '0');
    
    return paynowData;
  }

  /**
   * Determine proxy type based on recipient format
   * @param {string} recipient - Phone number only (NRIC support removed)
   * @returns {string} Proxy type code
   */
  getProxyType(recipient) {
    const cleaned = recipient.replace(/\s+/g, '');
    
    // Singapore mobile number (8 digits starting with 8 or 9)
    if (/^(\+65)?[89]\d{7}$/.test(cleaned)) {
      return '0'; // Mobile
    }
    
    // Default to mobile for any other format
    return '0';
  }

  /**
   * Clean and format recipient ID based on type
   */
  cleanRecipient(recipient, proxyType) {
    let cleaned = recipient.replace(/\s+/g, '');
    
    if (proxyType === '0') { // Mobile
      // Remove +65 country code if present
      cleaned = cleaned.replace(/^\+65/, '');
      // Ensure it starts with +65
      if (!/^\+65/.test(cleaned)) {
        cleaned = '+65' + cleaned;
      }
    }
    
    return cleaned.toUpperCase();
  }

  /**
   * Format data as Tag-Length-Value (TLV)
   * @param {string} tag - 2-digit tag
   * @param {string} value - Data value
   * @returns {string} Formatted TLV string
   */
  formatTLV(tag, value) {
    const length = value.length.toString().padStart(2, '0');
    return tag + length + value;
  }

  /**
   * Calculate CRC-16-CCITT checksum
   * Used for EMV QR code validation
   */
  calculateCRC16(data) {
    let crc = 0xFFFF;
    const polynomial = 0x1021;
    
    for (let i = 0; i < data.length; i++) {
      crc ^= (data.charCodeAt(i) << 8);
      
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ polynomial;
        } else {
          crc = crc << 1;
        }
      }
    }
    
    crc = crc & 0xFFFF;
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  /**
   * Validate recipient ID format (phone number only)
   */
  validateRecipient(recipient) {
    const cleaned = recipient.replace(/\s+/g, '');
    
    // Only validate Singapore mobile numbers
    const phonePattern = /^(\+65)?[89]\d{7}$/;
    
    return phonePattern.test(cleaned);
  }
}

module.exports = PayNowQRGenerator;