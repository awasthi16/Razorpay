import { useState } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE
const RZP_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID

export default function App() {
  const [amount, setAmount] = useState(49900) // ₹499.00 default
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState('')

  const payNow = async () => {
    try {
      setLoading(true)
      setStatus('Creating order...')

      // 1) Create an order on server
      const { data } = await axios.post(`${API_BASE}/create-order`, {
        amount: Number(amount), // paise
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`,
      })

      const order = data.order

      // 2) Open Razorpay Checkout
      const options = {
        key: RZP_KEY,
        amount: order.amount, // paise
        currency: order.currency,
        name: 'Demo Store',
        description: 'Test Transaction',
        order_id: order.id,
        prefill: {
          name: 'Durgesh Awasthi',
          email: 'durgesh@example.com',
          contact: '9999999999',
        },
        theme: { color: '#3399cc' },
        handler: async function (response) {
          // 3) Verify on server
          setStatus('Verifying payment...')
          const verifyRes = await axios.post(`${API_BASE}/verify-payment`, {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          })
          if (verifyRes.data?.verified) {
            setStatus('Payment verified ✔')
          } else {
            setStatus('Verification failed ✖')
          }
        },
        modal: {
          ondismiss: function () {
            setStatus('Checkout closed')
          },
        },
        notes: { purpose: 'Demo payment' },
      }

      const rzp = new window.Razorpay(options)
      rzp.on('payment.failed', function (resp) {
        setStatus('Payment failed: ' + resp.error.description)
      })
      rzp.open()
    } catch (err) {
      console.error(err)
      setStatus('Error creating order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: '4rem auto', fontFamily: 'system-ui' }}>
      <h1>Razorpay Demo</h1>
      <label style={{ display: 'block', marginBottom: 8 }}>
        Amount (paise):
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ width: '100%', padding: 8, marginTop: 4 }}
        />
      </label>
      <button onClick={payNow} disabled={loading} style={{ padding: '10px 16px' }}>
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
      {status && (
        <p style={{ marginTop: 16 }}>
          <strong>Status:</strong> {status}
        </p>
      )}
      <p style={{ marginTop: 24, color: '#555' }}>
        Use Razorpay <em>Test Mode</em> keys while developing.
      </p>
    </div>
  )
}
