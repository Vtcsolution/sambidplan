// backend/services/paypalService.js
// PURE SIMULATION MODE - Works without any API keys
// Add real PayPal credentials to .env when ready

// Create PayPal order - SIMULATION ONLY
export const createPayPalOrder = async (amount, currency = 'USD', metadata = {}) => {
  console.log(`📝 [SIMULATION] PayPal order for $${amount}`);
  
  // Generate a realistic-looking fake order ID
  const fakeOrderId = `SIM_ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  
  return {
    success: true,
    orderId: fakeOrderId,
    approvalUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/simulate`,
    status: 'CREATED',
    isSimulated: true
  };
};

// Capture PayPal payment - SIMULATION ONLY
export const capturePayPalPayment = async (orderId) => {
  console.log(`📝 [SIMULATION] PayPal capture for order: ${orderId}`);
  
  return {
    success: true,
    captureId: `SIM_CAPTURE_${Date.now()}`,
    orderId: orderId,
    status: 'COMPLETED',
    amount: 0,
    currency: 'USD',
    metadata: {},
    isSimulated: true
  };
};

// Get order details - SIMULATION ONLY
export const getPayPalOrder = async (orderId) => {
  return {
    success: true,
    orderId: orderId,
    status: 'COMPLETED',
    amount: 0,
    currency: 'USD',
    isSimulated: true
  };
};