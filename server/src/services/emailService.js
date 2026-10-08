import nodemailer from 'nodemailer';

// Configure your SMTP transporter
// For production, you should use real SMTP credentials from .env
const transporter = nodemailer.createTransport({
  service: 'gmail', // or use host/port for standard SMTP
  auth: {
    user: process.env.EMAIL_USER || 'noreply.coreresearch@gmail.com', 
    pass: process.env.EMAIL_PASSWORD || 'dummy-password'
  }
});

class EmailService {
  async sendDocumentExtractionCompleteEmail(toEmail, adviserName, documentTitle) {
    try {
      const mailOptions = {
        from: `"CoreResearch System" <${process.env.EMAIL_USER || 'noreply.coreresearch@gmail.com'}>`,
        to: toEmail,
        subject: 'CoreResearch: Document Analysis Complete!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 10px;">
            <h2 style="color: #2563eb;">Document Analysis Complete</h2>
            <p>Hello ${adviserName || 'Adviser'},</p>
            <p>The NLP extraction and semantic analysis for your uploaded document <strong>"${documentTitle}"</strong> has finished successfully.</p>
            <p>Our system has identified the key concepts, methodologies, and abstract of your research. This information is now active in the system and will be used to intelligently match you with student research proposals that align with your expertise.</p>
            <br>
            <p>You can view the full extracted details by logging into the CoreResearch portal.</p>
            <br>
            <p>Best regards,</p>
            <p><strong>CoreResearch AI Engine</strong></p>
          </div>
        `
      };

      // We only attempt to send if EMAIL_USER is actually configured to avoid crashing in dev
      if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        await transporter.sendMail(mailOptions);
        console.log(`[EmailService] Sent completion email to ${toEmail}`);
      } else {
        console.log(`[EmailService] Skipping email to ${toEmail} because EMAIL_USER is not configured in .env`);
      }
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
    }
  }
}

export const emailService = new EmailService();
