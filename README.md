# Electropathy AI – Clinical Portal & Knowledge Assistant

An AI-powered knowledge and clinical decision-support application for Electropathy practitioners, researchers, and students. Built for **Dr. Ashish Wandhare**.

## Features

- **Mobile OTP Authentication**: Secure Indian mobile number (+91) login with BlackSMS gateway.
- **Clinical Patient History Intake**: Comprehensive multi-step clinical wizard covering demographics, chief complaints, present illness, medical history, lifestyle review, and Electropathy constitution.
- **Prisma ORM & PostgreSQL**: Database schema powered by Prisma ORM and hosted on Supabase PostgreSQL.
- **Option A RAG Knowledge Assistant**: Grounded strictly in client-approved Electropathy datasets with multilingual support (English, Hindi, Marathi).

## Project Structure

```
├── client/          # React + Vite web portal frontend
├── server/          # Node.js + Express + Prisma ORM backend
├── project_Structure/ # Architecture and implementation documentation
└── README.md
```

## Getting Started

### 1. Backend Server Setup
```bash
cd server
npm install
npm run dev
```

### 2. Frontend Web Portal Setup
```bash
cd client
npm install
npm run dev
```
