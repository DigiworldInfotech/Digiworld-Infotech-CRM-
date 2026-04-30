import express from "express";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";

dotenv.config();

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());
  
  // Placeholder replacement helper
  const replacePlaceholders = (text: string, data: any) => {
    if (!text) return "";
    let result = text;
    const replacements: Record<string, any> = {
      "{clientName}": data.clientName || "",
      "{invoiceNumber}": data.invoiceNumber || "",
      "{amount}": data.amount ? data.amount.toLocaleString() : "",
      "{dueDate}": data.dueDate || "",
      "{daysOverdue}": data.daysOverdue || "0",
      "{paymentLink}": data.paymentLink || "#",
      "{serviceName}": data.serviceName || "",
      "{nextBillingDate}": data.nextBillingDate || "",
      "{leadTitle}": data.leadTitle || "",
      "{followUpDate}": data.followUpDate || "",
      "{servicePeriodFrom}": data.servicePeriodFrom || "",
      "{servicePeriodTo}": data.servicePeriodTo || "",
      "{estimateNumber}": data.estimateNumber || "",
      "{validUntil}": data.validUntil || "",
    };

    Object.keys(replacements).forEach(key => {
      const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      result = result.replace(regex, replacements[key]);
    });

    // Convert newlines to <br/> for HTML email rendering
    return result.replace(/\n/g, '<br/>');
  };

  // Debug logger
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  // Internal health check
  app.get("/ping", (req, res) => {
    res.json({ 
      status: "pong", 
      time: new Date().toISOString(),
      env: process.env.NODE_ENV,
      hasResend: !!resend
    });
  });

  // API Routes
  console.log("Registering API routes...");

  app.post("/api/emails/welcome", async (req, res) => {
    console.log("POST /api/emails/welcome hit");
    if (!resend) return res.status(503).json({ error: "Email service not configured. Please add RESEND_API_KEY to .env" });
    const { email, clientName, customSubject, customBody } = req.body;
    
    let subject = replacePlaceholders(customSubject || `Welcome to DigiWorld Infotech, {clientName}!`, { clientName });
    let html = customBody ? replacePlaceholders(customBody, { clientName }) : `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
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

      if (error) {
        console.error("Resend error (welcome):", error);
        return res.status(400).json({ error });
      }
      res.json({ data: data || { success: true } });
    } catch (err: any) {
      console.error("Internal service error (welcome):", err);
      res.status(500).json({ error: "Internal server error", message: err.message });
    }
  });

  app.post("/api/emails/invoice", async (req, res) => {
    console.log("POST /api/emails/invoice hit");
    if (!resend) return res.status(503).json({ error: "Email service not configured" });
    const { email, clientName, invoiceNumber, amount, dueDate, items, customSubject, customBody, paymentLink } = req.body;
    
    let subject = replacePlaceholders(customSubject || `New Invoice {invoiceNumber} from DigiWorld Infotech`, { clientName, invoiceNumber, amount, dueDate });
    let html = customBody ? replacePlaceholders(customBody, { clientName, invoiceNumber, amount, dueDate, paymentLink }) : `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 30px;">
              <tr>
                <td>
                  <div style="background-color: #6366f1; width: 40px; height: 40px; border-radius: 8px; display: inline-block; line-height: 40px; text-align: center; color: white; font-weight: bold; font-size: 20px;">D</div>
                </td>
                <td style="text-align: right;">
                  <h3 style="margin: 0; color: #1e293b;">Invoice ${invoiceNumber}</h3>
                  <p style="margin: 0; color: #64748b; font-size: 14px;">Due: ${dueDate}</p>
                </td>
              </tr>
            </table>
            
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
                  ${(items || []).map((item: any) => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 12px; color: #1e293b;">${item.serviceName} x ${item.qty}</td>
                      <td style="padding: 12px; text-align: right; color: #1e293b;">₹${(item.amount || 0).toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr>
                    <td style="padding: 12px; font-weight: bold; color: #1e293b;">Total Amount</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #6366f1; font-size: 18px;">₹${(amount || 0).toLocaleString()}</td>
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

      if (error) {
        console.error("Resend error (invoice):", error);
        return res.status(400).json({ error });
      }
      res.json({ data: data || { success: true } });
    } catch (err: any) {
      console.error("Internal service error (invoice):", err);
      res.status(500).json({ error: "Internal server error", message: err.message });
    }
  });
  
  app.post("/api/emails/estimate", async (req, res) => {
    console.log("POST /api/emails/estimate hit");
    if (!resend) return res.status(503).json({ error: "Email service not configured" });
    const { email, clientName, estimateNumber, amount, validUntil, items, customSubject, customBody } = req.body;
    
    let subject = replacePlaceholders(customSubject || `Estimate {estimateNumber} from DigiWorld Infotech`, { clientName, estimateNumber, amount, validUntil });
    let html = customBody ? replacePlaceholders(customBody, { clientName, estimateNumber, amount, validUntil }) : `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="background-color: #6366f1; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0;">DigiWorld Infotech</h1>
              <p style="color: white; opacity: 0.8; margin: 5px 0 0 0;">Quotation / Estimate</p>
            </div>
            
            <h2 style="color: #1e293b;">Hello ${clientName},</h2>
            <p style="color: #475569;">As requested, here is the estimate for your upcoming project/services.</p>
            
            <div style="margin: 30px 0; border: 1px solid #f1f5f9; border-radius: 12px; overflow: hidden;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead style="background-color: #f8fafc;">
                  <tr>
                    <th style="text-align: left; padding: 12px; color: #64748b; font-size: 12px; text-transform: uppercase;">Description</th>
                    <th style="text-align: right; padding: 12px; color: #64748b; font-size: 12px; text-transform: uppercase;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${(items || []).map((item: any) => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 12px; color: #1e293b;">${item.serviceName} x ${item.qty}</td>
                      <td style="padding: 12px; text-align: right; color: #1e293b;">₹${(item.amount || 0).toLocaleString()}</td>
                    </tr>
                  `).join('')}
                </tbody>
                <tfoot>
                  <tr>
                    <td style="padding: 12px; font-weight: bold; color: #1e293b;">Estimated Total</td>
                    <td style="padding: 12px; text-align: right; font-weight: bold; color: #6366f1; font-size: 18px;">₹${(amount || 0).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p style="color: #475569; font-size: 14px;"><strong>Validity:</strong> This quotation is valid until <strong>${validUntil}</strong>.</p>
            
            <p style="color: #475569; margin-top: 20px;">If you would like to proceed or have any questions, please reply to this email or contact us directly.</p>
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 40px;">
              Thank you for choosing DigiWorld Infotech.
            </p>
          </div>
        `;
  
    try {
      const { data, error } = await resend.emails.send({
        from: `DigiWorld Infotech <${fromEmail}>`,
        to: [email],
        subject,
        html,
      });
  
      if (error) {
        console.error("Resend error (estimate):", error);
        return res.status(400).json({ error });
      }
      res.json({ data: data || { success: true } });
    } catch (err: any) {
      console.error("Internal service error (estimate):", err);
      res.status(500).json({ error: "Internal server error", message: err.message });
    }
  });

  app.post("/api/emails/recurring", async (req, res) => {
    console.log("POST /api/emails/recurring hit");
    if (!resend) return res.status(503).json({ error: "Email service not configured" });
    const { email, clientName, serviceName, amount, nextBillingDate, customSubject, customBody } = req.body;
    
    let subject = replacePlaceholders(customSubject || `Subscription Renewal: {serviceName}`, { clientName, serviceName, amount, nextBillingDate });
    let html = customBody ? replacePlaceholders(customBody, { clientName, serviceName, amount, nextBillingDate }) : `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <div style="background-color: #0f172a; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Subscription Renewal</h1>
            </div>
            <h2 style="color: #1e293b;">Hello ${clientName},</h2>
            <p style="color: #475569; line-height: 1.6;">This is a friendly notification that your recurring subscription for <strong>${serviceName}</strong> has been renewed.</p>
            
            <div style="background-color: #f8fafc; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #f1f5f9;">
              <table width="100%">
                <tr>
                  <td style="color: #64748b; padding-bottom: 12px;">Service</td>
                  <td style="color: #1e293b; font-weight: bold; text-align: right; padding-bottom: 12px;">${serviceName}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding-bottom: 12px;">Amount</td>
                  <td style="color: #1e293b; font-weight: bold; text-align: right; padding-bottom: 12px;">₹${(amount || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="color: #64748b;">Next Billing Date</td>
                  <td style="color: #1e293b; font-weight: bold; text-align: right;">${nextBillingDate}</td>
                </tr>
              </table>
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

      if (error) {
        console.error("Resend error (recurring):", error);
        return res.status(400).json({ error });
      }
      res.json({ data: data || { success: true } });
    } catch (err: any) {
      console.error("Internal service error (recurring):", err);
      res.status(500).json({ error: "Internal server error", message: err.message });
    }
  });
  
  app.post("/api/emails/overdue", async (req, res) => {
    console.log("POST /api/emails/overdue hit");
    if (!resend) return res.status(503).json({ error: "Email service not configured" });
    const { email, clientName, invoiceNumber, amount, dueDate, daysOverdue, customSubject, customBody, paymentLink } = req.body;
    
    let subject = replacePlaceholders(customSubject || `Overdue Payment Notice: Invoice {invoiceNumber}`, { clientName, invoiceNumber, amount, dueDate, daysOverdue });
    let html = customBody ? replacePlaceholders(customBody, { clientName, invoiceNumber, amount, dueDate, daysOverdue, paymentLink }) : `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #fee2e2; border-radius: 16px;">
            <div style="background-color: #ef4444; padding: 20px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0; font-size: 24px;">Overdue Payment Alert</h1>
            </div>
            
            <h2 style="color: #1e293b;">Hello ${clientName},</h2>
            <p style="color: #475569; line-height: 1.6;">This is a reminder that payment for <strong>Invoice ${invoiceNumber}</strong> was due on <strong>${dueDate}</strong> and is now <strong>${daysOverdue} days overdue</strong>.</p>
            
            <div style="background-color: #fef2f2; padding: 24px; border-radius: 12px; margin: 24px 0; border: 1px solid #fee2e2;">
              <table width="100%">
                <tr>
                  <td style="color: #64748b; padding-bottom: 12px;">Invoice Number</td>
                  <td style="color: #1e293b; font-weight: bold; text-align: right; padding-bottom: 12px;">${invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding-bottom: 12px;">Amount Due</td>
                  <td style="color: #1e293b; font-weight: bold; text-align: right; padding-bottom: 12px;">₹${(amount || 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="color: #64748b;">Due Date</td>
                  <td style="color: #b91c1c; font-weight: bold; text-align: right;">${dueDate}</td>
                </tr>
              </table>
            </div>
            
            <p style="color: #475569;">Please settle this payment at your earliest convenience to avoid any disruption in services.</p>
            
            <div style="text-align: center; margin-top: 30px;">
              <a href="${paymentLink || '#'}" style="background-color: #ef4444; color: white; padding: 12px 30px; border-radius: 10px; text-decoration: none; font-weight: bold; display: inline-block;">Pay Now</a>
            </div>
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 40px;">
              If you have already made the payment, please ignore this email.
            </p>
          </div>
        `;
  
    try {
      const { data, error } = await resend.emails.send({
        from: `DigiWorld Billing <${fromEmail}>`,
        to: [email],
        subject,
        html,
      });
  
      if (error) {
        console.error("Resend error (overdue):", error);
        return res.status(400).json({ error });
      }
      res.json({ data: data || { success: true } });
    } catch (err: any) {
      console.error("Internal service error (overdue):", err);
      res.status(500).json({ error: "Internal server error", message: err.message });
    }
  });

  app.post("/api/emails/followup", async (req, res) => {
    console.log("POST /api/emails/followup hit");
    if (!resend) return res.status(503).json({ error: "Email service not configured" });
    const { email, clientName, leadTitle, followUpDate, customSubject, customBody } = req.body;
    
    let subject = replacePlaceholders(customSubject || `Following up: {leadTitle}`, { clientName, leadTitle, followUpDate });
    let html = customBody ? replacePlaceholders(customBody, { clientName, leadTitle, followUpDate }) : `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
            <h2>Hello ${clientName},</h2>
            <p>I hope you are doing well. I am following up on our recent discussion regarding <strong>${leadTitle}</strong>.</p>
            <p>I would love to hear your thoughts and see how we can move forward.</p>
            <p>Best regards,<br>The DigiWorld Team</p>
          </div>
        `;

    try {
      const { data, error } = await resend.emails.send({
        from: `DigiWorld Infotech <${fromEmail}>`,
        to: [email],
        subject,
        html,
      });

      if (error) {
        console.error("Resend error (followup):", error);
        return res.status(400).json({ error });
      }
      res.json({ data: data || { success: true } });
    } catch (err: any) {
      console.error("Internal service error (followup):", err);
      res.status(500).json({ error: "Internal server error", message: err.message });
    }
  });

  // Fallback for unmatched API routes
  app.all("/api/*", (req, res) => {
    console.log(`404 API: ${req.method} ${req.path}`);
    res.status(404).json({ 
      error: `API route not found: ${req.method} ${req.originalUrl}`,
      method: req.method,
      url: req.originalUrl,
      help: "Check if you are using the correct HTTP method and path."
    });
  });

  // Basic error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error", message: err.message });
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
