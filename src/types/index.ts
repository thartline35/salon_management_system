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

export interface StaffMember {
  id: string;
  name: string;
  phone: string;
  bio: string;
  specialties: string[];
  avatar: string;
  profilePhoto?: string;
  availability: StaffAvailability;
  gallery: StaffGalleryImage[];
  isActive: boolean;
}

// Client types
export interface Client {
  id: string;
  name: string;
  phone: string;
  notes: string;
  lastVisit: string;
  avatar: string;
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
  notes: string;
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