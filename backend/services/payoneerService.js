// backend/services/payoneerService.js
// For MVP - Manual invoice generation (Payoneer API needs approval)

export const generatePayoneerInvoice = async (invoiceData) => {
  const { invoiceNumber, amount, currency, userEmail, userName, planName } = invoiceData;
  
  // For MVP: Generate a manual invoice link
  // In production, this would call Payoneer API
  
  const invoiceLink = `https://payoneer.com/invoice/${invoiceNumber}`;
  
  // Create email content for manual payment
  const emailContent = `
    <h2>FedVantage Invoice #${invoiceNumber}</h2>
    <p>Dear ${userName},</p>
    <p>Thank you for upgrading to ${planName} plan.</p>
    
    <h3>Invoice Details:</h3>
    <ul>
      <li>Invoice Number: ${invoiceNumber}</li>
      <li>Amount: ${amount} ${currency}</li>
      <li>Plan: ${planName}</li>
    </ul>
    
    <h3>Payment Instructions:</h3>
    <p>Please send payment via Payoneer to:</p>
    <p><strong>Email: sales@fedvantage.com</strong></p>
    <p>Reference: ${invoiceNumber}</p>
    
    <p>After payment, please email your payment confirmation to payments@fedvantage.com</p>
    <p>Your account will be upgraded within 24 hours.</p>
    
    <a href="${invoiceLink}" style="background: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
      View Invoice
    </a>
  `;
  
  return {
    invoiceLink,
    emailContent,
    payoneerInvoiceId: `PAY_${Date.now()}`
  };
};

// For future: Real Payoneer API integration
export const createPayoneerInvoiceAPI = async (data) => {
  // This will be implemented when Payoneer API access is approved
  console.log('Payoneer API integration pending approval');
  return null;
};

export const checkPayoneerPaymentStatus = async (invoiceId) => {
  // This will check payment status via Payoneer API
  console.log('Payoneer API integration pending approval');
  return { status: 'pending' };
};