-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ScheduleType" AS ENUM ('BEGINNER', 'TRAINED');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');

-- CreateEnum
CREATE TYPE "ExamResult" AS ENUM ('PASS', 'FAIL', 'ABSENT', 'PENDING');

-- CreateEnum
CREATE TYPE "TrialResult" AS ENUM ('PASS', 'FAIL', 'ABSENT', 'PENDING');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('ADVANCE', 'INSTALLMENT', 'TRAINING_FEE', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('OFFICE_ACCESSORIES', 'VEHICLE_REPAIRS', 'FUEL', 'OTHER');

-- CreateEnum
CREATE TYPE "FuelSubCategory" AS ENUM ('PETROL', 'DIESEL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('LOGIN', 'LOGOUT', 'CREATE_CLIENT', 'UPDATE_CLIENT', 'CREATE_EXAM', 'UPDATE_EXAM', 'CREATE_TRIAL', 'UPDATE_TRIAL', 'CREATE_LECTURE_ATTENDANCE', 'UPDATE_LECTURE_ATTENDANCE', 'CREATE_PRACTICAL_TRAINING', 'UPDATE_PRACTICAL_TRAINING', 'CREATE_PAYMENT', 'UPDATE_PAYMENT', 'CREATE_EXPENSE', 'UPDATE_EXPENSE', 'CREATE_EMPLOYEE', 'UPDATE_EMPLOYEE', 'DEACTIVATE_EMPLOYEE', 'ACTIVATE_EMPLOYEE', 'RESET_EMPLOYEE_PASSWORD', 'CREATE_VEHICLE_CLASS', 'UPDATE_VEHICLE_CLASS', 'UPDATE_SETTINGS');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "mobile" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "idNumber" TEXT NOT NULL,
    "admissionNumber" TEXT NOT NULL,
    "profilePhoto" TEXT,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "address" TEXT NOT NULL,
    "mobileMain" TEXT NOT NULL,
    "mobileBackup" TEXT,
    "mobileWhatsapp" TEXT,
    "registeredDate" TIMESTAMP(3) NOT NULL,
    "scheduleType" "ScheduleType" NOT NULL,
    "totalAgreedFee" DECIMAL(12,2) NOT NULL,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_classes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_vehicle_classes" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "vehicleClassId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_vehicle_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_documents" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "medicalReportNumber" TEXT,
    "medicalIssueDate" TIMESTAMP(3),
    "schoolCertificateNumber" TEXT,
    "dmtBarcodeNumber" TEXT,
    "learnerPermitIssueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "previous_licenses" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "previous_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "previous_license_classes" (
    "id" TEXT NOT NULL,
    "previousLicenseId" TEXT NOT NULL,
    "vehicleClassId" TEXT NOT NULL,

    CONSTRAINT "previous_license_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "written_exams" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "examDate" TIMESTAMP(3) NOT NULL,
    "dmtBarcode" TEXT,
    "attendance" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "result" "ExamResult" NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "written_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trial_exams" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "trialDate" TIMESTAMP(3) NOT NULL,
    "dmtBarcode" TEXT,
    "result" "TrialResult" NOT NULL DEFAULT 'PENDING',
    "resultNotes" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trial_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lecture_attendance" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "attendanceDate" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lecture_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practical_trainings" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "trainingDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "practical_trainings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practical_training_classes" (
    "id" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "vehicleClassId" TEXT NOT NULL,

    CONSTRAINT "practical_training_classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_payments" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "billNumber" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentType" "PaymentType" NOT NULL,
    "description" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_expenses" (
    "id" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "subCategory" "FuelSubCategory",
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "clients_idNumber_key" ON "clients"("idNumber");

-- CreateIndex
CREATE UNIQUE INDEX "clients_admissionNumber_key" ON "clients"("admissionNumber");

-- CreateIndex
CREATE INDEX "clients_registeredDate_idx" ON "clients"("registeredDate");

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "clients"("status");

-- CreateIndex
CREATE INDEX "clients_fullName_idx" ON "clients"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_classes_code_key" ON "vehicle_classes"("code");

-- CreateIndex
CREATE INDEX "vehicle_classes_status_idx" ON "vehicle_classes"("status");

-- CreateIndex
CREATE INDEX "client_vehicle_classes_vehicleClassId_idx" ON "client_vehicle_classes"("vehicleClassId");

-- CreateIndex
CREATE UNIQUE INDEX "client_vehicle_classes_clientId_vehicleClassId_key" ON "client_vehicle_classes"("clientId", "vehicleClassId");

-- CreateIndex
CREATE UNIQUE INDEX "client_documents_clientId_key" ON "client_documents"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "previous_licenses_clientId_key" ON "previous_licenses"("clientId");

-- CreateIndex
CREATE INDEX "previous_license_classes_vehicleClassId_idx" ON "previous_license_classes"("vehicleClassId");

-- CreateIndex
CREATE UNIQUE INDEX "previous_license_classes_previousLicenseId_vehicleClassId_key" ON "previous_license_classes"("previousLicenseId", "vehicleClassId");

-- CreateIndex
CREATE INDEX "written_exams_clientId_idx" ON "written_exams"("clientId");

-- CreateIndex
CREATE INDEX "written_exams_examDate_idx" ON "written_exams"("examDate");

-- CreateIndex
CREATE INDEX "written_exams_result_idx" ON "written_exams"("result");

-- CreateIndex
CREATE INDEX "trial_exams_clientId_idx" ON "trial_exams"("clientId");

-- CreateIndex
CREATE INDEX "trial_exams_trialDate_idx" ON "trial_exams"("trialDate");

-- CreateIndex
CREATE INDEX "trial_exams_result_idx" ON "trial_exams"("result");

-- CreateIndex
CREATE INDEX "lecture_attendance_clientId_idx" ON "lecture_attendance"("clientId");

-- CreateIndex
CREATE INDEX "lecture_attendance_attendanceDate_idx" ON "lecture_attendance"("attendanceDate");

-- CreateIndex
CREATE UNIQUE INDEX "lecture_attendance_clientId_attendanceDate_key" ON "lecture_attendance"("clientId", "attendanceDate");

-- CreateIndex
CREATE INDEX "practical_trainings_clientId_idx" ON "practical_trainings"("clientId");

-- CreateIndex
CREATE INDEX "practical_trainings_trainingDate_idx" ON "practical_trainings"("trainingDate");

-- CreateIndex
CREATE INDEX "practical_training_classes_vehicleClassId_idx" ON "practical_training_classes"("vehicleClassId");

-- CreateIndex
CREATE UNIQUE INDEX "practical_training_classes_trainingId_vehicleClassId_key" ON "practical_training_classes"("trainingId", "vehicleClassId");

-- CreateIndex
CREATE UNIQUE INDEX "client_payments_billNumber_key" ON "client_payments"("billNumber");

-- CreateIndex
CREATE INDEX "client_payments_clientId_idx" ON "client_payments"("clientId");

-- CreateIndex
CREATE INDEX "client_payments_paymentDate_idx" ON "client_payments"("paymentDate");

-- CreateIndex
CREATE INDEX "company_expenses_expenseDate_idx" ON "company_expenses"("expenseDate");

-- CreateIndex
CREATE INDEX "company_expenses_category_idx" ON "company_expenses"("category");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_key_key" ON "system_settings"("key");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_vehicle_classes" ADD CONSTRAINT "client_vehicle_classes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_vehicle_classes" ADD CONSTRAINT "client_vehicle_classes_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "vehicle_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "previous_licenses" ADD CONSTRAINT "previous_licenses_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "previous_license_classes" ADD CONSTRAINT "previous_license_classes_previousLicenseId_fkey" FOREIGN KEY ("previousLicenseId") REFERENCES "previous_licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "previous_license_classes" ADD CONSTRAINT "previous_license_classes_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "vehicle_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "written_exams" ADD CONSTRAINT "written_exams_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "written_exams" ADD CONSTRAINT "written_exams_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "written_exams" ADD CONSTRAINT "written_exams_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trial_exams" ADD CONSTRAINT "trial_exams_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trial_exams" ADD CONSTRAINT "trial_exams_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trial_exams" ADD CONSTRAINT "trial_exams_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecture_attendance" ADD CONSTRAINT "lecture_attendance_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecture_attendance" ADD CONSTRAINT "lecture_attendance_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecture_attendance" ADD CONSTRAINT "lecture_attendance_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practical_trainings" ADD CONSTRAINT "practical_trainings_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practical_trainings" ADD CONSTRAINT "practical_trainings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practical_trainings" ADD CONSTRAINT "practical_trainings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practical_training_classes" ADD CONSTRAINT "practical_training_classes_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "practical_trainings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practical_training_classes" ADD CONSTRAINT "practical_training_classes_vehicleClassId_fkey" FOREIGN KEY ("vehicleClassId") REFERENCES "vehicle_classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_payments" ADD CONSTRAINT "client_payments_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_expenses" ADD CONSTRAINT "company_expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_expenses" ADD CONSTRAINT "company_expenses_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
