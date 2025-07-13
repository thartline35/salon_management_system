// Notification types
export interface Notification {
  id: number;
  message: string;
  type: "success" | "error" | "info" | "warning";
  timestamp: string;
}

// Staff types
export interface StaffAvailability {
  [day: string]: { start: string; end: string; available: boolean };
}

export interface StaffGalleryImage {
  id: number;
  url: string;
  caption: string;
  uploadDate: string;
  isBeforeAfter?: boolean;
}

export interface NotificationPreferences {
  newBooking: "email" | "sms" | "both";
  cancellation: "email" | "sms" | "both";
  workInRequest: "email" | "sms" | "both";
}

export interface StaffMember {
  id: string;
  name: string;
  phone: string;
  email: string;
  bio: string;
  specialties: string[];
  avatar: string;
  profilePhoto?: string;
  availability: StaffAvailability;
  gallery: StaffGalleryImage[];
  notificationPreferences: NotificationPreferences;
  isActive: boolean;
}

// Client types
export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  lastVisit: string;
  avatar: string;
  preferredContact: "email" | "sms" | "both";
}

// Service types
export interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  category: string;
  description: string;
  image: string;
  isActive: boolean;
}

// Customer types
export interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
  notes: string;
  preferredContact: "email" | "sms";
  carrier?: string; // Added for SMS notifications
}

// Work-in request types
export interface WorkInRequest {
  id: string;
  clientId: string;
  staffId: string;
  serviceId: string;
  requestedDate: string;
  requestedTime: string;
  customerInfo: CustomerInfo;
  status: "pending" | "approved" | "denied";
  requestTime: string;
  responseTime?: string;
  notes?: string;
}

// Appointment types
export interface Appointment {
  id: string;
  clientId: string;
  staffId: string;
  serviceId: string;
  date: string;
  time: string;
  endTime: string;
  status: "confirmed" | "completed" | "cancelled" | "no-show";
  notes: string;
  isCallIn?: boolean;
  isWorkInApproval?: boolean;
  originalRequestId?: string;
}

// Booking types
export interface CustomerBooking {
  selectedService: Service | null;
  selectedStaff: StaffMember | null;
  selectedDate: string;
  selectedTime: string;
  customerInfo: CustomerInfo;
  isWorkInRequest?: boolean;
}

// Form types
export interface StaffFormData {
  name: string;
  phone: string;
  email: string;
  bio: string;
  specialties: string;
  availability: StaffAvailability;
}

export interface ServiceFormData {
  name: string;
  duration: string;
  price: string;
  category: string;
  description: string;
}

// Modal types
export interface ModalProps {
  show: boolean;
  onClose: () => void;
}

export interface StaffModalProps extends ModalProps {
  staffForm: StaffFormData;
  setStaffForm: React.Dispatch<React.SetStateAction<StaffFormData>>;
  handleAddStaff: () => void;
  editingStaff?: StaffMember | null;
}

export interface ServiceModalProps extends ModalProps {
  serviceForm: ServiceFormData;
  setServiceForm: React.Dispatch<React.SetStateAction<ServiceFormData>>;
  handleAddService: () => void;
  editingService?: Service | null;
}

// Notification service types
export interface SendSMSResult {
  success: boolean;
  error?: unknown;
}

export interface SendSMSParams {
  to: string;
  message: string;
}

export interface SendEmailResult {
  success: boolean;
  error?: unknown;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  message: string;
}

export interface NotificationService {
  sendEmail: (
    to: string,
    subject: string,
    message: string
  ) => Promise<SendEmailResult>;
  sendSMS: (to: string, message: string) => Promise<SendSMSResult>;
  sendWorkInResponse: (
    request: WorkInRequest,
    staffMember: StaffMember,
    status: "approved" | "denied",
    responseNotes?: string,
    services?: Service[],
    selectedTime?: string
  ) => Promise<SendEmailResult | SendSMSResult>;
}

// Work-in response modal types
export interface WorkInResponseModalProps {
  show: boolean;
  onClose: () => void;
  request: WorkInRequest | null;
  staffMember: StaffMember;
  onUpdateRequest: (
    id: string,
    updates: Partial<WorkInRequest>
  ) => Promise<any>;
  sendNotification: (message: string, type?: Notification["type"]) => void;
  services: Service[];
}

// Work-in request card types
export interface WorkInRequestCardProps {
  request: WorkInRequest;
  staffMember: StaffMember;
  services: Service[];
  onShowResponseModal: (request: WorkInRequest) => void;
  onQuickResponse: (
    request: WorkInRequest,
    status: "approved" | "denied"
  ) => void;
} 