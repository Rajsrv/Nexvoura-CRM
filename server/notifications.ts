import cron from 'node-cron';
import nodemailer from 'nodemailer';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

// Load Firebase config
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let db: admin.firestore.Firestore | null = null;

try {
  if (fs.existsSync(configPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Initialize Admin SDK
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
    
    // Use the specific firestoreDatabaseId from the config
    db = admin.firestore(firebaseConfig.firestoreDatabaseId);
  } else {
    console.warn('⚠️ firebase-applet-config.json not found at:', configPath);
  }
} catch (error) {
  console.error('❌ Error initializing Firebase in notifications:', error);
}

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
  
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    if (!db) return;
    console.log('⏰ Checking for tasks due soon based on company settings...');
    
    try {
      const companiesSnap = await db.collection('companies').get();
      
      for (const companyDoc of companiesSnap.docs) {
        const company = companyDoc.data();
        const settings = company.notificationSettings || { enabled: true, dueSoonHours: 24 };
        
        if (!settings.enabled) {
          console.log(`ℹ️ Notifications disabled for company: ${company.name}`);
          continue;
        }

        const now = new Date();
        const threshold = new Date(now.getTime() + (settings.dueSoonHours * 60 * 60 * 1000));
        
        // Query tasks for this specific company that are not done and haven't sent notification
        const querySnapshot = await db.collection('tasks')
          .where('companyId', '==', companyDoc.id)
          .where('status', '!=', 'Done')
          .where('notificationSent', '==', false)
          .get();
        
        for (const taskDoc of querySnapshot.docs) {
          const task = taskDoc.data();
          const dueDate = new Date(task.dueDate);
          
          // If due soon based on company threshold
          if (dueDate > now && dueDate <= threshold) {
            console.log(`🔔 Task "${task.title}" for ${company.name} is due soon. Sending notification...`);
            
            if (task.assignedTo) {
              // Fetch user email
              const userSnap = await db.collection('users').doc(task.assignedTo).get();
              
              if (userSnap.exists) {
                const userData = userSnap.data();
                const userEmail = userData?.email;
                
                if (userEmail) {
                  await sendEmail(userEmail, task.title, task.dueDate);
                  
                  // Mark as sent
                  await db.collection('tasks').doc(taskDoc.id).update({
                    notificationSent: true
                  });
                  
                  console.log(`✅ Notification sent to ${userEmail}`);
                }
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
