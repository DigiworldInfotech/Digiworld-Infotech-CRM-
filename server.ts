import express from "express";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/emails/welcome", async (req, res) => {
    if (!resend) return res.status(503).json({ error: "Email service not configured. Please add RESEND_API_KEY to .env" });
    const { email, clientName, customSubject, customBody } = req.body;
    
    let subject = customSubject || `Welcome to DigiWorld Infotech, ${clientName}!`;
    let html = customBody ? customBody.replace(/{clientName}/g, clientName) : `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 16px;">
            <div style="background-color: #6366f1; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0;">DigiWorld Infotech</h1>
            </div>
            <h2 style="color: #1e293b;">Welcome aboard, ${clientName}!</h2>
            <p style="color: #475569; line-height: 1.6;">We are thrilled to have you as a client. Your account has been successfully registered in our system.</p>
            <div style="background-color: #f8fafc; padding: 20px; border-radius: 12px; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #1e293b;">What's next?</p>
              <ul style="color: #475569; padding-left: 20px;">
                <li>You will receive invoices directly to this email.</li>
                <li>You can track your project progress through our portal.</li>
                <li>Reach out to your account manager for any queries.</li>
              </ul>
            </div>
            <p style="color: #475569;">Best regards,<br>The DigiWorld Team</p>
          </div>
        `;

    try {
      const { data, error } = await resend.emails.send({
        from: `DigiWorld Infotech <${fromEmail}>`,
        to: [email],
        subject,
        html,
      });

      if (error) return res.status(400).json({ error });
      res.json({ data });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/emails/invoice", async (req, res) => {
    if (!resend) return res.status(503).json({ error: "Email service not configured" });
    const { email, clientName, invoiceNumber, amount, dueDate, items, customSubject, customBody, paymentLink } = req.body;
    
    let subject = customSubject ? customSubject
      .replace(/{invoiceNumber}/g, invoiceNumber)
      .replace(/{clientName}/g, clientName) : `New Invoice ${invoiceNumber} from DigiWorld Infotech`;
      
    let html = customBody ? customBody
      .replace(/{clientName}/g, clientName)
      .replace(/{invoiceNumber}/g, invoiceNumber)
      .replace(/{amount}/g, amount.toLocaleString())
      .replace(/{dueDate}/g, dueDate)
      .replace(/{paymentLink}/g, paymentLink || '#') : `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
              <div style="background-color: #6366f1; width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 20px;">D</div>
              <div style="text-align: right;">
                <h3 style="margin: 0; color: #1e293b;">Invoice ${invoiceNumber}</h3>
                <p style="margin: 0; color: #64748b; font-size: 14px;">Due: ${dueDate}</p>
              </div>
            </div>
            
            <h2 style="color: #1e293b;">Hello ${clientName},</h2>
            <p style="color: #475569;">A new invoice has been generated for your recent services.</p>
            
            <div style="margin: 30px 0; border: 1px solid #f1f5f9; border-radius: 12px; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead style="background-color: #f8fafc;">
                  <tr>
                    <th style="text-align: left; padding: 12px; color: #64748b; font-size: 12px; text-transform: uppercase;">Description</th>
                    <th style="text-align: right; padding: 12px; color: #64748b; font-size: 12px; text-transform: uppercase;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${items.map((item: any) => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 12px; color: #1e293b;">${item.serviceName} x ${item.qty}</td>
                      <td style="padding: 12px; text-align: right; color: #1e293b;">₹${item.amount.toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr>
                    <td style="padding: 12px; font-weight: bold; color: #1e293b;">Total Amount</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #6366f1; font-size: 18px;">₹${amount.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${paymentLink || '#'}" style="background-color: #6366f1; color: white; padding: 12px 30px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block;">Pay Invoice</a>
            </div>
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 40px;">
              If you have any questions, please contact us at billing@digiworldinfotech.in
            </p>
          </div>
        `;

    try {
      const { data, error } = await resend.emails.send({
        from: `DigiWorld Infotech Billing <${fromEmail}>`,
        to: [email],
        subject,
        html,
      });

      if (error) return res.status(400).json({ error });
      res.json({ data });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/emails/recurring", async (req, res) => {
    if (!resend) return res.status(503).json({ error: "Email service not configured" });
    const { email, clientName, serviceName, amount, nextBillingDate, customSubject, customBody } = req.body;
    
    let subject = customSubject ? customSubject
      .replace(/{serviceName}/g, serviceName)
      .replace(/{clientName}/g, clientName) : `Subscription Renewal: ${serviceName}`;
      
    let html = customBody ? customBody
      .replace(/{clientName}/g, clientName)
      .replace(/{serviceName}/g, serviceName)
      .replace(/{amount}/g, amount.toLocaleString())
      .replace(/{nextBillingDate}/g, nextBillingDate) : `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="background-color: #0f172a; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Subscription Renewal</h1>
            </div>
            <h2 style="color: #1e293b;">Hello ${clientName},</h2>
            <p style="color: #475569; line-height: 1.6;">This is a friendly notification that your recurring subscription for <strong>${serviceName}</strong> has been renewed.</p>
            
            <div style="background-color: #f8fafc; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px border-slate-100;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #64748b;">Service</span>
                <span style="color: #1e293b; font-weight: bold;">${serviceName}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="color: #64748b;">Amount</span>
                <span style="color: #1e293b; font-weight: bold;">₹${amount.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #64748b;">Next Billing Date</span>
                <span style="color: #1e293b; font-weight: bold;">${nextBillingDate}</span>
              </div>
            </div>
            
            <p style="color: #475569;">The invoice has been attached to your account and will be processed automatically if you have a payment method on file.</p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="#" style="color: #6366f1; font-weight: bold; text-decoration: none;">View Subscription Details →</a>
            </div>
          </div>
        `;

    try {
      const { data, error } = await resend.emails.send({
        from: `DigiWorld Infotech Subscriptions <${fromEmail}>`,
        to: [email],
        subject,
        html,
      });

      if (error) return res.status(400).json({ error });
      res.json({ data });
    } catch (err) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
