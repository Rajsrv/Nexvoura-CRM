import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { db } from './firebaseAdmin.ts';
import { format, parseISO } from 'date-fns';
import type { PayrollRecord } from '../src/types.ts';

// Email Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export function startNotificationCron() {
  if (!db) {
    console.warn('⚠️ Firebase not initialized. Notification cron will not run.');
    return;
  }
  console.log('🚀 Starting Task Notification Cron Job...');
  
  // Run every minute for more precision
  cron.schedule('* * * * *', async () => {
    if (!db) {
      console.warn('⚠️ Cron skipped: db is not defined');
      return;
    }
    
    try {
      console.log('⏰ Checking for tasks due soon...');
      
      // Wait a bit if we're in the middle of a fallback? 
      // Actually let's just try to get companies and catch specific NOT_FOUND
      let companiesSnap;
      try {
        companiesSnap = await db.collection('companies').get();
      } catch (e: any) {
        if (e.code === 5 || e.message?.includes('NOT_FOUND')) {
          console.warn('⚠️ Database not found in cron job, it might still be initializing or using wrong ID. Skipping this run.');
          return;
        }
        throw e;
      }
      
      const now = new Date();
      const companyThresholds: Record<string, number> = {};
      const companyUnits: Record<string, 'hours' | 'minutes'> = {};
      const companyEnabled: Record<string, boolean> = {};
      const companyNames: Record<string, string> = {};

      companiesSnap.forEach(doc => {
        const data = doc.data();
        companyThresholds[doc.id] = data.notificationSettings?.dueSoonHours || 24;
        companyUnits[doc.id] = data.notificationSettings?.dueSoonUnit || 'hours';
        companyEnabled[doc.id] = data.notificationSettings?.enabled ?? true;
        companyNames[doc.id] = data.name;
      });

      // Query tasks that have reminders enabled.
      // Note: We filter status and reminderEmailSent in memory to avoid needing complex composite indexes
      // and to minimize potential gRPC permission/precondition errors.
      const querySnapshot = await db.collection('tasks')
        .where('reminderEnabled', '==', true)
        .get();
      
      for (const taskDoc of querySnapshot.docs) {
        const task = taskDoc.data();
        if (task.status === 'Done') continue;
        if (task.reminderEmailSent === true) continue;
        if (!task.dueDate) continue;

        const companyId = task.companyId;
        if (!companyEnabled[companyId]) continue;

        const dueDate = new Date(task.dueDate);
        
        // Determine the threshold for this specific task
        // If task has per-task reminderMinutes, use it. Otherwise use company default.
        let thresholdMinutes = 0;
        if (typeof task.reminderMinutes === 'number') {
          thresholdMinutes = task.reminderMinutes;
        } else {
          const unit = companyUnits[companyId] || 'hours';
          thresholdMinutes = unit === 'minutes' ? companyThresholds[companyId] : companyThresholds[companyId] * 60;
        }

        const thresholdDate = new Date(dueDate.getTime() - (thresholdMinutes * 60 * 1000));
        
        // If we are past the threshold date but before the due date (optional: or a bit after if it just passed)
        if (now >= thresholdDate && now < dueDate) {
          console.log(`🔔 Task "${task.title}" for ${companyNames[companyId] || companyId} reached threshold (${thresholdMinutes}m). Sending email...`);
          
          if (task.assignedTo) {
            const userSnap = await db.collection('users').doc(task.assignedTo).get();
            
            if (userSnap.exists) {
              const userData = userSnap.data();
              const userEmail = userData?.email;
              
              if (userEmail) {
                await sendEmail(userEmail, task.title, task.dueDate);
                
                // Mark as sent
                await db.collection('tasks').doc(taskDoc.id).update({
                  reminderEmailSent: true,
                  notificationSent: true // Maintain legacy compabitility if needed
                });
                
                console.log(`✅ Email sent to ${userEmail}`);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error in notification cron:', error);
    }
  });
}

async function sendEmail(to: string, taskTitle: string, dueDate: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️ SMTP credentials missing. Skipping email send.');
    return;
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Nexvoura" <noreply@nexvoura.com>',
    to,
    subject: `Task Reminder: ${taskTitle} is due soon!`,
    text: `Hello,\n\nThis is a reminder that the task "${taskTitle}" is due on ${new Date(dueDate).toLocaleDateString()}.\n\nPlease make sure to complete it on time.\n\nBest regards,\nNexvoura Team`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
        <h2 style="color: #1e293b;">Task Reminder</h2>
        <p style="color: #64748b; font-size: 16px;">Hello,</p>
        <p style="color: #334155; font-size: 16px;">This is a reminder that your task <strong>"${taskTitle}"</strong> is due soon.</p>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #475569;"><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>
        </div>
        <p style="color: #64748b; font-size: 14px;">Please check your dashboard for more details.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">This is an automated message from Nexvoura. Please do not reply.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export async function sendPayslipEmail(to: string, employeeName: string, month: string, details: PayrollRecord, currency: string) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️ SMTP credentials missing. Skipping email send.');
    return;
  }

  const gross = details.baseSalary + (details.bonus || 0);
  const deductions = (details.deductions || details.deduction || 0) + (details.taxAmount || 0);
  const net = (details.netSalary || details.totalAmount);

  const mailOptions = {
    from: process.env.SMTP_FROM || '"Nexvoura Payroll" <payroll@nexvoura.com>',
    to,
    subject: `Payslip for ${format(parseISO(month + '-01'), 'MMMM yyyy')}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 24px; background-color: #ffffff;">
        <div style="border-bottom: 4px solid #1e293b; padding-bottom: 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
          <h1 style="color: #4f46e5; margin: 0; font-style: italic; font-weight: 900;">NEXVOURA</h1>
          <div style="text-align: right;">
            <p style="margin: 0; font-weight: 900; text-transform: uppercase; font-size: 18px;">PAYSLIP</p>
            <p style="margin: 0; color: #64748b; font-size: 14px;">${format(parseISO(month + '-01'), 'MMMM yyyy')}</p>
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <p style="margin: 0; color: #94a3b8; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em;">Employee Details</p>
          <p style="margin: 5px 0 0 0; font-weight: 900; font-size: 16px; text-transform: uppercase;">${employeeName}</p>
          <p style="margin: 2px 0 0 0; color: #64748b; font-size: 12px;">ID: ${details.employeeId.slice(-8).toUpperCase()}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="padding: 12px; text-align: left; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0;">Description</th>
              <th style="padding: 12px; text-align: right; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0;">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px;">Basic Salary</td>
              <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-size: 14px; font-weight: 700;">${currency}${details.baseSalary.toLocaleString()}</td>
            </tr>
            ${details.bonus ? `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #059669;">Performance Bonus</td>
              <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-size: 14px; font-weight: 700; color: #059669;">+${currency}${details.bonus.toLocaleString()}</td>
            </tr>` : ''}
            <tr style="background-color: #f8fafc;">
              <td style="padding: 12px; font-size: 14px; font-weight: 700;">Gross Salary</td>
              <td style="padding: 12px; text-align: right; font-size: 14px; font-weight: 900;">${currency}${gross.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #dc2626;">Income Tax</td>
              <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-size: 14px; font-weight: 700; color: #dc2626;">-${currency}${(details.taxAmount || 0).toLocaleString()}</td>
            </tr>
            ${(details.deductions || details.deduction) ? `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; color: #dc2626;">Other Deductions</td>
              <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-size: 14px; font-weight: 700; color: #dc2626;">-${currency}${(details.deductions || details.deduction || 0).toLocaleString()}</td>
            </tr>` : ''}
          </tbody>
        </table>

        <div style="background-color: #1e293b; color: #ffffff; padding: 20px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1;">
            <p style="margin: 0; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #94a3b8;">Total Net Payable</p>
            <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 900; color: #60a5fa;">${currency}${net.toLocaleString()}</p>
          </div>
          <div style="text-align: right; flex: 1;">
            <p style="margin: 0; font-size: 10px; font-weight: 700; color: #94a3b8; font-style: italic;">Verified by Nexvoura System</p>
          </div>
        </div>

        <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">
          <p style="color: #94a3b8; font-size: 10px; margin: 0; text-transform: uppercase; letter-spacing: 0.1em;">This is an electronically generated payslip and does not require a physical signature.</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
