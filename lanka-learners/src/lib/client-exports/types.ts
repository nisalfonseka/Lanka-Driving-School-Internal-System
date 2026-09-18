export type ExportActor = {
  fullName: string | null;
};

export type ExportVehicleClass = {
  code: string;
  name: string;
};

export type ExportWrittenExam = {
  examDate: string;
  dmtBarcode: string | null;
  result: string;
  createdAt: string;
  updatedAt: string;
  createdBy: ExportActor;
  updatedBy: ExportActor;
};

export type ExportTrial = {
  trialDate: string;
  dmtBarcode: string | null;
  result: string;
  resultNotes: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: ExportActor;
  updatedBy: ExportActor;
};

export type ExportLecture = {
  attendanceDate: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: ExportActor;
  updatedBy: ExportActor;
};

export type ExportTraining = {
  trainingDate: string;
  status: string;
  notes: string | null;
  vehicleClasses: ExportVehicleClass[];
  createdAt: string;
  updatedAt: string;
  createdBy: ExportActor;
  updatedBy: ExportActor;
};

export type ExportPayment = {
  paymentDate: string;
  billNumber: string;
  amount: string;
  paymentType: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: ExportActor;
  updatedBy: ExportActor;
};

export type ClientExportSnapshot = {
  id: string;
  idNumber: string;
  admissionNumber: string;
  profilePhoto: string | null;
  fullName: string;
  dateOfBirth: string;
  address: string;
  mobileMain: string;
  mobileBackup: string | null;
  mobileWhatsapp: string | null;
  registeredDate: string;
  scheduleType: string;
  totalAgreedFee: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdBy: ExportActor;
  updatedBy: ExportActor;
  vehicleClasses: ExportVehicleClass[];
  document: {
    medicalReportNumber: string | null;
    medicalIssueDate: string | null;
    schoolCertificateNumber: string | null;
    dmtBarcodeNumber: string | null;
    learnerPermitNumber: string | null;
    learnerPermitIssueDate: string | null;
  } | null;
  previousLicense: {
    licenseNumber: string;
    issueDate: string | null;
    vehicleClasses: ExportVehicleClass[];
  } | null;
  writtenExams: ExportWrittenExam[];
  trials: ExportTrial[];
  lectures: ExportLecture[];
  trainings: ExportTraining[];
  payments: ExportPayment[];
};

export type WeeklyClientSnapshot = {
  version: 1;
  weekStart: string;
  capturedAt: string;
  clients: ClientExportSnapshot[];
};

export type ExportFormat = "pdf" | "csv";

