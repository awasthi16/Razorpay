import { Router } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const router = Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create order
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    if (!amount) return res.status(400).json({ error: 'amount (in paise) required' });

    const options = {
      amount: Number(amount), // in paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({ order });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Verify payment after checkout success
router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sign = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest('hex');

    const isValid = expected === razorpay_signature;

    if (!isValid) {
      return res.status(400).json({ success: false, verified: false });
    }

    // TODO: mark order paid in DB here
    return res.json({ success: true, verified: true });
  } catch (err) {
    console.error('Verify payment error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Razorpay Webhook (optional but recommended)
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers['x-razorpay-signature'];
    const body = req.body; // raw buffer due to express.raw

    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    if (expected !== signature) {
      return res.status(400).send('Invalid signature');
    }

    const payload = JSON.parse(body.toString());
    // Handle events: payment.authorized, payment.failed, order.paid, etc.
    console.log('Webhook event:', payload.event);

    // TODO: update DB according to payload
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Webhook handler error');
  }
});

export default router;
