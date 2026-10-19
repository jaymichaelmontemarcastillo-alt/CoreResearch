import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { AdviserResearchDocument } from '../models/AdviserResearchDocument.js';
import adviserResearchProcessingService from '../services/adviserResearchProcessingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const REPO_ROOT = path.resolve(__dirname, '../../../repository-imports');

const ADVISER_MAPPINGS = [
  {
    name: 'Dr. Sherwin B. Sapin',
    uid: 'ZZGTg6gwaLZfTXoht4JnUYqV8Uh1',
    email: 'sherwin.sapin@lspu.edu.ph',
    documents: [
      {
        folder: 'BSCS',
        file: 'AUTHENTICATING SUBLI DANCE MOVEMENTS THROUGH.pdf',
        title: 'Authenticating Subli Dance Movements Through Keypoint-Based Image Processing and CNN-Based Posture Analysis'
      },
      {
        folder: 'BSCS',
        file: 'COMPARATIVE ANALYSIS OF OBJECT DETECTION ALGORITHMS FOR IMAGE BASED DETECTION OF CHICKEN FOWLFOX DISEASE - Rachel Ann Maliksi.pdf',
        title: 'Comparative Analysis of Object Detection Algorithms for Image-Based Detection of Chicken Fowlpox Disease'
      },
      {
        folder: 'BSIT',
        file: 'BAITED A 2D SHORT FILM ANIMATED ON.pdf',
        title: 'Baited: A 2D Short Film Animated on Online Gambling'
      },
      {
        folder: 'BSIT',
        file: 'I AM PRESENT A WEB-BASED APPLICATION OPTIMIZING STUDENTS’.pdf',
        title: "I Am Present: A Web-Based Application Optimizing Students' Attendance Monitoring Through Group Shot-Based Facial Recognition"
      },
      {
        folder: 'BSIT',
        file: 'MEATCHECKER AN ANDROID-BASED MOBILE.pdf',
        title: 'MeatChecker: An Android-Based Mobile Application for Freshness Classification of Meat Using Convolutional Neural Network'
      },
      {
        folder: 'BSIT',
        file: 'PATIENT RECORD SYSTEM WITH DISEASE TRACKING.pdf',
        title: 'Patient Record System with Disease Tracking and ARIMA-Based Forecasting for Top 5 Diseases in Los Baños Laguna'
      }
    ]
  },
  {
    name: 'Jefferson L. Lerios',
    uid: 'ktgkHySP6OZA7gMNRLfNsrFwIhw2',
    email: 'jefferson.lerios@lspu.edu.ph',
    documents: [
      {
        folder: 'BSCS',
        file: 'UTILIZATION OF DEEP LEARNING_ OPTIMIZED YOLOV8 FOR DETECTION OF MOTORCYCLE INTRUSION AND LICENSE PLATE RECOGNITION ON BICYCLE LANES - Roda Mendez.pdf',
        title: 'Utilization of Deep Learning: Optimized YOLOv8 for Detection of Motorcycle Intrusion and License Plate Recognition on Bicycle Lanes'
      },
      {
        folder: 'BSIT',
        file: 'CAMP MACARIO SAKAY WEB SECURITY SYSTEM IMPLEMENTATION OF.pdf',
        title: 'Camp Macario Sakay Web Security System: Implementation of Facial Identification and Recognition Using Convolutional Neural Network'
      },
      {
        folder: 'BSIT',
        file: 'BATO SPRING RESOURCE UTILIZATION OPTIMIZATION.pdf',
        title: 'Bato Spring Resource Utilization Optimization and Management System Integrating Machine Learning Algorithm'
      },
      {
        folder: 'BSIT',
        file: 'DEVELOPMENT OF AN ONLINE CLASS CONFERENCE (1).pdf',
        title: 'Development of an Online Class Conference Platform: Integrating Facial Expression Recognition Utilizing Face++ Web API'
      },
      {
        folder: 'BSIT',
        file: 'IMPLEMENTING TOURISM CIRCUIT CONCEPT WITH MACHINE.pdf',
        title: 'Implementing Tourism Circuit Concept with Machine Learning on a Web-Based Tourism Platform for Majayjay, Laguna'
      },
      {
        folder: 'BSIT',
        file: 'Real-Time Price Monitoring and Market Prediction for Agricultural Commodities in District 2. A Multi-Platform Data Analytics Application - John Vincent Sorino.pdf',
        title: 'Real-Time Price Monitoring and Market Prediction for Agricultural Commodities in District 2: A Multi-Platform Data Analytics Application'
      },
      {
        folder: 'BSIT',
        file: 'SMART DASHBOARD A WEB-BASED PLATFORM FOR.pdf',
        title: 'Smart Dashboard: A Web-Based Platform for Citizen Engagement and Data-Driven Digital Governance Using Automated Processing'
      }
    ]
  },
  {
    name: 'Dr. Crisanto F. Gulay',
    uid: 'M3GVM6Ys9iTMpihAEfJXo5Zbl682',
    email: 'crisanto.gulay@lspu.edu.ph',
    documents: [
      {
        folder: 'BSCS',
        file: 'DEEP LEARNING-BASED MULTI-OBJECT DETECTION OF.pdf',
        title: 'Deep Learning-Based Multi-Object Detection of Epiphytes and Parasitic Plants on Host Trees Using Optimized Mask R-CNN for Symbiotic Health Assessment'
      },
      {
        folder: 'BSCS',
        file: 'SPATIAL ANALYSIS AND MULTI-SOURCE DATA FUSION FOR.pdf',
        title: 'Spatial Analysis and Multi-Source Data Fusion for Dengue Outbreak Forecasting Using an Ensemble of Random Forest and XGBoost with GIS Integration'
      },
      {
        folder: 'BSIT',
        file: 'BALIKBAYANI PORTAL A FILING SYSTEM FOR MIGRANT RECORDS IN.pdf',
        title: 'BalikBayani Portal: A Filing System for Migrant Records in the Processing Division of the Department of Migrant Workers'
      },
      {
        folder: 'BSIT',
        file: 'ISERVE+ A PESO LOS BAÑOS SERVICE MANAGEMENT.pdf',
        title: 'iServe+: A PESO Los Baños Service Management Process-Based Hiring Platform with AI-Powered Upskilling Recommendations'
      }
    ]
  },
  {
    name: 'Alejandro V. Matute Jr.',
    uid: 'TSob2I3MYOSRSSBuuL1M4hZM9jv2',
    email: 'alejandro.matute@lspu.edu.ph',
    documents: [
      {
        folder: 'BSIT',
        file: 'MORE_THAN_HIV_PINOY_STIGMA_IN_2D_ANIMATION - BOLIMA, AXEL ROSS.pdf',
        title: 'More Than HIV: Pinoy Stigma in 2D Animation'
      },
      {
        folder: 'BSIT',
        file: 'BAITED A 2D SHORT FILM ANIMATED ON.pdf',
        title: 'Baited: A 2D Short Film Animated on Online Gambling'
      },
      {
        folder: 'BSIT',
        file: 'PATIENT RECORD SYSTEM WITH DISEASE TRACKING.pdf',
        title: 'Patient Record System with Disease Tracking and ARIMA-Based Forecasting for Top 5 Diseases in Los Baños Laguna'
      }
    ]
  },
  {
    name: 'Wilson B. Suyat',
    uid: '7McJ04RrsvcTMFrCelJCHJml3D02',
    email: 'wilson.suyat@lspu.edu.ph',
    documents: [
      {
        folder: 'BSIT',
        file: 'CAFE BY THR BAY-INTEGRATION OF A WEB-BASED POINT-OF-SALES SYSTEM - TUISA MARIA RAQUEL GRACE A..docx',
        title: 'Cafe by the Bay: Integration of a Web-Based Point-of-Sales System with Inventory Tracking and Predictive Analytics'
      },
      {
        folder: 'BSIT',
        file: 'ABANTE BABAE A VIDEO ON WOMEN’S PARTICIPATION IN PUBLIC.pdf',
        title: "Abante Babae: A Video Campaign on Women's Participation in Public Leadership and Governance"
      },
      {
        folder: 'BSIT',
        file: 'BATO SPRING RESOURCE UTILIZATION OPTIMIZATION.pdf',
        title: 'Bato Spring Resource Utilization Optimization and Management System Integrating Machine Learning Algorithm'
      },
      {
        folder: 'BSCS',
        file: 'Optimizing Mangrove Preservation Using Cellular Evolutionary Algorithm and Enchaced Spatial Analysis From Remote Sensing Data - Xailah May Banasihan.pdf',
        title: 'Optimizing Mangrove Preservation Using Cellular Evolutionary Algorithm and Enhanced Spatial Analysis from Remote Sensing Data'
      },
      {
        folder: 'BSCS',
        file: 'UTILIZATION OF DEEP LEARNING_ OPTIMIZED YOLOV8 FOR DETECTION OF MOTORCYCLE INTRUSION AND LICENSE PLATE RECOGNITION ON BICYCLE LANES - Roda Mendez.pdf',
        title: 'Utilization of Deep Learning: Optimized YOLOv8 for Detection of Motorcycle Intrusion and License Plate Recognition on Bicycle Lanes'
      }
    ]
  }
];

// Clean up stale test documents for Matute from earlier test
async function cleanOldTestDocs() {
  const staleIds = ['advres-1792445267110-tu0s', 'advres-1792445673144-tks9', 'advres-1792445831126-ikyy'];
  for (const id of staleIds) {
    try {
      await adviserResearchProcessingService.deleteDocument(id, 'TSob2I3MYOSRSSBuuL1M4hZM9jv2', true);
      console.log(`[Cleanup] Removed previous test doc: ${id}`);
    } catch (e) {
      // ignore
    }
  }
}

async function uploadAdviserDocs() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected.');

  await cleanOldTestDocs();

  let totalProcessed = 0;
  let totalSkipped = 0;

  for (const adviser of ADVISER_MAPPINGS) {
    console.log(`\n======================================================`);
    console.log(`Processing Adviser: ${adviser.name} (${adviser.email}) [UID: ${adviser.uid}]`);
    console.log(`Total Documents to upload: ${adviser.documents.length}`);
    console.log(`======================================================`);

    for (const item of adviser.documents) {
      const filePath = path.join(REPO_ROOT, item.folder, item.file);
      if (!fs.existsSync(filePath)) {
        console.warn(`[MISSING FILE] ${filePath}`);
        continue;
      }

      const cleanFileName = item.file.replace(/[^a-zA-Z0-9._-]/g, '_');

      // Check if already uploaded for this adviser
      const existing = await AdviserResearchDocument.findOne({
        adviserId: adviser.uid,
        $or: [
          { originalFilename: cleanFileName },
          { title: item.title }
        ]
      });

      if (existing) {
        console.log(`[ALREADY EXISTS] "${item.title}" for ${adviser.name} (Status: ${existing.processingStatus})`);
        totalSkipped++;
        continue;
      }

      const stats = fs.statSync(filePath);
      const fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = ext === '.pdf' 
        ? 'application/pdf' 
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      console.log(`\n[UPLOADING] ${item.title}`);
      console.log(`   File: [${item.folder}] ${item.file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

      try {
        const doc = await adviserResearchProcessingService.importResearchDocument({
          fileBuffer,
          fileName: item.file,
          mimeType,
          fileSize: stats.size,
          adviserId: adviser.uid,
          title: item.title
        });

        console.log(`   Document Created: ID ${doc.id}`);

        // Wait for background processing to reach READY or FAILED (poll up to 30s)
        let attempts = 0;
        let finalStatus = 'UPLOADED';
        while (attempts < 20) {
          await new Promise(r => setTimeout(r, 1500));
          const current = await AdviserResearchDocument.findOne({ id: doc.id });
          if (current) {
            finalStatus = current.processingStatus;
            if (finalStatus === 'READY' || finalStatus === 'FAILED') break;
          }
          attempts++;
        }

        console.log(`   Final Status: ${finalStatus}`);
        totalProcessed++;

        // Brief delay between documents to respect API rate limits
        await new Promise(r => setTimeout(r, 1000));
      } catch (err) {
        console.error(`   [ERROR] Failed to import ${item.file}:`, err.message);
      }
    }
  }

  console.log(`\n======================================================`);
  console.log(`Upload automation completed!`);
  console.log(`Total Uploaded: ${totalProcessed}`);
  console.log(`Total Skipped (already existed): ${totalSkipped}`);
  console.log(`======================================================`);

  // Final summary of documents per adviser in DB
  console.log('\n--- VERIFICATION OF ADVISER RESEARCH DOCUMENTS IN DB ---');
  for (const adviser of ADVISER_MAPPINGS) {
    const docs = await AdviserResearchDocument.find({ adviserId: adviser.uid }).lean();
    console.log(`\n${adviser.name} (${docs.length} documents):`);
    docs.forEach((d, idx) => {
      console.log(`  ${idx + 1}. [${d.processingStatus}] "${d.title}" (Keywords: ${(d.keywords || []).slice(0, 3).join(', ')})`);
    });
  }

  await mongoose.disconnect();
}

uploadAdviserDocs().catch(console.error);
