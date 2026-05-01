import React from 'react';

const Refund = () => {
  return (
    <div className="max-w-3xl mx-auto p-8 pt-20 min-h-screen">
      <h1 className="text-3xl font-black uppercase tracking-tight mb-6">Refund and Cancellation Policy</h1>
      <div className="space-y-4 text-muted-foreground">
        <p>Thank you for choosing Offer Me He Lelo.</p>
        <p><strong>Cancellations:</strong> You may cancel your subscription or service at any time. Cancellations will take effect at the end of your current billing cycle.</p>
        <p><strong>Refunds:</strong> We offer a strictly 7-day refund policy from the date of the initial transaction. If you are not satisfied with the service, please contact us at [support@offermehelelo.com] within 7 days of your payment.</p>
        <p>Approved refunds will be processed and credited back to the original method of payment within 5-7 business days.</p>
      </div>
    </div>
  );
};
export default Refund;