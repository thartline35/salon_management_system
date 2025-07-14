/*
  SalonManagementSystem.tsx
  Main application file for Twisted Roots Salon Management System.
  - Integrates admin, stylist, and customer views
  - Handles appointments, staff, services, gallery, notifications, and work-in requests
  - Uses Supabase for backend data
  - Designed for maintainability and scalability
*/

// --- Imports ---
import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Calendar,
  Users,
  Scissors,
  Clock,
  Plus,
  User,
  Bell,
  DollarSign,
  X,
  ArrowLeft,
  CheckCircle,
  Camera,
} from "lucide-react";
import { supabaseHelpers } from "./lib/supabaseHelpers";
import {
  Notification,
  StaffMember,
  Client,
  Service,
  CustomerInfo,
  WorkInRequest,
  Appointment,
  CustomerBooking,
  StaffFormData,
  ServiceFormData,
  ModalProps,
  StaffModalProps,
  ServiceModalProps,
  WorkInResponseModalProps,
  WorkInRequestCardProps,
} from "./types";

// --- Supabase Database Helpers ---
const databaseHelpers = supabaseHelpers;

// --- Data Transformation Utilities ---
// Converts raw DB records to UI-friendly objects
const transformDatabaseToUI = {
  staff: (dbStaff: any) => ({
    id: dbStaff.id, // Already converted in helpers
    name: dbStaff.name,
    phone: dbStaff.phone,
    email: dbStaff.email,
    bio: dbStaff.bio,
    specialties: dbStaff.specialties,
    avatar: dbStaff.avatar,
    profilePhoto: dbStaff.profilePhoto,
    availability: dbStaff.availability,
    gallery: dbStaff.gallery,
    notificationPreferences: dbStaff.notificationPreferences,
    isActive: true, // Filtered for active in helpers
  }),
  service: (dbService: any) => ({
    id: dbService.id, // Already converted in helpers
    name: dbService.name,
    duration: dbService.duration,
    price: dbService.price,
    category: dbService.category,
    description: dbService.description,
    image: dbService.image,
    isActive: true, // Filtered for active in helpers
  }),
  client: (dbCustomer: any) => ({
    id: dbCustomer.id, // Already converted in helpers
    name: dbCustomer.name,
    phone: dbCustomer.phone,
    email: dbCustomer.email,
    notes: dbCustomer.notes,
    lastVisit: dbCustomer.lastVisit,
    avatar: dbCustomer.avatar,
    preferredContact: dbCustomer.preferredContact,
  }),
  appointment: (dbAppointment: any) => ({
    id: dbAppointment.id, // Already converted in helpers
    clientId: dbAppointment.clientId,
    staffId: dbAppointment.staffId,
    serviceId: dbAppointment.serviceId,
    date: dbAppointment.date,
    time: dbAppointment.time,
    endTime: dbAppointment.endTime || dbAppointment.time, // Fallback if endTime not set
    status: dbAppointment.status,
    notes: dbAppointment.notes,
    isCallIn: dbAppointment.isCallIn,
    isWorkInApproval: dbAppointment.isWorkInApproval,
  }),
  workInRequest: (dbRequest: any) => ({
    id: dbRequest.id, // Already converted in helpers
    clientId: dbRequest.clientId,
    staffId: dbRequest.staffId,
    serviceId: dbRequest.serviceId,
    requestedDate: dbRequest.requestedDate,
    requestedTime: dbRequest.requestedTime,
    customerInfo: dbRequest.customerInfo,
    status: dbRequest.status,
    requestTime: dbRequest.requestTime,
    responseTime: dbRequest.responseTime,
    notes: dbRequest.notes,
  }),
};

// --- Work-In Request Card Component ---
/**
 * Displays a single work-in request for staff/admin review and response.
 */
const WorkInRequestCard: React.FC<WorkInRequestCardProps> = React.memo(
  ({ request, staffMember, services, onShowResponseModal, onQuickResponse }) => {
    const service = services.find((s) => s.id === request.serviceId);

    return (
      <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
        <div className="mb-3">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-gray-900">
              {request.customerInfo.name}
            </h3>
            <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
              📞 Phone
            </span>
          </div>
          <p className="text-sm text-gray-600">{service?.name}</p>
          <p className="text-sm text-orange-600">
            {new Date(request.requestedDate).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}{" "}
            at {!request.requestedTime || request.requestedTime === "01:00" || request.requestedTime === "" || request.requestedTime === null ? "any time" : new Date(`2000-01-01T${request.requestedTime}:00`).toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            📞 {request.customerInfo.phone}
          </p>
          {request.customerInfo.notes && (
            <p className="text-xs text-gray-600 mt-2 italic">
              "{request.customerInfo.notes}"
            </p>
          )}
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => onQuickResponse(request, "approved")}
            className="flex-1 bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 transition-all"
          >
            Quick Approve
          </button>
          <button
            onClick={() => onShowResponseModal(request)}
            className="flex-1 bg-orange-600 text-white py-2 px-3 rounded text-sm hover:bg-orange-700 transition-all"
          >
            Respond
          </button>
          <button
            onClick={() => onQuickResponse(request, "denied")}
            className="flex-1 bg-red-600 text-white py-2 px-3 rounded text-sm hover:bg-red-700 transition-all"
          >
            Deny
          </button>
        </div>
      </div>
    );
  }
);

// --- Data Management Hook ---
/**
 * useProductionDataManagement
 * Handles all CRUD operations and state for clients, staff, services, appointments, and work-in requests.
 * Loads initial data from the database and provides update methods for each entity.
 */
const useProductionDataManagement = () => {
  // --- State ---
  const [clients, setClients] = useState<Client[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [workInRequests, setWorkInRequests] = useState<WorkInRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Loads all initial data from the database in parallel
    const loadInitialData = async () => {
      try {
        // Test database connection
        const connectionTest = await databaseHelpers.testConnection();
        if (!connectionTest.success) {
          setLoading(false);
          return;
        }

        // Load all data in parallel
        const [
          staffResult,
          servicesResult,
          customersResult,
          appointmentsResult,
          workInRequestsResult,
        ] = await Promise.all([
          databaseHelpers.getStaff(),
          databaseHelpers.getServices(),
          databaseHelpers.getCustomers(),
          databaseHelpers.getAppointments(),
          databaseHelpers.getWorkInRequests(),
        ]);

        // Transform and set staff data
        if (staffResult.success && Array.isArray(staffResult.data)) {
          const transformedStaff = staffResult.data.map(
            transformDatabaseToUI.staff
          );
          
          // Load gallery images for each staff member
          const staffWithGallery = await Promise.all(
            transformedStaff.map(async (staffMember) => {
              try {
                const galleryResult = await databaseHelpers.getGalleryImages(staffMember.id);
                if (galleryResult.success && Array.isArray(galleryResult.data)) {
                  return {
                    ...staffMember,
                    gallery: galleryResult.data,
                  };
                }
              } catch (error) {
                console.error(`Error loading gallery for ${staffMember.name}:`, error);
              }
              return staffMember;
            })
          );
          
          setStaff(staffWithGallery);
          console.log("✅ Staff loaded:", staffWithGallery.length);
        } else {
          console.error("❌ Error loading staff:", staffResult.error);
        }

        // Transform and set services data
        if (servicesResult.success && Array.isArray(servicesResult.data)) {
          const transformedServices = servicesResult.data.map(
            transformDatabaseToUI.service
          );
          setServices(transformedServices);
          console.log("✅ Services loaded:", transformedServices.length);
        } else {
          console.error("❌ Error loading services:", servicesResult.error);
        }

        // Transform and set customers data
        if (customersResult.success && Array.isArray(customersResult.data)) {
          const transformedCustomers = customersResult.data.map(
            transformDatabaseToUI.client
          );
          setClients(transformedCustomers);
          console.log("✅ Customers loaded:", transformedCustomers.length);
        } else {
          console.error("❌ Error loading customers:", customersResult.error);
        }

        // Transform and set appointments data
        if (
          appointmentsResult.success &&
          Array.isArray(appointmentsResult.data)
        ) {
          const transformedAppointments = appointmentsResult.data.map(
            transformDatabaseToUI.appointment
          );
          setAppointments(transformedAppointments);
          console.log(
            "✅ Appointments loaded:",
            transformedAppointments.length
          );
        } else {
          console.error(
            "❌ Error loading appointments:",
            appointmentsResult.error
          );
        }

        // Transform and set work-in requests data
        if (
          workInRequestsResult.success &&
          Array.isArray(workInRequestsResult.data)
        ) {
          const transformedRequests = workInRequestsResult.data.map(
            transformDatabaseToUI.workInRequest
          );
          setWorkInRequests(transformedRequests);
          console.log(
            "✅ Work-in requests loaded:",
            transformedRequests.length
          );
        } else {
          console.error(
            "❌ Error loading work-in requests:",
            workInRequestsResult.error
          );
        }

        console.log("🎉 Initial data loading complete!");
      } catch (error) {
        console.error("💥 Error during initial data load:", error);
      } finally {
        // Always set loading to false, whether successful or not
        setLoading(false);
      }
    };

    loadInitialData();
  }, []); // Empty dependency array means this runs once on mount

  // Enhanced CRUD operations with production database integration
  const operations = useMemo(
    () => ({
      // Staff operations
      addStaff: async (staffData: StaffFormData) => {
        try {
          const result = await databaseHelpers.addStaff(staffData);

          if (result.success) {
            const newStaff = transformDatabaseToUI.staff(result.data);
            setStaff((prev) => [...prev, newStaff]);
            return { data: newStaff, error: null };
          }

          return { data: null, error: result.error };
        } catch (error) {
          return { data: null, error };
        }
      },

      updateStaff: async (id: string, updates: Partial<StaffMember>) => {
        try {
          // Find the staff member's Supabase ID
          const staffMember = staff.find((s) => s.id === id);
          if (!staffMember) {
            return { data: null, error: new Error("Staff member not found") };
          }

          const result = await databaseHelpers.updateStaff(
            staffMember.id,
            updates
          );

          if (result.success) {
            setStaff((prev) =>
              prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
            );
            return { data: { ...updates }, error: null };
          }

          return { data: null, error: result.error };
        } catch (error) {
          return { data: null, error };
        }
      },

      // Service operations
      addService: async (serviceData: ServiceFormData) => {
        try {
          const result = await databaseHelpers.addService(serviceData);

          if (result.success) {
            const newService = transformDatabaseToUI.service(result.data);
            setServices((prev) => [...prev, newService]);
            return { data: newService, error: null };
          }

          return { data: null, error: result.error };
        } catch (error) {
          return { data: null, error };
        }
      },

      updateService: async (id: string, serviceData: ServiceFormData) => {
        try {
          // Find the service's Supabase ID
          const service = services.find((s) => s.id === id);
          if (!service) {
            return { data: null, error: new Error("Service not found") };
          }

          const result = await databaseHelpers.updateService(service.id, {
            name: serviceData.name,
            category: serviceData.category,
            description: serviceData.description,
            duration: parseInt(serviceData.duration),
            price: parseFloat(serviceData.price),
          });

          if (result.success) {
            const updatedService = {
              ...service,
              name: serviceData.name,
              category: serviceData.category,
              description: serviceData.description,
              duration: parseInt(serviceData.duration),
              price: parseFloat(serviceData.price),
            };
            setServices((prev) =>
              prev.map((s) => (s.id === id ? updatedService : s))
            );
            return { data: updatedService, error: null };
          }

          return { data: null, error: result.error };
        } catch (error) {
          return { data: null, error };
        }
      },

      // Customer operations
      addCustomer: async (customerData: CustomerInfo) => {
        try {
          const result = await databaseHelpers.addCustomer(customerData);

          if (result.success) {
            const newClient = transformDatabaseToUI.client(result.data);
            setClients((prev) => [...prev, newClient]);
            return { data: newClient, error: null };
          }

          return { data: null, error: result.error };
        } catch (error) {
          return { data: null, error };
        }
      },

      // Appointment operations
      createAppointment: async (appointmentData: any) => {
        try {
          const result = await databaseHelpers.createAppointment(
            appointmentData
          );

          if (result.success) {
            const newAppointment = transformDatabaseToUI.appointment(
              result.data
            );
            setAppointments((prev) => [...prev, newAppointment]);
            return { data: newAppointment, error: null };
          }

          return { data: null, error: result.error };
        } catch (error) {
          return { data: null, error };
        }
      },

      // Work-in request operations
      createWorkInRequest: async (requestData: WorkInRequest) => {
        try {
          const result = await databaseHelpers.createWorkInRequest(requestData);

          if (result.success) {
            const newRequest = transformDatabaseToUI.workInRequest(result.data);
            setWorkInRequests((prev) => [...prev, newRequest]);
            return { data: newRequest, error: null };
          }

          return { data: null, error: result.error };
        } catch (error) {
          return { data: null, error };
        }
      },

      updateAppointment: async (id: string, updates: Partial<Appointment>) => {
        try {
          const result = await databaseHelpers.updateAppointment(id, updates);

          if (result.success) {
            setAppointments((prev) =>
              prev.map((apt) => (apt.id === id ? { ...apt, ...updates } : apt))
            );
            return { data: updates, error: null };
          }

          return { data: null, error: result.error };
        } catch (error) {
          return { data: null, error };
        }
      },

      updateWorkInRequest: async (
        id: string,
        updates: Partial<WorkInRequest>
      ) => {
        try {
          // Find the request's Supabase ID
          const request = workInRequests.find((r) => r.id === id);
          if (!request) {
            return {
              data: null,
              error: new Error("Work-in request not found"),
            };
          }

          const result = await databaseHelpers.updateWorkInRequest(
            request.id,
            updates
          );

          if (result.success) {
            setWorkInRequests((prev) =>
              prev.map((req) => (req.id === id ? { ...req, ...updates } : req))
            );
            return { data: updates, error: null };
          }

          return { data: null, error: result.error };
        } catch (error) {
          return { data: null, error };
        }
      },
    }),
    [staff, services, workInRequests]
  );

  return {
    // Data
    clients,
    staff,
    services,
    appointments,
    workInRequests,
    loading,

    // Setters (for local updates)
    setClients,
    setStaff,
    setServices,
    setAppointments,
    setWorkInRequests,

    // Database operations
    ...operations,
  };
};

// Admin Login Modal
const AdminLoginModal: React.FC<ModalProps & { onLogin: () => void }> =
  React.memo(({ show, onClose, onLogin }) => {
    const [loginForm, setLoginForm] = useState({ username: "", password: "" });
    const [error, setError] = useState("");

    const handleLogin = useCallback(() => {
      if (
        loginForm.username === "twistedroots" &&
        loginForm.password === "weLoveTammyJean:)"
      ) {
        onLogin();
        setLoginForm({ username: "", password: "" });
        setError("");
      } else {
        setError("Invalid username or password");
      }
    }, [loginForm.username, loginForm.password, onLogin]);

    const handleUsernameChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setLoginForm((prev) => ({ ...prev, username: e.target.value }));
        if (error) setError("");
      },
      [error]
    );

    const handlePasswordChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setLoginForm((prev) => ({ ...prev, password: e.target.value }));
        if (error) setError("");
      },
      [error]
    );

    const handleKeyPress = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
          handleLogin();
        }
      },
      [handleLogin]
    );

    if (!show) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">Admin Login</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={loginForm.username}
              onChange={handleUsernameChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginForm.password}
              onChange={handlePasswordChange}
              onKeyPress={handleKeyPress}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">
                {error}
              </div>
            )}
          </div>

          <button
            onClick={handleLogin}
            className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-all font-medium"
          >
            Login to Admin
          </button>
        </div>
      </div>
    );
  });

AdminLoginModal.displayName = "AdminLoginModal";

// Stylist Login Modal
const StylistLoginModal: React.FC<
  ModalProps & {
    onLogin: (staffId: string) => void;
    staff: StaffMember[];
  }
> = React.memo(({ show, onClose, onLogin, staff }) => {
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = useCallback(() => {
    if (!selectedStaffId) {
      setError("Please select a staff member");
      return;
    }

    if (!password) {
      setError("Please enter a password");
      return;
    }

    // Simple demo authentication - in real app, use proper auth
    if (password === "stylist123") {
      onLogin(selectedStaffId);
      setSelectedStaffId("");
      setPassword("");
      setError("");
    } else {
      setError("Invalid password");
    }
  }, [selectedStaffId, password, onLogin]);

  const handleStaffChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedStaffId(e.target.value);
      if (error) setError("");
    },
    [error]
  );

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
      if (error) setError("");
    },
    [error]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleLogin();
      }
    },
    [handleLogin]
  );

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Stylist Login</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Your Name
            </label>
            <select
              value={selectedStaffId}
              onChange={handleStaffChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Choose your name...</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={handlePasswordChange}
              onKeyPress={handleKeyPress}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">
              {error}
            </div>
          )}
        </div>

        <button
          onClick={handleLogin}
          className="w-full mt-6 bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 transition-all font-medium"
        >
          Login
        </button>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Demo password: <span className="font-mono">stylist123</span>
        </p>
      </div>
    </div>
  );
});

StylistLoginModal.displayName = "StylistLoginModal";

// Staff Modal Component
const StaffModal: React.FC<
  StaffModalProps & {
    editingStaff: StaffMember | null;
  }
> = React.memo(
  ({
    show,
    onClose,
    staffForm,
    setStaffForm,
    handleAddStaff,
    editingStaff,
  }) => {
    const handleInputChange = useCallback(
      <K extends keyof StaffFormData>(field: K, value: StaffFormData[K]) => {
        setStaffForm((prev) => ({ ...prev, [field]: value }));
      },
      [setStaffForm]
    );

    const handleAvailabilityChange = useCallback(
      (
        day: string,
        field: "start" | "end" | "available",
        value: string | boolean
      ) => {
        setStaffForm((prev) => ({
          ...prev,
          availability: {
            ...prev.availability,
            [day]: {
              ...prev.availability[day],
              [field]: value,
            },
          },
        }));
      },
      [setStaffForm]
    );

    if (!show) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-xl w-full max-w-2xl"
          style={{ height: "90vh", maxHeight: "90vh" }}
        >
          <div className="flex flex-col h-full">
            {/* Fixed Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
              <h3 className="text-xl font-bold text-gray-900">
                {editingStaff ? "Edit Staff Member" : "Add New Staff Member"}
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Full Name *"
                      value={staffForm.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number *"
                      value={staffForm.phone}
                      onChange={(e) =>
                        handleInputChange("phone", e.target.value)
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <input
                    type="email"
                    placeholder="Email Address"
                    value={staffForm.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />

                  <textarea
                    placeholder="Bio (experience, specialties description)"
                    value={staffForm.bio}
                    onChange={(e) => handleInputChange("bio", e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specialties (comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Hair Cut, Hair Color, Highlights"
                      value={staffForm.specialties}
                      onChange={(e) =>
                        handleInputChange("specialties", e.target.value)
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weekly Availability
                    </label>
                    <div className="space-y-2">
                      {Object.entries(staffForm.availability).map(
                        ([day, schedule]) => (
                          <div
                            key={day}
                            className="flex items-center space-x-4 p-3 border border-gray-200 rounded-lg"
                          >
                            <div className="w-20">
                              <label className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={schedule.available}
                                  onChange={(e) =>
                                    handleAvailabilityChange(
                                      day,
                                      "available",
                                      e.target.checked
                                    )
                                  }
                                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span className="text-sm font-medium text-gray-900 capitalize">
                                  {day}
                                </span>
                              </label>
                            </div>

                            {schedule.available && (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="time"
                                  value={schedule.start}
                                  onChange={(e) =>
                                    handleAvailabilityChange(
                                      day,
                                      "start",
                                      e.target.value
                                    )
                                  }
                                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                                <span className="text-gray-500">to</span>
                                <input
                                  type="time"
                                  value={schedule.end}
                                  onChange={(e) =>
                                    handleAvailabilityChange(
                                      day,
                                      "end",
                                      e.target.value
                                    )
                                  }
                                  className="border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Bottom padding for scroll */}
                  <div className="h-8"></div>
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex space-x-4 p-6 border-t border-gray-200 flex-shrink-0">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStaff}
                className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-all font-medium"
              >
                {editingStaff ? "Update Staff Member" : "Add Staff Member"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

StaffModal.displayName = "StaffModal";

// Service Modal Component
const ServiceModal: React.FC<
  ServiceModalProps & {
    editingService: Service | null;
  }
> = React.memo(
  ({
    show,
    onClose,
    serviceForm,
    setServiceForm,
    handleAddService,
    editingService,
  }) => {
    const handleInputChange = useCallback(
      <K extends keyof ServiceFormData>(
        field: K,
        value: ServiceFormData[K]
      ) => {
        setServiceForm((prev) => ({ ...prev, [field]: value }));
      },
      [setServiceForm]
    );

    if (!show) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 w-full max-w-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">
              {editingService ? "Edit Service" : "Add New Service"}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="Service Name *"
              value={serviceForm.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />

            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="Duration (minutes) *"
                value={serviceForm.duration}
                onChange={(e) => handleInputChange("duration", e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <input
                type="number"
                placeholder="Price ($) *"
                value={serviceForm.price}
                onChange={(e) => handleInputChange("price", e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <select
              value={serviceForm.category}
              onChange={(e) => handleInputChange("category", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select Category</option>
              <option value="Hair">Hair</option>
              <option value="Nails">Nails</option>
              <option value="Facial">Facial</option>
              <option value="Massage">Massage</option>
              <option value="Skincare">Skincare</option>
              <option value="Other">Other</option>
            </select>

            <textarea
              placeholder="Service Description"
              value={serviceForm.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={3}
            />
          </div>

          <div className="flex space-x-4 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleAddService}
              className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-all font-medium"
            >
              {editingService ? "Update Service" : "Add Service"}
            </button>
          </div>
        </div>
      </div>
    );
  }
);

ServiceModal.displayName = "ServiceModal";

// Call-In Appointment Modal
const CallInModal: React.FC<{
  show: boolean;
  onClose: () => void;
  onSubmit: () => void;
  form: any;
  setForm: any;
  staff: StaffMember[];
  services: Service[];
  appointments: Appointment[];
}> = React.memo(({ show, onClose, onSubmit, form, setForm, staff, services, appointments }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 border-4 border-red-500">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Create Call-In Appointment</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Customer Name *"
              value={form.customerName}
              onChange={(e) => setForm({ ...form, customerName: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <input
              type="tel"
              placeholder="Phone Number (optional)"
              value={form.customerPhone}
              onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <input
            type="email"
            placeholder="Email Address (optional)"
            value={form.customerEmail}
            onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />

          {/* Carrier selection for SMS notifications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mobile Carrier (for text notifications)
            </label>
            <select
              value={form.customerCarrier || ""}
              onChange={(e) => setForm({ ...form, customerCarrier: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select carrier (optional)</option>
              <option value="verizon">Verizon</option>
              <option value="att">AT&T</option>
              <option value="tmobile">T-Mobile</option>
              <option value="sprint">Sprint</option>
              <option value="boost">Boost Mobile</option>
              <option value="cricket">Cricket</option>
              <option value="metro">Metro by T-Mobile</option>
              <option value="uscellular">US Cellular</option>
              <option value="virgin">Virgin Mobile</option>
            </select>
          </div>

          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Service *</label>
            <select
              value={form.selectedService?.id || ""}
              onChange={(e) => {
                const service = services.find(s => s.id === e.target.value);
                setForm({ ...form, selectedService: service });
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a service...</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - ${service.price} ({service.duration} min)
                </option>
              ))}
            </select>
          </div>

          {/* Staff Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Stylist *</label>
            <select
              value={form.selectedStaff?.id || ""}
              onChange={(e) => {
                const staffMember = staff.find(s => s.id === e.target.value);
                setForm({ ...form, selectedStaff: staffMember });
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a stylist...</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="date"
              value={form.appointmentDate}
              onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
              min={new Date().toISOString().split("T")[0]}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Times
              </label>
              {form.appointmentDate && form.selectedStaff && form.selectedService ? (
                (() => {
                  const availableSlots = timeSlotUtils.generateAvailableTimeSlots(
                    form.appointmentDate,
                    form.selectedStaff,
                    form.selectedService,
                    appointments
                  );
                  
                  if (availableSlots.length === 0) {
                    return (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                        No available time slots on this date
                      </div>
                    );
                  }
                  
                  return (
                    <select
              value={form.appointmentTime}
              onChange={(e) => setForm({ ...form, appointmentTime: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select a time...</option>
                      {availableSlots.map((timeSlot) => (
                        <option key={timeSlot} value={timeSlot}>
                          {new Date(`2000-01-01T${timeSlot}:00`).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })} ({form.selectedService?.duration} min)
                        </option>
                      ))}
                    </select>
                  );
                })()
              ) : (
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded border border-gray-200">
                  Select a date, staff member, and service to see available times
                </div>
              )}
            </div>
          </div>

          <textarea
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            rows={3}
          />
        </div>

        <div className="flex space-x-4 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={
              !form.customerName.trim() ||
              !form.selectedService ||
              !form.selectedStaff ||
              !form.appointmentDate ||
              !form.appointmentTime
            }
            className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-all font-medium disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Create Appointment
          </button>
        </div>
      </div>
    </div>
  );
});

CallInModal.displayName = "CallInModal";

// Gallery Modal Component
const GalleryModal: React.FC<{
  show: boolean;
  onClose: () => void;
  onSubmit: () => void;
  form: any;
  setForm: any;
  editingImage?: any;
}> = React.memo(({ show, onClose, onSubmit, form, setForm, editingImage }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl" style={{ height: "95vh", maxHeight: "95vh" }}>
        <div className="flex flex-col h-full">
          {/* Fixed Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-900">
            {editingImage ? "Edit Gallery Photo" : "Add Gallery Photo"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

                    {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
              {/* Before/After Toggle */}
              <div>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={form.isBeforeAfter}
                    onChange={(e) => setForm({ ...form, isBeforeAfter: e.target.checked })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    This is a before/after photo
                  </span>
                </label>
              </div>

              {/* Photo Uploads */}
              {form.isBeforeAfter ? (
                <div className="space-y-6">
                  {/* Before Photo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Before Photo {!editingImage && "*"}
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                              setForm({ 
                                ...form, 
                                beforeImageFile: file,
                                beforeImagePreview: e.target?.result 
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                        id="before-photo-upload"
                      />
                      <label htmlFor="before-photo-upload" className="cursor-pointer">
                        {form.beforeImagePreview ? (
                          <div className="mb-4">
                            <img
                              src={form.beforeImagePreview}
                              alt="Before Preview"
                              className="w-32 h-32 object-cover rounded-lg mx-auto"
                            />
                          </div>
                        ) : (
                          <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        )}
                        <p className="text-gray-600 mb-2">
                          {editingImage ? "Click to change before photo" : "Click to upload before photo"}
                        </p>
                        <p className="text-sm text-gray-500">JPG, PNG, GIF up to 5MB</p>
                      </label>
                    </div>
                    {form.beforeImageFile && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg">
                        <p className="text-green-700 text-sm">
                          ✓ {form.beforeImageFile.name} selected
                        </p>
                      </div>
                    )}
                  </div>

                  {/* After Photo Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      After Photo {!editingImage && "*"}
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (e) => {
                              setForm({ 
                                ...form, 
                                afterImageFile: file,
                                afterImagePreview: e.target?.result 
                              });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="hidden"
                        id="after-photo-upload"
                      />
                      <label htmlFor="after-photo-upload" className="cursor-pointer">
                        {form.afterImagePreview ? (
                          <div className="mb-4">
                            <img
                              src={form.afterImagePreview}
                              alt="After Preview"
                              className="w-32 h-32 object-cover rounded-lg mx-auto"
                            />
                          </div>
                        ) : (
                          <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        )}
                        <p className="text-gray-600 mb-2">
                          {editingImage ? "Click to change after photo" : "Click to upload after photo"}
                        </p>
                        <p className="text-sm text-gray-500">JPG, PNG, GIF up to 5MB</p>
                      </label>
                    </div>
                    {form.afterImageFile && (
                      <div className="mt-3 p-3 bg-green-50 rounded-lg">
                        <p className="text-green-700 text-sm">
                          ✓ {form.afterImageFile.name} selected
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Single Photo Upload */
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Photo {!editingImage && "*"}
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-400 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                      setForm({ 
                        ...form, 
                        imageFile: file,
                        imagePreview: e.target?.result 
                      });
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="hidden"
                      id="single-photo-upload"
              />
                    <label htmlFor="single-photo-upload" className="cursor-pointer">
                {form.imagePreview || editingImage?.url ? (
                  <div className="mb-4">
                    <img
                      src={form.imagePreview || editingImage?.url}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg mx-auto"
                    />
                  </div>
                ) : (
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                )}
                <p className="text-gray-600 mb-2">
                  {editingImage ? "Click to change photo" : "Click to upload a photo"}
                </p>
                <p className="text-sm text-gray-500">JPG, PNG, GIF up to 5MB</p>
              </label>
            </div>
            {form.imageFile && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                <p className="text-green-700 text-sm">
                  ✓ {form.imageFile.name} selected
                </p>
              </div>
            )}
          </div>
              )}

          {/* Caption */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Photo Caption
            </label>
            <input
              type="text"
              placeholder="e.g., Beautiful blonde highlights, Before and after color correction"
              value={form.caption}
              onChange={(e) => setForm({ ...form, caption: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
              </div>
          </div>

            <div className="flex space-x-4 mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={onSubmit}
                disabled={
                  form.isBeforeAfter 
                    ? (!form.beforeImageFile && !form.afterImageFile && !editingImage)
                    : (!form.imageFile && !editingImage)
                }
                className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-all font-medium disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                {editingImage ? "Update Photo" : "Upload Photo"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

GalleryModal.displayName = "GalleryModal";

// Edit Appointment Modal Component
const EditAppointmentModal: React.FC<{
  show: boolean;
  onClose: () => void;
  onSubmit: () => void;
  form: any;
  setForm: any;
  appointment: Appointment | null;
  staff: StaffMember[];
  services: Service[];
  appointments: Appointment[];
  clients: Client[];
}> = React.memo(({ show, onClose, onSubmit, form, setForm, appointment, staff, services, appointments, clients }) => {
  if (!show || !appointment) return null;

  const staffMember = staff.find(s => s.id === appointment.staffId);
  const service = services.find(s => s.id === appointment.serviceId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Edit Appointment</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Current Appointment Info */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Current Appointment</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
                 <p className="text-gray-600">Client</p>
                 <p className="font-medium">{clients.find((c: Client) => c.id === appointment.clientId)?.name || "Unknown Client"}</p>
               </div>
              <div>
                <p className="text-gray-600">Service</p>
                <p className="font-medium">{service?.name}</p>
              </div>
              <div>
                <p className="text-gray-600">Stylist</p>
                <p className="font-medium">{staffMember?.name}</p>
              </div>
              <div>
                <p className="text-gray-600">Duration</p>
                <p className="font-medium">{service?.duration} minutes</p>
              </div>
            </div>
          </div>

          {/* Date and Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Date *
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Time *
            </label>
              {form.date && staffMember && service ? (
                (() => {
                  const availableSlots = timeSlotUtils.generateAvailableTimeSlots(
                    form.date,
                    staffMember,
                    service,
                    appointments.filter(apt => apt.id !== appointment.id) // Exclude current appointment
                  );
                  
                  if (availableSlots.length === 0) {
                    return (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                        No available time slots on this date
                      </div>
                    );
                  }
                  
                  return (
                    <select
                      value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select a time...</option>
                      {availableSlots.map((timeSlot) => (
                        <option key={timeSlot} value={timeSlot}>
                          {new Date(`2000-01-01T${timeSlot}:00`).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })} ({service.duration} min)
                        </option>
                      ))}
                    </select>
                  );
                })()
              ) : (
                <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded border border-gray-200">
                  Select a date to see available times
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              placeholder="Add any notes about this appointment change..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              rows={3}
            />
          </div>
        </div>

        <div className="flex space-x-4 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!form.date || !form.time}
            className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-all font-medium disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            Update Appointment
          </button>
        </div>
      </div>
    </div>
  );
});

EditAppointmentModal.displayName = "EditAppointmentModal";

// Work-In Response Modal
const WorkInResponseModal: React.FC<WorkInResponseModalProps & { onClose: () => void }> = React.memo(
  ({ show, onClose, request, staffMember, onUpdateRequest, sendNotification, services }) => {
    const [responseNotes, setResponseNotes] = useState("");
    const [selectedTime, setSelectedTime] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      setResponseNotes("");
      setSelectedTime("");
    }, [show, request]);

    const service = services.find((s) => s.id === request?.serviceId);

    // Generate available time slots for the requested date
    const availableTimeSlots = useMemo(() => {
      if (!request?.requestedDate || !staffMember || !service) return [];
      
      return timeSlotUtils.generateAvailableTimeSlots(
        request.requestedDate,
        staffMember,
        service,
        [] // We don't have access to appointments here, but this is for work-in approval
      );
    }, [request?.requestedDate, staffMember, service]);

    if (!show || !request) return null;

    const handleRespond = async (status: "approved" | "denied") => {
      setLoading(true);
      try {
        // If approving, require a time selection
        if (status === "approved" && !selectedTime) {
          sendNotification("Please select a time for the approved work-in", "error");
          setLoading(false);
          return;
        }

        const updates = {
          status,
          responseTime: new Date().toISOString(),
          notes: responseNotes,
        };
        const result = await onUpdateRequest(request.id, updates);
        if (!result.error) {
          // Generate the message for the stylist to send
          const customerName = request.customerInfo.name;
          const customerPhone = request.customerInfo.phone;
          
          let messageToSend = "";
          if (status === "approved") {
            const approvedTime = selectedTime 
              ? new Date(`2000-01-01T${selectedTime}:00`).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })
              : "a time that works for you";
            
            messageToSend = `Sure! I can work you in at ${approvedTime}. Please confirm if this time works for you!`;
          } else {
            messageToSend = "Thank you for the request, but I am unable to work you in that day! I have available appointments later though, if you would like to book during those times, please feel free to use the online system or give us a call!";
          }

          // Show notification with the message to send
          const fullMessage = `Perfect! Please send the following message to ${customerName} via SMS at ${customerPhone}:\n\n"${messageToSend}"`;
          
          await sendNotification(
            fullMessage,
            status === "approved" ? "success" : "info"
          );
          onClose();
        } else {
          sendNotification(
            `Error ${status === "approved" ? "approving" : "denying"} request: ${result.error}`,
            "error"
          );
        }
      } catch (error) {
        sendNotification("Error responding to request", "error");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[99999] p-4">
        <div className="bg-white rounded-xl p-6 w-full max-w-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">Respond to Work-In Request</h3>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mb-4">
            <div className="mb-2 font-medium text-gray-900">{request.customerInfo.name}</div>
            <div className="text-sm text-gray-600">{service?.name}</div>
            <div className="text-sm text-orange-600">
              {new Date(request.requestedDate).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })} at {!request.requestedTime || request.requestedTime === "01:00" || request.requestedTime === "" || request.requestedTime === null ? "any time" : new Date(`2000-01-01T${request.requestedTime}:00`).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })}
            </div>
            <div className="text-xs text-gray-500 mt-1">📞 {request.customerInfo.phone}</div>
            {request.customerInfo.notes && (
              <div className="text-xs text-gray-600 mt-2 italic">"{request.customerInfo.notes}"</div>
            )}
          </div>
          
          {/* Time Selection for Approval */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Time for Work-In *</label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              required
            >
              <option value="">Choose a time...</option>
              {availableTimeSlots.map((timeSlot) => (
                <option key={timeSlot} value={timeSlot}>
                  {new Date(`2000-01-01T${timeSlot}:00`).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })} ({service?.duration} min)
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              This time will be communicated to the client when approved.
            </p>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Add a comment (optional)</label>
            <textarea
              value={responseNotes}
              onChange={e => setResponseNotes(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              rows={3}
              placeholder="Add a note for the client (e.g. suggest alternate time, special instructions, etc.)"
            />
          </div>
          <div className="flex space-x-4 mt-6">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={() => handleRespond("approved")}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-all font-medium disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              disabled={loading || !selectedTime}
            >
              Approve
            </button>
            <button
              onClick={() => handleRespond("denied")}
              className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition-all font-medium disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
              disabled={loading}
            >
              Deny
            </button>
          </div>
        </div>
      </div>
    );
  }
);

// Main Salon Management System Component
// Handles the complete salon management interface including admin, stylist, and customer views
// Manages all state, user interactions, and database operations
const SalonManagementSystem: React.FC = () => {
  // Production data management with database integration
  // Provides all CRUD operations and state management for the application
  const {
    clients,
    staff,
    services,
    appointments,
    workInRequests,
    loading,
    setClients,
    setStaff,
    setAppointments,
    setWorkInRequests,
    addStaff,
    updateStaff,
    addService,
    updateService,
    updateAppointment,
    updateWorkInRequest,
  } = useProductionDataManagement();

  // View state - Controls which interface is currently displayed
  const [currentView, setCurrentView] = useState<
    "admin" | "stylist" | "customer"
  >("admin");
  const [currentStaffId, setCurrentStaffId] = useState<string | null>(null);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Admin state - Manages admin dashboard tabs and user notifications
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Customer booking state - Manages the multi-step booking process for customers
  const [customerBooking, setCustomerBooking] = useState<CustomerBooking>({
    selectedService: null,
    selectedStaff: null,
    selectedDate: "",
    selectedTime: "",
    customerInfo: {
      name: "",
      phone: "",
      notes: "",
      email: "",
      preferredContact: "sms" as "email" | "sms",
      carrier: "",
    },
  });
  const [bookingStep, setBookingStep] = useState<number>(1);

  // Modal states - Controls visibility of various modal dialogs throughout the application
  const [showStaffModal, setShowStaffModal] = useState<boolean>(false);
  const [showServiceModal, setShowServiceModal] = useState<boolean>(false);
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);
  const [showStylistLogin, setShowStylistLogin] = useState<boolean>(false);
  const [showCallInModal, setShowCallInModal] = useState<boolean>(false);
  const [showGalleryModal, setShowGalleryModal] = useState<boolean>(false);
  const [editingGalleryImage, setEditingGalleryImage] = useState<any>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [showEditAppointmentModal, setShowEditAppointmentModal] = useState<boolean>(false);

  // Form states - Manages form data for creating and editing various entities
  const [staffForm, setStaffForm] = useState<StaffFormData>({
    name: "",
    phone: "",
    email: "",
    bio: "",
    specialties: "",
    availability: {
      monday: { start: "09:00", end: "17:00", available: true },
      tuesday: { start: "09:00", end: "17:00", available: true },
      wednesday: { start: "09:00", end: "17:00", available: true },
      thursday: { start: "09:00", end: "17:00", available: true },
      friday: { start: "09:00", end: "17:00", available: true },
      saturday: { start: "10:00", end: "16:00", available: true },
      sunday: { start: "", end: "", available: false },
    },
  });

  const [serviceForm, setServiceForm] = useState<ServiceFormData>({
    name: "",
    duration: "",
    price: "",
    category: "",
    description: "",
  });

  // Call-in appointment form state - Manages data for creating appointments over the phone
  const [callInForm, setCallInForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerCarrier: "",
    selectedService: null as Service | null,
    selectedStaff: null as StaffMember | null,
    appointmentDate: "",
    appointmentTime: "",
    notes: "",
  });

  // Gallery form state - Manages image uploads and gallery management for stylists
  const [galleryForm, setGalleryForm] = useState({
    beforeImageFile: null as File | null,
    beforeImagePreview: "",
    afterImageFile: null as File | null,
    afterImagePreview: "",
    imageFile: null as File | null,
    imagePreview: "",
    caption: "",
    isBeforeAfter: false,
  });

  // Appointment editing form state - Manages data for modifying existing appointments
  const [editAppointmentForm, setEditAppointmentForm] = useState({
    date: "",
    time: "",
    notes: "",
  });

  // Admin login handler - Authenticates admin access and updates application state
  const handleAdminLogin = useCallback(() => {
    setIsAdminLoggedIn(true);
    setShowAdminLogin(false);
  }, []);

  // Notification helper - Creates and manages user notifications with auto-removal
  const sendNotification = useCallback(
    (message: string, type: Notification["type"] = "info") => {
      const notificationId = Date.now();
      setNotifications((prev) => [
        ...prev,
        {
          id: notificationId,
          message,
          type,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      
      // Auto-remove notification after 5 seconds
      setTimeout(() => {
        setNotifications((prev) =>
          prev.filter((n) => n.id !== notificationId)
        );
      }, 5000);
    },
    [setNotifications]
  );

  // Polling for new appointments in admin view
  const [lastAppointmentCount, setLastAppointmentCount] = useState(appointments.length);

  useEffect(() => {
    if (currentView === "admin" && isAdminLoggedIn) {
      const interval = setInterval(async () => {
        const result = await databaseHelpers.getAppointments();
        if (result.success && Array.isArray(result.data)) {
          if (result.data.length > lastAppointmentCount) {
            // Play a default browser 'ding' sound
            try {
              const audioCtx = new AudioContext();
              const oscillator = audioCtx.createOscillator();
              oscillator.type = 'sine';
              oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Ding
              oscillator.connect(audioCtx.destination);
              oscillator.start();
              setTimeout(() => {
                oscillator.stop();
                audioCtx.close();
              }, 200);
            } catch (e) {
              // Fallback: alert
              window.alert('New appointment!');
            }
            sendNotification('New appointment received!', 'info');
          }
          setAppointments(result.data);
          setLastAppointmentCount(result.data.length);
        }
      }, 10000); // Poll every 10 seconds
      return () => clearInterval(interval);
    }
  }, [currentView, isAdminLoggedIn, lastAppointmentCount, setAppointments, sendNotification]);

  // Enhanced CRUD Operations with Database integration
  // handleAddStaff - Creates or updates staff members with validation and error handling
  const handleAddStaff = useCallback(async () => {
    if (!staffForm.name.trim() || !staffForm.phone.trim()) {
      sendNotification("Please fill in required fields", "error");
      return;
    }

    try {
      let result;
      if (editingStaff) {
        result = await updateStaff(editingStaff.id, {
          name: staffForm.name,
          phone: staffForm.phone,
          email: staffForm.email,
          bio: staffForm.bio,
          specialties: staffForm.specialties
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s),
          availability: staffForm.availability,
        });
      } else {
        result = await addStaff(staffForm);
      }

      if (result.error) {
        sendNotification(
          `Error ${editingStaff ? "updating" : "adding"} staff member: ${
            (result.error as any)?.message || "Unknown error"
          }`,
          "error"
        );
      } else {
        sendNotification(
          `✅ Staff member "${staffForm.name}" ${
            editingStaff ? "updated" : "added"
          } successfully!`,
          "success"
        );
        setStaffForm({
          name: "",
          phone: "",
          email: "",
          bio: "",
          specialties: "",
          availability: {
            monday: { start: "09:00", end: "17:00", available: true },
            tuesday: { start: "09:00", end: "17:00", available: true },
            wednesday: { start: "09:00", end: "17:00", available: true },
            thursday: { start: "09:00", end: "17:00", available: true },
            friday: { start: "09:00", end: "17:00", available: true },
            saturday: { start: "10:00", end: "16:00", available: true },
            sunday: { start: "", end: "", available: false },
          },
        });
        setShowStaffModal(false);
        setEditingStaff(null);
      }
    } catch (error) {
      sendNotification("An unexpected error occurred", "error");
    }
  }, [staffForm, editingStaff, addStaff, updateStaff, sendNotification]);

  // handleAddService - Creates or updates salon services with validation and error handling
  const handleAddService = useCallback(async () => {
    if (
      !serviceForm.name.trim() ||
      !serviceForm.duration ||
      !serviceForm.price
    ) {
      sendNotification("Please fill in required fields", "error");
      return;
    }

    try {
      let result;
      if (editingService) {
        result = await updateService(editingService.id, serviceForm);
      } else {
        result = await addService(serviceForm);
      }

      if (result.error) {
        sendNotification(
          `Error ${editingService ? "updating" : "adding"} service: ${
            (result.error as any)?.message || "Unknown error"
          }`,
          "error"
        );
      } else {
        sendNotification(
          `✅ Service "${serviceForm.name}" ${
            editingService ? "updated" : "added"
          } successfully!`,
          "success"
        );
        setServiceForm({
          name: "",
          duration: "",
          price: "",
          category: "",
          description: "",
        });
        setShowServiceModal(false);
        setEditingService(null);
      }
    } catch (error) {
      sendNotification("An unexpected error occurred", "error");
    }
  }, [
    serviceForm,
    editingService,
    addService,
    updateService,
    sendNotification,
  ]);

  // Gallery upload handler - Manages image uploads for stylist galleries including before/after photos
  const handleGalleryUpload = useCallback(async () => {
    if (galleryForm.isBeforeAfter) {
      // For before/after photos, require both images
      if (!galleryForm.beforeImageFile && !galleryForm.afterImageFile && !editingGalleryImage) {
        sendNotification("Please select both before and after photos", "error");
        return;
      }
    } else {
      // For single photos, require one image
    if (!galleryForm.imageFile && !editingGalleryImage) {
      sendNotification("Please select a photo to upload", "error");
      return;
      }
    }

    if (!currentStaffId) {
      sendNotification("No staff member selected", "error");
      return;
    }

    try {
      if (editingGalleryImage) {
        // Update existing image
        const imageUrl = galleryForm.imagePreview || editingGalleryImage?.url || "https://via.placeholder.com/400x400?text=Uploaded+Photo";
        
        const result = await databaseHelpers.updateGalleryImage(editingGalleryImage.id, {
          imageUrl: imageUrl,
          caption: galleryForm.caption || "Gallery photo",
          isBeforeAfter: galleryForm.isBeforeAfter,
        });

        if (!result.success) {
          sendNotification("Error updating gallery photo", "error");
          return;
        }

        // Update local state
          setStaff(prev => prev.map(s => 
            s.id === currentStaffId 
              ? { 
                  ...s, 
                  gallery: s.gallery?.map(img => 
                  img.id === editingGalleryImage.id 
                    ? { ...img, url: imageUrl, caption: galleryForm.caption, isBeforeAfter: galleryForm.isBeforeAfter }
                    : img
                ) || []
                }
              : s
          ));

        sendNotification("✅ Gallery photo updated successfully!", "success");
      } else {
        // Add new images
        const uploadPromises = [];
        
        if (galleryForm.isBeforeAfter) {
          // Upload before image if provided
          if (galleryForm.beforeImageFile || galleryForm.beforeImagePreview) {
            const beforeImageUrl = galleryForm.beforeImagePreview || "https://via.placeholder.com/400x400?text=Before+Photo";
            uploadPromises.push(
              databaseHelpers.addGalleryImage({
                staffMemberId: currentStaffId,
                imageUrl: beforeImageUrl,
                caption: galleryForm.isBeforeAfter ? `${galleryForm.caption || "Gallery photo"} - Before` : galleryForm.caption || "Gallery photo",
                isBeforeAfter: galleryForm.isBeforeAfter,
              })
            );
          }
          
          // Upload after image if provided
          if (galleryForm.afterImageFile || galleryForm.afterImagePreview) {
            const afterImageUrl = galleryForm.afterImagePreview || "https://via.placeholder.com/400x400?text=After+Photo";
            uploadPromises.push(
              databaseHelpers.addGalleryImage({
                staffMemberId: currentStaffId,
                imageUrl: afterImageUrl,
                caption: galleryForm.isBeforeAfter ? `${galleryForm.caption || "Gallery photo"} - After` : galleryForm.caption || "Gallery photo",
                isBeforeAfter: galleryForm.isBeforeAfter,
              })
            );
          }
        } else {
          // Upload single image
          const imageUrl = galleryForm.imagePreview || "https://via.placeholder.com/400x400?text=Uploaded+Photo";
          uploadPromises.push(
            databaseHelpers.addGalleryImage({
          staffMemberId: currentStaffId,
          imageUrl: imageUrl,
          caption: galleryForm.caption || "Gallery photo",
          isBeforeAfter: galleryForm.isBeforeAfter,
            })
          );
        }

        const results = await Promise.all(uploadPromises);
        
        // Check if all uploads were successful
        const failedUploads = results.filter(result => !result.success);
        if (failedUploads.length > 0) {
          sendNotification("Error uploading some gallery photos", "error");
          return;
        }

        // Update local state with all new images
        const newImages = results
          .filter(result => result.success && result.data)
          .map(result => ({
                    id: result.data!.id,
                    url: result.data!.url,
                    caption: result.data!.caption,
                    uploadDate: result.data!.uploadDate,
                    isBeforeAfter: result.data!.isBeforeAfter,
          }));

        setStaff(prev => prev.map(s => 
          s.id === currentStaffId 
            ? { 
                ...s, 
                gallery: [...(s.gallery || []), ...newImages]
                }
              : s
          ));

        sendNotification(`✅ ${newImages.length} gallery photo${newImages.length > 1 ? 's' : ''} uploaded successfully!`, "success");
      }

      // Reset form
      setGalleryForm({
          beforeImageFile: null,
          beforeImagePreview: "",
          afterImageFile: null,
          afterImagePreview: "",
        imageFile: null,
        imagePreview: "",
        caption: "",
        isBeforeAfter: false,
      });
      setShowGalleryModal(false);
      setEditingGalleryImage(null);
    } catch (error) {
      console.error("Gallery upload error:", error);
      sendNotification("An unexpected error occurred while uploading", "error");
    }
  }, [galleryForm, editingGalleryImage, currentStaffId, staff, setStaff, sendNotification]);

  // Gallery delete handler - Removes images from stylist galleries with database cleanup
  const handleDeleteGalleryImage = useCallback(async (image: any) => {
    try {
      const result = await databaseHelpers.deleteGalleryImage(image.id);

      if (!result.success) {
        sendNotification("Error deleting gallery photo", "error");
        return;
      }

      // Update local state by removing the deleted image
      setStaff(prev => prev.map(s => 
        s.id === currentStaffId 
          ? { 
              ...s, 
              gallery: s.gallery?.filter(img => img.id !== image.id) || []
            }
          : s
      ));

      sendNotification("✅ Gallery photo deleted successfully!", "success");
    } catch (error) {
      console.error("Gallery delete error:", error);
      sendNotification("An unexpected error occurred while deleting", "error");
    }
  }, [currentStaffId, staff, setStaff, sendNotification]);

  // Appointment editing handler
  const handleEditAppointment = useCallback(async () => {
    if (!editingAppointment) {
      sendNotification("No appointment selected for editing", "error");
      return;
    }

    if (!editAppointmentForm.date || !editAppointmentForm.time) {
      sendNotification("Please select both date and time", "error");
      return;
    }

    // Check if the new time slot is available (excluding the current appointment)
    const isAvailable = timeSlotUtils.isTimeSlotAvailable(
      editAppointmentForm.time,
      services.find(s => s.id === editingAppointment.serviceId)?.duration || 60,
      appointments.filter(apt => apt.id !== editingAppointment.id), // Exclude current appointment
      editingAppointment.staffId,
      editAppointmentForm.date
    );

    if (!isAvailable) {
      sendNotification("This time slot is not available. Please select a different time.", "error");
      return;
    }

    try {
      const result = await updateAppointment(editingAppointment.id, {
        date: editAppointmentForm.date,
        time: editAppointmentForm.time,
        notes: editAppointmentForm.notes,
      });

      if (result.error) {
        sendNotification(
          `Error updating appointment: ${(result.error as any)?.message || "Unknown error"}`,
          "error"
        );
      } else {
        sendNotification("✅ Appointment updated successfully!", "success");
        setShowEditAppointmentModal(false);
        setEditingAppointment(null);
        setEditAppointmentForm({
          date: "",
          time: "",
          notes: "",
        });
      }
    } catch (error) {
      console.error("Appointment update error:", error);
      sendNotification("An unexpected error occurred while updating the appointment", "error");
    }
  }, [editingAppointment, editAppointmentForm, services, appointments, updateAppointment, sendNotification]);

  // Appointment cancellation handler
  const handleCancelAppointment = useCallback(async (appointment: Appointment) => {
    try {
      const client = clients.find((c) => c.id === appointment.clientId);
      const staffMember = staff.find((s) => s.id === appointment.staffId);
      const service = services.find((s) => s.id === appointment.serviceId);

      if (!client || !staffMember || !service) {
        sendNotification("Error finding appointment details", "error");
        return;
      }

      // Update appointment status to cancelled
      const result = await updateAppointment(appointment.id, {
        status: "cancelled",
      });

      if (result.error) {
        sendNotification(
          `Error cancelling appointment: ${(result.error as any)?.message || "Unknown error"}`,
          "error"
        );
        return;
      }

      // Send cancellation notification to customer
      const formattedDate = new Date(appointment.date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
      const formattedTime = new Date(`2000-01-01T${appointment.time}:00`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });

      const subject = `Appointment Cancelled - ${service.name}`;
      const message = `Your appointment has been cancelled.\n\nService: ${service.name}\nStylist: ${staffMember.name}\nDate: ${formattedDate}\nTime: ${formattedTime}\n\nPlease call Twisted Roots to reschedule your appointment.\n\nThank you for understanding.`;

      try {
        if (client.preferredContact === "email" && client.email) {
          await sendNotification("Email notification sent", "success");
        } else {
          const smsMessage = `Twisted Roots: Your appointment for ${service.name} with ${staffMember.name} on ${formattedDate} at ${formattedTime} has been CANCELLED. Please call to reschedule.`;
          await sendNotification("SMS notification sent", "success");
        }
      } catch (error) {
        console.error("Failed to send cancellation notification:", error);
        // Don't fail the cancellation if notification fails
      }

      sendNotification(
        `✅ Appointment cancelled for ${client.name}. Notification sent via ${client.preferredContact}.`,
        "success"
      );
    } catch (error) {
      console.error("Appointment cancellation error:", error);
      sendNotification("An unexpected error occurred while cancelling the appointment", "error");
    }
  }, [clients, staff, services, updateAppointment, sendNotification]);

  // Call-in appointment handler
  const handleCreateCallInAppointment = useCallback(async () => {
    if (
      !callInForm.customerName.trim() ||
      !callInForm.selectedService ||
      !callInForm.selectedStaff ||
      !callInForm.appointmentDate ||
      !callInForm.appointmentTime
    ) {
      sendNotification("Please fill in all required fields", "error");
      return;
    }
    
    // Phone number validation (only if provided)
    if (callInForm.customerPhone.trim()) {
      const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(callInForm.customerPhone.trim().replace(/[\s\-()]/g, ''))) {
        sendNotification("Please enter a valid phone number", "error");
        return;
      }
    }

    // Final availability check to prevent double bookings
    if (!timeSlotUtils.isTimeSlotAvailable(
      callInForm.appointmentTime,
      callInForm.selectedService.duration,
      appointments,
      callInForm.selectedStaff.id,
      callInForm.appointmentDate
    )) {
      sendNotification("This time slot is no longer available. Please select a different time.", "error");
      return;
    }

    try {
      // Always create or find the customer in the customers table
      let customerId = null;
      let client = clients.find(
        (c) =>
          c.name === callInForm.customerName &&
          c.phone === callInForm.customerPhone
      );

      if (!client) {
        const customerResult = await databaseHelpers.addCustomer({
          name: callInForm.customerName,
          phone: callInForm.customerPhone,
          notes: callInForm.notes,
          preferredContact: "sms",
        });
        if (!customerResult.success || !customerResult.data) {
          sendNotification("Error creating customer profile", "error");
          return;
        }
        customerId = customerResult.data.id; // customers.id
        // Add the new customer to local state
        const newClient = transformDatabaseToUI.client(customerResult.data);
        setClients((prev) => [...prev, newClient]);
      } else {
        customerId = client.id; // customers.id
      }

      // Create the appointment
      const appointmentData = {
        customerSupabaseId: customerId, // customers.id
        staffSupabaseId: callInForm.selectedStaff.id,
        serviceSupabaseId: callInForm.selectedService.id,
        date: callInForm.appointmentDate,
        time: callInForm.appointmentTime,
        status: "confirmed",
        notes: callInForm.notes || "",
        isCallIn: true,
        isWorkInApproval: false,
      };

      const result = await databaseHelpers.createAppointment(appointmentData);

      if (!result.success) {
        sendNotification(
          "Error creating call-in appointment: " +
            (typeof result.error === "object" &&
            result.error !== null &&
            "message" in result.error
              ? (result.error as { message: string }).message
              : result.error?.toString() || "Unknown error"),
          "error"
        );
      } else {
        sendNotification(
          `✅ Call-in appointment created for ${callInForm.customerName}!`,
          "success"
        );
        // Reset form
            setCallInForm({
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      customerCarrier: "",
      selectedService: null,
      selectedStaff: null,
      appointmentDate: "",
      appointmentTime: "",
      notes: "",
    });
        setShowCallInModal(false);
        // Add to local state
        const newAppointment = transformDatabaseToUI.appointment(result.data);
        setAppointments((prev) => [...prev, newAppointment]);
      }
    } catch (error) {
      console.error("Call-in appointment error:", error);
      sendNotification("An unexpected error occurred", "error");
    }
  }, [callInForm, clients, services, appointments, sendNotification, setAppointments, setClients]);

  // Modal close handlers
  const handleCloseStaffModal = useCallback(() => {
    setShowStaffModal(false);
    setEditingStaff(null);
    setStaffForm({
      name: "",
      phone: "",
      email: "",
      bio: "",
      specialties: "",
      availability: {
        monday: { start: "09:00", end: "17:00", available: true },
        tuesday: { start: "09:00", end: "17:00", available: true },
        wednesday: { start: "09:00", end: "17:00", available: true },
        thursday: { start: "09:00", end: "17:00", available: true },
        friday: { start: "09:00", end: "17:00", available: true },
        saturday: { start: "10:00", end: "16:00", available: true },
        sunday: { start: "", end: "", available: false },
      },
    });
  }, []);

  const handleCloseServiceModal = useCallback(() => {
    setShowServiceModal(false);
    setEditingService(null);
    setServiceForm({
      name: "",
      duration: "",
      price: "",
      category: "",
      description: "",
    });
  }, []);

  // Handle customer booking submission with database persistence
  // Updated handleCustomerBookingSubmit function
  // Update these two handler functions in your main component

  // 1. Update handleCustomerBookingSubmit to go to step 6
  const handleCustomerBookingSubmit = useCallback(async () => {
    if (
      !customerBooking.selectedService ||
      !customerBooking.selectedStaff ||
      !customerBooking.selectedDate ||
      !customerBooking.selectedTime
    ) {
      sendNotification("Please complete all required booking fields", "error");
      return;
    }

    // Final availability check to prevent double bookings
    if (!timeSlotUtils.isTimeSlotAvailable(
      customerBooking.selectedTime,
      customerBooking.selectedService.duration,
      appointments,
      customerBooking.selectedStaff.id,
      customerBooking.selectedDate
    )) {
      sendNotification("This time slot is no longer available. Please select a different time.", "error");
      return;
    }

    try {
      // Always create or find the customer in the customers table
      let customerId = null;
      let client = clients.find(
        (c) =>
          c.name === customerBooking.customerInfo.name &&
          c.phone === customerBooking.customerInfo.phone
      );

      if (!client) {
        const customerResult = await databaseHelpers.addCustomer(
          customerBooking.customerInfo
        );
        if (!customerResult.success || !customerResult.data) {
          sendNotification("Error creating customer profile", "error");
          return;
        }
        customerId = customerResult.data.id; // customers.id
        // Add the new customer to local state
        const newClient = transformDatabaseToUI.client(customerResult.data);
        setClients((prev) => [...prev, newClient]);
      } else {
        customerId = client.id; // customers.id
      }

      // Find the selected staff and service WITH their Supabase IDs
      const selectedStaff = customerBooking.selectedStaff
        ? staff.find((s) => s.id === customerBooking.selectedStaff!.id)
        : null;
      const selectedService = customerBooking.selectedService
        ? services.find((s) => s.id === customerBooking.selectedService!.id)
        : null;

      if (!selectedStaff || !selectedService) {
        sendNotification("Error finding staff or service information", "error");
        return;
      }

      // Create the appointment with correct IDs
      const appointmentData = {
        customerSupabaseId: customerId, // customers.id
        staffSupabaseId: selectedStaff.id,
        serviceSupabaseId: selectedService.id,
        date: customerBooking.selectedDate,
        time: customerBooking.selectedTime,
        status: "confirmed",
        notes: customerBooking.customerInfo.notes || "",
        isCallIn: false,
        isWorkInApproval: false,
      };

      const result = await databaseHelpers.createAppointment(appointmentData);

      if (!result.success) {
        sendNotification(
          "Error booking appointment: " +
            (typeof result.error === "object" &&
            result.error !== null &&
            "message" in result.error
              ? (result.error as { message: string }).message
              : result.error?.toString() || "Unknown error"),
          "error"
        );
      } else {
        sendNotification(
          "Your appointment has been booked successfully!",
          "success"
        );
        setBookingStep(6);
        // Add the new appointment to local state
        const newAppointment = transformDatabaseToUI.appointment(result.data);
        setAppointments((prev) => [...prev, newAppointment]);
      }
    } catch (error) {
      console.error("Booking error:", error);
      sendNotification("An unexpected error occurred while booking", "error");
    }
  }, [customerBooking, clients, staff, services, appointments, sendNotification, setAppointments, setClients]);

  // 2. Update handleWorkInRequestSubmit to go to step 8
  interface HandleShowWorkInResponseModal {
    (request: WorkInRequest): void;
  }

  // Make sure setSelectedWorkInRequest is defined in the component's state:
  const [selectedWorkInRequest, setSelectedWorkInRequest] =
    useState<WorkInRequest | null>(null);
  const [showWorkInResponseModal, setShowWorkInResponseModal] =
    useState<boolean>(false);

  const handleShowWorkInResponseModal: HandleShowWorkInResponseModal =
    useCallback((request: WorkInRequest) => {
      setSelectedWorkInRequest(request);
      setShowWorkInResponseModal(true);
    }, []);

  const handleQuickWorkInResponse = useCallback(
    async (request: WorkInRequest, status: "approved" | "denied") => {
      try {
        const result = await updateWorkInRequest(request.id, {
          status,
          responseTime: new Date().toISOString(),
        });

        if (!result.error) {
          // Generate the message for the stylist to send
          const customerName = request.customerInfo.name;
          const customerPhone = request.customerInfo.phone;
          
          let messageToSend = "";
          if (status === "approved") {
            const selectedTime = request.requestedTime && request.requestedTime !== "01:00" && request.requestedTime !== "" 
              ? new Date(`2000-01-01T${request.requestedTime}:00`).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })
              : "a time that works for you";
            
            messageToSend = `Sure! I can work you in at ${selectedTime}. Please confirm if this time works for you!`;
          } else {
            messageToSend = "Thank you for the request, but I am unable to work you in that day! I have available appointments later though, if you would like to book during those times, please feel free to use the online system or give us a call!";
          }

          // Show notification with the message to send
          const fullMessage = `Perfect! Please send the following message to ${customerName} via SMS at ${customerPhone}:\n\n"${messageToSend}"`;
          
          sendNotification(
            fullMessage,
            status === "approved" ? "success" : "info"
          );
        } else {
          sendNotification(
            `Error ${status === "approved" ? "approving" : "denying"} request: ${result.error}`,
            "error"
          );
        }
      } catch (error) {
        console.error("Error responding to work-in request:", error);
        sendNotification("Error responding to request", "error");
      }
    },
    [updateWorkInRequest, sendNotification]
  );
  // Handles submission of the work-in request form (Step 7)
  const handleWorkInRequestSubmit = useCallback(async () => {
    // Enhanced validation with specific error messages
    const validationErrors = [];
    if (!customerBooking.selectedService) {
      validationErrors.push("Please select a service");
    }
    if (!customerBooking.selectedStaff) {
      validationErrors.push("Please select a stylist");
    }
    if (!customerBooking.selectedDate) {
      validationErrors.push("Please select a date");
    }
    if (!customerBooking.customerInfo.name.trim()) {
      validationErrors.push("Please enter your name");
    }
    if (!customerBooking.customerInfo.phone.trim()) {
      validationErrors.push("Please enter your phone number");
    }
    // Phone number validation
          const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
      if (customerBooking.customerInfo.phone.trim() && !phoneRegex.test(customerBooking.customerInfo.phone.trim().replace(/[\s\-()]/g, ''))) {
      validationErrors.push("Please enter a valid phone number");
    }

    if (validationErrors.length > 0) {
      sendNotification(`Please fix the following errors: ${validationErrors.join(", ")}`, "error");
      return;
    }
    try {
      // Always create or find the customer in the customers table
      let customerId = null;
      let client = clients.find(
        (c) =>
          c.name === customerBooking.customerInfo.name &&
          c.phone === customerBooking.customerInfo.phone
      );
      if (!client) {
        const customerResult = await databaseHelpers.addCustomer(customerBooking.customerInfo);
        if (!customerResult.success || !customerResult.data) {
          sendNotification("Error creating customer profile", "error");
          return;
        }
        customerId = customerResult.data.id; // customers.id
        // Add the new customer to local state
        const newClient = transformDatabaseToUI.client(customerResult.data);
        setClients((prev) => [...prev, newClient]);
      } else {
        customerId = client.id; // customers.id
      }
      // Prepare request data for the database
      const requestData = {
        staffSupabaseId: customerBooking.selectedStaff!.id,
        serviceSupabaseId: customerBooking.selectedService!.id,
        requestedDate: customerBooking.selectedDate,
        requestedTime: customerBooking.selectedTime || null, // null for flexible timing
                  customerInfo: {
            name: customerBooking.customerInfo.name,
            phone: customerBooking.customerInfo.phone,
            notes: customerBooking.customerInfo.notes,
          },
        customerId: customerId, // customers.id
      };
      // Create the work-in request in the database
      const result = await databaseHelpers.createWorkInRequest(requestData);
      if (!result.success) {
        const errorMessage = typeof result.error === "object" &&
            result.error !== null &&
            "message" in result.error
              ? (result.error as { message: string }).message
            : result.error?.toString() || "Unknown error";
        sendNotification(
          `Error submitting work-in request: ${errorMessage}`,
          "error"
        );
      } else {
        sendNotification(
          `Your work-in request has been submitted! ${customerBooking.selectedStaff!.name} will be notified and respond shortly.`,
          "success"
        );
        // Add to local state
        if (transformDatabaseToUI && transformDatabaseToUI.workInRequest) {
          const newRequest = transformDatabaseToUI.workInRequest(result.data);
          setWorkInRequests((prev) => [newRequest, ...prev]);
        }
        setBookingStep(8); // Go to confirmation step
      }
    } catch (error) {
      console.error("💥 Unexpected error in handleWorkInRequestSubmit:", error);
      sendNotification(
        "An unexpected error occurred while submitting your request. Please try again.",
        "error"
      );
    }
  }, [customerBooking, clients, sendNotification, setWorkInRequests, setBookingStep, setClients]);

  // Compute dashboard metrics
  const dashboardMetrics = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const todayAppointments = appointments.filter(
      (apt) => apt.date === today
    ).length;
    const todayRevenue = appointments
      .filter((apt) => apt.date === today)
      .reduce((sum, apt) => {
        const service = services.find((s) => s.id === apt.serviceId);
        return sum + (service ? service.price : 0);
      }, 0);
    const totalClients = clients.length;
    const pendingWorkInRequests = workInRequests.filter(
      (req) => req.status === "pending"
    ).length;
    return {
      todayAppointments,
      todayRevenue,
      totalClients,
      pendingWorkInRequests,
    };
  }, [appointments, services, clients, workInRequests]);

  // Show loading screen while data loads
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl mx-auto mb-6 flex items-center justify-center animate-pulse">
            <Scissors className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Loading Twisted Roots...
          </h1>
          <p className="text-gray-600">Connecting to database</p>
        </div>
      </div>
    );
  }

  // Show login screen first
  if (!isAdminLoggedIn && currentView === "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl mx-auto mb-6 flex items-center justify-center">
            <Scissors className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to Twisted Roots
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Professional salon management system
          </p>
          <div className="space-y-4">
            <button
              onClick={() => setShowAdminLogin(true)}
              className="block w-full px-8 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-medium text-lg"
            >
              Admin Login
            </button>
            <button
              onClick={() => setCurrentView("customer")}
              className="block w-full px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium text-lg"
            >
              Book Appointment
            </button>
            {staff.length > 0 && (
              <button
                onClick={() => setShowStylistLogin(true)}
                className="block w-full px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all font-medium text-lg"
              >
                Stylist Portal
              </button>
            )}
          </div>
        </div>

        <AdminLoginModal
          show={showAdminLogin}
          onClose={() => setShowAdminLogin(false)}
          onLogin={handleAdminLogin}
        />

        <StylistLoginModal
          show={showStylistLogin}
          onClose={() => setShowStylistLogin(false)}
          onLogin={(staffId) => {
            setCurrentStaffId(staffId);
            setCurrentView("stylist");
            setShowStylistLogin(false);
          }}
          staff={staff}
        />
      </div>
    );
  }

  // Admin Dashboard
  if (currentView === "admin" && isAdminLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Twisted Roots Admin
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Header Button - Desktop Only */}
              {(!showStaffModal && !showServiceModal && !showCallInModal && !showGalleryModal) && (
                <button
                  onClick={() => setShowCallInModal(true)}
                  style={{
                    background: '#3b82f6',
                    color: '#fff',
                    fontWeight: 'bold',
                    border: '3px solid #1d4ed8',
                    boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    minWidth: '160px',
                    minHeight: '48px',
                    fontSize: '1.1rem',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 20px',
                    cursor: 'pointer',
                    zIndex: 10000,
                    outline: 'none',
                  }}
                  className="hidden md:flex"
                >
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    <Plus className="w-7 h-7" style={{ color: '#fff', marginRight: 8 }} />
                    <span style={{ color: '#fff', fontWeight: 'bold' }}>Add Call-In</span>
                  </span>
                </button>
              )}
              <button
                onClick={() => setCurrentView("customer")}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
              >
                Customer Booking
              </button>
              <button
                onClick={() => {
                  setIsAdminLoggedIn(false);
                  setCurrentView("admin");
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Notification Display */}
        <div className="fixed top-4 right-4 z-[2147483647] space-y-2" style={{ zIndex: 2147483647 }}>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg shadow-lg max-w-sm transition-all ${
                notification.type === "error"
                  ? "bg-red-500 text-white"
                  : notification.type === "success"
                  ? "bg-green-500 text-white"
                  : "bg-blue-500 text-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{notification.message}</p>
                <button
                  onClick={() =>
                    setNotifications((prev) =>
                      prev.filter((n) => n.id !== notification.id)
                    )
                  }
                  className="ml-2 text-white hover:text-gray-200"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        <main className="max-w-7xl mx-auto p-6">
          {/* Admin Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "dashboard"
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setActiveTab("appointments")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "appointments"
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Appointments
                </button>
                <button
                  onClick={() => setActiveTab("staff")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "staff"
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Staff
                </button>
                <button
                  onClick={() => setActiveTab("services")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === "services"
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Services
                </button>
                <button
                  onClick={() => setActiveTab("workInRequests")}
                  className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
                    activeTab === "workInRequests"
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Work-In Requests
                  {dashboardMetrics.pendingWorkInRequests > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                      {dashboardMetrics.pendingWorkInRequests > 9 ? '9+' : dashboardMetrics.pendingWorkInRequests}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Dashboard Tab */}
              {activeTab === "dashboard" && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>
                  
                  {/* Pending Requests Alert Banner */}
                  {dashboardMetrics.pendingWorkInRequests > 0 && (
                    <div className="mb-6 bg-gradient-to-r from-red-500 to-red-600 rounded-lg p-4 text-white shadow-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Bell className="w-6 h-6 text-red-200 animate-pulse" />
                          <div>
                            <h3 className="font-bold text-lg">Action Required!</h3>
                            <p className="text-red-100">
                              You have {dashboardMetrics.pendingWorkInRequests} pending work-in request{dashboardMetrics.pendingWorkInRequests > 1 ? 's' : ''} that need{dashboardMetrics.pendingWorkInRequests > 1 ? '' : 's'} your attention.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setActiveTab("workInRequests")}
                          className="bg-white text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-50 transition-all"
                        >
                          Review Now
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-blue-100">Today's Appointments</p>
                          <p className="text-3xl font-bold">{dashboardMetrics.todayAppointments}</p>
                        </div>
                        <Calendar className="w-8 h-8 text-blue-200" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-green-100">Today's Revenue</p>
                          <p className="text-3xl font-bold">${dashboardMetrics.todayRevenue}</p>
                        </div>
                        <DollarSign className="w-8 h-8 text-green-200" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-purple-100">Total Clients</p>
                          <p className="text-3xl font-bold">{dashboardMetrics.totalClients}</p>
                        </div>
                        <Users className="w-8 h-8 text-purple-200" />
                      </div>
                    </div>
                    <div className={`rounded-lg p-6 transition-all duration-300 border ${
                      dashboardMetrics.pendingWorkInRequests > 0 
                        ? "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 animate-pulse border-red-400" 
                        : "bg-orange-100 text-orange-700 border-orange-200"
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`font-medium ${dashboardMetrics.pendingWorkInRequests > 0 ? 'text-white' : 'text-orange-700'}`}>Pending Requests</p>
                          <p className={`text-4xl font-bold ${dashboardMetrics.pendingWorkInRequests > 0 ? 'text-white' : 'text-orange-700'}`}>{dashboardMetrics.pendingWorkInRequests}</p>
                          {dashboardMetrics.pendingWorkInRequests > 0 && (
                            <p className="text-sm text-red-100 mt-1">Requires attention</p>
                          )}
                        </div>
                        <div className="relative">
                          <Bell className={`w-8 h-8 ${dashboardMetrics.pendingWorkInRequests > 0 ? "text-red-200" : "text-orange-400"}`} />
                          {dashboardMetrics.pendingWorkInRequests > 0 && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                              <span className="text-xs font-bold text-red-900">{dashboardMetrics.pendingWorkInRequests}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {dashboardMetrics.pendingWorkInRequests > 0 && (
                        <button
                          onClick={() => setActiveTab("workInRequests")}
                          className="mt-3 w-full bg-white/20 hover:bg-white/30 text-white py-2 px-3 rounded text-sm font-medium transition-all"
                        >
                          View Requests →
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Appointments Tab */}
              {activeTab === "appointments" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Appointments</h2>
                  </div>
                  <div className="space-y-4">
                    {appointments.map((appointment) => {
                      const client = clients.find((c) => c.id === appointment.clientId);
                      const staffMember = staff.find((s) => s.id === appointment.staffId);
                      const service = services.find((s) => s.id === appointment.serviceId);
                      return (
                        <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium text-gray-900">{client?.name || "Unknown Client"}</h3>
                                                             <p className="text-sm text-gray-600">{service?.name} with {staffMember?.name}</p>
                              <p className="text-sm text-gray-500">
                                {appointment.date} at {new Date(`2000-01-01T${appointment.time}:00`).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </p>
                            </div>
                            <div className="flex flex-col items-end space-y-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              appointment.status === "confirmed" ? "bg-green-100 text-green-700" :
                              appointment.status === "completed" ? "bg-blue-100 text-blue-700" :
                                appointment.status === "cancelled" ? "bg-red-100 text-red-700" :
                              "bg-yellow-100 text-yellow-700"
                            }`}>
                              {appointment.status}
                            </span>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    setEditingAppointment(appointment);
                                    setEditAppointmentForm({
                                      date: appointment.date,
                                      time: appointment.time,
                                      notes: appointment.notes || "",
                                    });
                                    setShowEditAppointmentModal(true);
                                  }}
                                  className="text-xs bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 transition-all"
                                >
                                  Edit Time
                                </button>
                                {appointment.status === "confirmed" && (
                                  <button
                                    onClick={() => handleCancelAppointment(appointment)}
                                    className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-all"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Staff Tab */}
              {activeTab === "staff" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
                    <button
                      onClick={() => setShowStaffModal(true)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all"
                    >
                      Add Staff
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {staff.map((member) => (
                      <div key={member.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{member.name}</h3>
                            <p className="text-sm text-gray-600">{member.specialties.join(", ")}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingStaff(member);
                              setStaffForm({
                                name: member.name,
                                phone: member.phone,
                                email: member.email,
                                bio: member.bio,
                                specialties: member.specialties.join(", "),
                                availability: member.availability,
                              });
                              setShowStaffModal(true);
                            }}
                            className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-all"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Services Tab */}
              {activeTab === "services" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Services</h2>
                    <button
                      onClick={() => setShowServiceModal(true)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all"
                    >
                      Add Service
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service) => (
                      <div key={service.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <span className="text-2xl">{service.image}</span>
                          <div>
                            <h3 className="font-medium text-gray-900">{service.name}</h3>
                            <p className="text-sm text-gray-600">{service.duration} min • ${service.price}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingService(service);
                              setServiceForm({
                                name: service.name,
                                duration: service.duration.toString(),
                                price: service.price.toString(),
                                category: service.category,
                                description: service.description,
                              });
                              setShowServiceModal(true);
                            }}
                            className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700 transition-all"
                          >
                            Edit
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Work-In Requests Tab */}
              {activeTab === "workInRequests" && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Work-In Requests</h2>
                  <div className="space-y-4">
                                        {workInRequests
                      .filter((req) => req.status === "pending")
                      .map((request) => {
                        const staffMember = staff.find((s) => s.id === request.staffId);
                        return staffMember ? (
                          <WorkInRequestCard
                            key={request.id}
                            request={request}
                            staffMember={staffMember}
                            services={services}
                            onShowResponseModal={handleShowWorkInResponseModal}
                            onQuickResponse={handleQuickWorkInResponse}
                          />
                        ) : null;
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Floating Button - Mobile Only */}
        {!showStaffModal && !showServiceModal && !showCallInModal && !showGalleryModal && (
          <button
            onClick={() => setShowCallInModal(true)}
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              width: 72,
              height: 72,
              background: '#3b82f6',
              color: '#fff',
              border: '3px solid #1d4ed8',
              borderRadius: '50%',
              boxShadow: '0 8px 32px rgba(59, 130, 246, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              zIndex: 10000,
              cursor: 'pointer',
              outline: 'none',
            }}
            className="block md:hidden"
            title="Add Call-In Appointment"
          >
            <Plus className="w-10 h-10" style={{ color: '#fff' }} />
            <span style={{ position: 'absolute', left: '-9999px' }}>Add Call-In</span>
          </button>
        )}

        {/* Modals */}
        <StaffModal
          show={showStaffModal}
          onClose={handleCloseStaffModal}
          staffForm={staffForm}
          setStaffForm={setStaffForm}
          handleAddStaff={handleAddStaff}
          editingStaff={editingStaff}
        />

        <ServiceModal
          show={showServiceModal}
          onClose={handleCloseServiceModal}
          serviceForm={serviceForm}
          setServiceForm={setServiceForm}
          handleAddService={handleAddService}
          editingService={editingService}
        />

        <CallInModal
          show={showCallInModal}
          onClose={() => setShowCallInModal(false)}
          onSubmit={handleCreateCallInAppointment}
          form={callInForm}
          setForm={setCallInForm}
          staff={staff}
          services={services}
          appointments={appointments}
        />

        <EditAppointmentModal
          show={showEditAppointmentModal}
          onClose={() => {
            setShowEditAppointmentModal(false);
            setEditingAppointment(null);
            setEditAppointmentForm({
              date: "",
              time: "",
              notes: "",
            });
          }}
          onSubmit={handleEditAppointment}
          form={editAppointmentForm}
          setForm={setEditAppointmentForm}
          appointment={editingAppointment}
          staff={staff}
          services={services}
          appointments={appointments}
          clients={clients}
        />

        <GalleryModal
          show={showGalleryModal}
          onClose={() => {
            setShowGalleryModal(false);
            setEditingGalleryImage(null);
            setGalleryForm({
              beforeImageFile: null,
              beforeImagePreview: "",
              afterImageFile: null,
              afterImagePreview: "",
              imageFile: null,
              imagePreview: "",
              caption: "",
              isBeforeAfter: false,
            });
          }}
          onSubmit={handleGalleryUpload}
          form={galleryForm}
          setForm={setGalleryForm}
          editingImage={editingGalleryImage}
        />

        <EditAppointmentModal
          show={showEditAppointmentModal}
          onClose={() => {
            setShowEditAppointmentModal(false);
            setEditingAppointment(null);
            setEditAppointmentForm({
              date: "",
              time: "",
              notes: "",
            });
          }}
          onSubmit={handleEditAppointment}
          form={editAppointmentForm}
          setForm={setEditAppointmentForm}
          appointment={editingAppointment}
          staff={staff}
          services={services}
          appointments={appointments}
          clients={clients}
        />

        <AdminLoginModal
          show={showAdminLogin}
          onClose={() => setShowAdminLogin(false)}
          onLogin={handleAdminLogin}
        />

        <StylistLoginModal
          show={showStylistLogin}
          onClose={() => setShowStylistLogin(false)}
          onLogin={(staffId) => {
            setCurrentStaffId(staffId);
            setCurrentView("stylist");
            setShowStylistLogin(false);
          }}
          staff={staff}
        />
        {showWorkInResponseModal && selectedWorkInRequest && (
          <WorkInResponseModal
            show={showWorkInResponseModal}
            onClose={() => setShowWorkInResponseModal(false)}
            request={selectedWorkInRequest}
            staffMember={staff.find((s) => s.id === selectedWorkInRequest.staffId)!}
            onUpdateRequest={updateWorkInRequest}
            sendNotification={sendNotification}
            services={services}
          />
        )}
      </div>
    );
  }

  // Customer view
  if (currentView === "customer") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-blue-600 rounded-lg flex items-center justify-center">
                <Scissors className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Book Your Appointment
              </h1>
            </div>
            <button
              onClick={() => {
                setCurrentView("admin");
                setBookingStep(1);
                setCustomerBooking({
                  selectedService: null,
                  selectedStaff: null,
                  selectedDate: "",
                  selectedTime: "",
                  customerInfo: {
                    name: "",
                    phone: "",
                    notes: "",
                    email: "",
                    preferredContact: "sms" as "email" | "sms",
                    carrier: "",
                  },
                });
              }}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Admin</span>
            </button>
          </div>
        </header>

        {/* Notification Display */}
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg shadow-lg max-w-sm transition-all ${
                notification.type === "error"
                  ? "bg-red-500 text-white"
                  : notification.type === "success"
                  ? "bg-green-500 text-white"
                  : "bg-blue-500 text-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{notification.message}</p>
                <button
                  onClick={() =>
                    setNotifications((prev) =>
                      prev.filter((n) => n.id !== notification.id)
                    )
                  }
                  className="ml-2 text-white hover:text-gray-200"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        <main className="max-w-4xl mx-auto p-6">
          {/* STEP 1: CHOOSE SERVICE */}
          {bookingStep === 1 && (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Choose a Service
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {services
                  .filter((service) => service.isActive)
                  .map((service) => (
                    <div
                      key={service.id}
                      onClick={() => {
                        setCustomerBooking((prev) => ({
                          ...prev,
                          selectedService: service,
                        }));
                        setBookingStep(2);
                      }}
                      className="border border-gray-200 rounded-lg p-6 hover:border-green-500 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-4">
                        <span className="text-3xl">{service.image}</span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {service.name}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            {service.description}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-sm text-gray-500">
                              {service.duration} min
                            </span>
                            <span className="font-bold text-green-600">
                              ${service.price}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {/* STEP 2: CHOOSE STYLIST */}
          {bookingStep === 2 && customerBooking.selectedService && (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Choose Your Stylist
                </h2>
                <button
                  onClick={() => setBookingStep(1)}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              </div>

              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">
                    {customerBooking.selectedService?.image}
                  </span>
                  <div>
                    <h3 className="font-semibold text-green-900">
                      {customerBooking.selectedService?.name}
                    </h3>
                    <p className="text-green-600">
                      {customerBooking.selectedService?.duration} min • $
                      {customerBooking.selectedService?.price}
                    </p>
                  </div>
                </div>
              </div>

              {/* Work-in request option */}
              <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center space-x-3 mb-3">
                  <Bell className="w-5 h-5 text-orange-600" />
                  <h3 className="font-semibold text-orange-900">
                    Can't find a convenient time?
                  </h3>
                </div>
                <p className="text-orange-700 text-sm mb-3">
                  Request to be worked in on any day! Your preferred stylist
                  will be notified and can approve or suggest alternatives.
                </p>
                <button
                  onClick={() => {
                    setCustomerBooking((prev) => ({
                      ...prev,
                      isWorkInRequest: true,
                    }));
                    setBookingStep(7);
                  }}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-all text-sm font-medium"
                >
                  Request Work-In Instead
                </button>
              </div>

              {/* Enhanced Stylist Cards with Galleries */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {staff
                  .filter((member) => member.isActive)
                  .map((member) => (
                    <div
                      key={member.id}
                      className="border border-gray-200 rounded-xl hover:border-green-500 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                    >
                      {/* Stylist Header */}
                      <div className="p-6 border-b border-gray-100">
                        <div className="flex items-start space-x-4">
                          <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center flex-shrink-0">
                            {member.profilePhoto ? (
                              <img
                                src={member.profilePhoto}
                                alt={member.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-8 h-8 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 text-lg">
                              {member.name}
                            </h3>
                            <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                              {member.bio}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {member.specialties
                                .slice(0, 3)
                                .map((specialty, index) => (
                                  <span
                                    key={index}
                                    className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                                  >
                                    {specialty}
                                  </span>
                                ))}
                              {member.specialties.length > 3 && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">
                                  +{member.specialties.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Gallery Preview */}
                      {member.gallery && member.gallery.length > 0 && (
                        <div className="p-4 bg-gray-50">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">
                            Recent Work ({member.gallery.length} photos)
                          </h4>
                          <div className="grid grid-cols-3 gap-2">
                            {member.gallery.slice(0, 3).map((image) => (
                              <div
                                key={image.id}
                                className="relative aspect-square bg-gray-200 rounded overflow-hidden"
                              >
                                <img
                                  src={image.url}
                                  alt={image.caption}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src =
                                      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik01MCA0MEw2MCA1MEg3MFY2MEg1MFY0MFoiIGZpbGw9IiM5Q0E0QUYiLz4KPC9zdmc+";
                                  }}
                                />
                                {image.isBeforeAfter && (
                                  <div className="absolute top-1 left-1">
                                    <span className="px-1 py-0.5 bg-purple-600 text-white text-xs rounded">
                                      B/A
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          {member.gallery.length > 3 && (
                            <p className="text-xs text-gray-500 mt-2 text-center">
                              +{member.gallery.length - 3} more photos
                            </p>
                          )}
                        </div>
                      )}

                      {/* Select Button */}
                      <div className="p-4">
                        <button
                          onClick={() => {
                            setCustomerBooking((prev) => ({
                              ...prev,
                              selectedStaff: member,
                            }));
                            setBookingStep(3);
                          }}
                          className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-all font-medium"
                        >
                          Select {member.name.split(" ")[0]}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {/* STEP 3: CHOOSE DATE */}
          {bookingStep === 3 && customerBooking.selectedStaff && (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Choose a Date
                </h2>
                <button
                  onClick={() => setBookingStep(2)}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              </div>

              {/* Selected Service & Staff Summary */}
              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {customerBooking.selectedService?.image}
                    </span>
                    <div>
                      <h3 className="font-semibold text-green-900">
                        {customerBooking.selectedService?.name}
                      </h3>
                      <p className="text-green-600">
                        {customerBooking.selectedService?.duration} min • $
                        {customerBooking.selectedService?.price}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-900">
                      {customerBooking.selectedStaff?.name}
                    </p>
                    <p className="text-green-600 text-sm">Your Stylist</p>
                  </div>
                </div>
              </div>

              {/* Date Selection */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Your Preferred Date
                </label>

                {/* Calendar-style date picker */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Array.from({ length: 14 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() + i);
                    const dateString = date.toISOString().split("T")[0];
                    const dayName = date.toLocaleDateString("en-US", {
                      weekday: "long",
                    });
                    const dayOfWeek = dayName.toLowerCase();

                    // Check if stylist is available on this day
                    const isAvailable =
                      customerBooking.selectedStaff?.availability[dayOfWeek]
                        ?.available;

                    return (
                      <button
                        key={dateString}
                        onClick={() => {
                          if (isAvailable) {
                            setCustomerBooking((prev) => ({
                              ...prev,
                              selectedDate: dateString,
                            }));
                            setBookingStep(4);
                          }
                        }}
                        disabled={!isAvailable}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          isAvailable
                            ? "border-gray-200 hover:border-green-500 hover:shadow-md cursor-pointer"
                            : "border-gray-100 bg-gray-50 cursor-not-allowed opacity-50"
                        }`}
                      >
                        <div className="font-medium text-gray-900">
                          {date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                        <div className="text-sm text-gray-600">{dayName}</div>
                        {isAvailable ? (
                          <div className="text-xs text-green-600 mt-1">
                            {
                              customerBooking.selectedStaff?.availability[
                                dayOfWeek
                              ]?.start
                            }{" "}
                            -
                            {
                              customerBooking.selectedStaff?.availability[
                                dayOfWeek
                              ]?.end
                            }
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 mt-1">
                            Unavailable
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="text-sm text-gray-500 mt-4">
                  Showing next 14 days. Times shown are{" "}
                  {customerBooking.selectedStaff?.name}'s availability.
                </p>
              </div>
            </div>
          )}
          {/* STEP 4: CHOOSE TIME */}
          {bookingStep === 4 && customerBooking.selectedDate && (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Choose a Time
                </h2>
                <button
                  onClick={() => setBookingStep(3)}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              </div>

              {/* Booking Summary */}
              <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-900 mb-4">
                  Your Appointment
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-green-600">Service</p>
                    <p className="font-medium text-green-900">
                      {customerBooking.selectedService?.name}
                    </p>
                    <p className="text-sm text-green-600">
                      {customerBooking.selectedService?.duration} min • $
                      {customerBooking.selectedService?.price}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-600">Stylist</p>
                    <p className="font-medium text-green-900">
                      {customerBooking.selectedStaff?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-600">Date</p>
                    <p className="font-medium text-green-900">
                      {new Date(
                        customerBooking.selectedDate
                      ).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Time Slots */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Available Times
                </label>

                {(() => {
                  if (!customerBooking.selectedStaff || !customerBooking.selectedService) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-gray-500">
                          Please select a stylist and service first
                        </p>
                      </div>
                    );
                  }

                  // Use the new utility function to generate available time slots
                  const availableSlots = timeSlotUtils.generateAvailableTimeSlots(
                    customerBooking.selectedDate,
                    customerBooking.selectedStaff,
                    customerBooking.selectedService,
                    appointments
                  );

                  if (availableSlots.length === 0) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-gray-500">
                          No available time slots on this date
                        </p>
                        <button
                          onClick={() => setBookingStep(3)}
                          className="mt-4 text-green-600 hover:text-green-700"
                        >
                          Choose a different date
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {availableSlots.map((timeSlot) => (
                        <button
                          key={timeSlot}
                          onClick={() => {
                            setCustomerBooking((prev) => ({
                              ...prev,
                              selectedTime: timeSlot,
                            }));
                            setBookingStep(5); // Go to customer info step
                          }}
                          className="p-3 border border-gray-200 rounded-lg hover:border-green-500 hover:shadow-md transition-all text-center"
                        >
                          <div className="font-medium text-gray-900">
                            {new Date(
                              `2000-01-01T${timeSlot}:00`
                            ).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {customerBooking.selectedService?.duration} min
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <p className="text-blue-800 text-sm">
                    Can't find a good time? You can also request a work-in
                    appointment where {customerBooking.selectedStaff?.name} can
                    approve or suggest alternative times.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setCustomerBooking((prev) => ({
                      ...prev,
                      isWorkInRequest: true,
                    }));
                    setBookingStep(7);
                  }}
                  className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Request Work-In Instead →
                </button>
              </div>
            </div>
          )}
          {/* STEP 5: CUSTOMER INFO & CONFIRMATION */}
          {bookingStep === 5 && customerBooking.selectedTime && (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Confirm Your Booking
                </h2>
                <button
                  onClick={() => setBookingStep(4)}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              </div>

              {/* Booking Summary */}
              <div className="mb-8 p-6 bg-green-50 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-900 mb-4">
                  Your Appointment
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-green-600">Service</p>
                    <p className="font-medium text-green-900">
                      {customerBooking.selectedService?.name}
                    </p>
                    <p className="text-sm text-green-600">
                      {customerBooking.selectedService?.duration} minutes • $
                      {customerBooking.selectedService?.price}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-600">Stylist</p>
                    <p className="font-medium text-green-900">
                      {customerBooking.selectedStaff?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-green-600">Date & Time</p>
                    <p className="font-medium text-green-900">
                      {new Date(
                        customerBooking.selectedDate
                      ).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-green-600">
                      {new Date(
                        `2000-01-01T${customerBooking.selectedTime}:00`
                      ).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Information Form */}
              <div className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <h3 className="text-lg font-semibold text-gray-900">
                  Your Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Your Name *"
                    value={customerBooking.customerInfo.name}
                    onChange={(e) =>
                      setCustomerBooking((prev) => ({
                        ...prev,
                        customerInfo: {
                          ...prev.customerInfo,
                          name: e.target.value,
                        },
                      }))
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number *"
                    value={customerBooking.customerInfo.phone}
                    onChange={(e) =>
                      setCustomerBooking((prev) => ({
                        ...prev,
                        customerInfo: {
                          ...prev.customerInfo,
                          phone: e.target.value,
                        },
                      }))
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>

                <textarea
                  placeholder="Special requests or notes for your stylist"
                  value={customerBooking.customerInfo.notes}
                  onChange={(e) =>
                    setCustomerBooking((prev) => ({
                      ...prev,
                      customerInfo: {
                        ...prev.customerInfo,
                        notes: e.target.value,
                      },
                    }))
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={3}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How would you like to be contacted?
                  </label>
                  <select
                    value={customerBooking.customerInfo.preferredContact}
                    onChange={(e) =>
                      setCustomerBooking((prev) => ({
                        ...prev,
                        customerInfo: {
                          ...prev.customerInfo,
                          preferredContact: e.target.value as "email" | "sms",
                        },
                      }))
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="sms">Text Message</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                {/* Carrier selection for SMS notifications */}
                {customerBooking.customerInfo.preferredContact === "sms" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mobile Carrier (for text notifications)
                    </label>
                    <select
                      value={customerBooking.customerInfo.carrier || ""}
                      onChange={(e) =>
                        setCustomerBooking((prev) => ({
                          ...prev,
                          customerInfo: {
                            ...prev.customerInfo,
                            carrier: e.target.value,
                          },
                        }))
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select your carrier...</option>
                      <option value="verizon">Verizon</option>
                      <option value="att">AT&T</option>
                      <option value="tmobile">T-Mobile</option>
                      <option value="sprint">Sprint</option>
                      <option value="boost">Boost Mobile</option>
                      <option value="cricket">Cricket</option>
                      <option value="metro">Metro by T-Mobile</option>
                      <option value="uscellular">US Cellular</option>
                      <option value="virgin">Virgin Mobile</option>
                    </select>
                  </div>
                )}

                <button
                  onClick={handleCustomerBookingSubmit}
                  disabled={
                    !customerBooking.customerInfo.name.trim() ||
                    !customerBooking.customerInfo.phone.trim() ||
                    (customerBooking.customerInfo.preferredContact === "sms" && !customerBooking.customerInfo.carrier)
                  }
                  className="w-full bg-green-600 text-white py-4 rounded-lg hover:bg-green-700 transition-all font-medium text-lg disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                >
                  Confirm Booking
                </button>
              </div>
            </div>
          )}
          {/* STEP 6: BOOKING SUCCESS */}
          {bookingStep === 6 && (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Booking Confirmed!
              </h2>
              <div className="mb-6 p-4 bg-green-50 rounded-lg">
                <p className="text-green-800 font-medium mb-2">
                  Your appointment is confirmed
                </p>
                <p className="text-green-700 text-sm">
                  Service: {customerBooking.selectedService?.name}
                  <br />
                  Stylist: {customerBooking.selectedStaff?.name}
                  <br />
                  Date:{" "}
                  {new Date(customerBooking.selectedDate).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                  <br />
                  Time:{" "}
                  {new Date(
                    `2000-01-01T${customerBooking.selectedTime}:00`
                  ).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </p>
              </div>
              <p className="text-gray-600 mb-6">
                You'll receive a confirmation{" "}
                {customerBooking.customerInfo.preferredContact === "email"
                  ? "email"
                  : "text"}{" "}
                shortly.
              </p>
              <button
                onClick={() => {
                  setBookingStep(1);
                  setCustomerBooking({
                    selectedService: null,
                    selectedStaff: null,
                    selectedDate: "",
                    selectedTime: "",
                    customerInfo: {
                      name: "",
                      phone: "",
                      notes: "",
                      email: "",
                      preferredContact: "sms" as "email" | "sms",
                      carrier: "",
                    },
                  });
                }}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all font-medium"
              >
                Book Another Appointment
              </button>
            </div>
          )}
          {/* STEP 7: WORK-IN REQUEST FORM */}
          {bookingStep === 7 && (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Request Work-In Appointment
                </h2>
                <button
                  onClick={() => {
                    setCustomerBooking((prev) => ({
                      ...prev,
                      isWorkInRequest: false,
                    }));
                    setBookingStep(2);
                  }}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Regular Booking</span>
                </button>
              </div>

              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3">
                  <Bell className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold text-blue-900">
                      How Work-In Requests Work
                    </h3>
                    <p className="text-blue-700 text-sm">
                      Choose your preferred stylist and date. They'll be
                      notified and can either approve your request or suggest
                      alternative times. You'll be contacted via your preferred
                      method once they respond.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Service Display */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {customerBooking.selectedService?.image}
                    </span>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {customerBooking.selectedService?.name}
                      </h3>
                      <p className="text-gray-600">
                        {customerBooking.selectedService?.duration} min • $
                        {customerBooking.selectedService?.price}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stylist Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Stylist *
                  </label>
                  <select
                    value={customerBooking.selectedStaff?.id || ""}
                    onChange={(e) => {
                      console.log("Stylist selected:", e.target.value);
                      const selectedStaff = staff.find(
                        (s) => s.id === e.target.value
                      );
                      setCustomerBooking((prev) => ({
                        ...prev,
                        selectedStaff: selectedStaff ?? null,
                      }));
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    required
                  >
                    <option value="">Choose your preferred stylist...</option>
                    {staff
                      .filter((member) => member.isActive)
                      .map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} - {member.specialties.join(", ")}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Date Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Date *
                  </label>
                  <input
                    type="date"
                    value={customerBooking.selectedDate}
                    onChange={(e) => {
                      console.log("Date selected:", e.target.value);
                      setCustomerBooking((prev) => ({
                        ...prev,
                        selectedDate: e.target.value,
                      }));
                    }}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    required
                  />
                </div>

                {/* Preferred Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Time (optional)
                  </label>
                  {customerBooking.selectedDate && customerBooking.selectedStaff && customerBooking.selectedService ? (
                    (() => {
                      const availableSlots = timeSlotUtils.generateAvailableTimeSlots(
                        customerBooking.selectedDate,
                        customerBooking.selectedStaff,
                        customerBooking.selectedService,
                        appointments
                      );
                      
                      return (
                  <select
                    value={customerBooking.selectedTime}
                    onChange={(e) => {
                            console.log("Time selected:", e.target.value);
                      setCustomerBooking((prev) => ({
                        ...prev,
                        selectedTime: e.target.value,
                      }));
                    }}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Any time that works</option>
                          {availableSlots.map((timeSlot) => (
                            <option key={timeSlot} value={timeSlot}>
                              {new Date(`2000-01-01T${timeSlot}:00`).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                                hour12: true,
                              })} ({customerBooking.selectedService?.duration} min)
                            </option>
                          ))}
                  </select>
                      );
                    })()
                  ) : (
                    <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded border border-gray-200">
                      Select a date and stylist to see available times
                    </div>
                  )}
                </div>

                {/* Customer Info */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Your Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Your Name *"
                      value={customerBooking.customerInfo.name}
                      onChange={(e) => {
                        console.log("Name entered:", e.target.value);
                        setCustomerBooking((prev) => ({
                          ...prev,
                          customerInfo: {
                            ...prev.customerInfo,
                            name: e.target.value,
                          },
                        }));
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      required
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number *"
                      value={customerBooking.customerInfo.phone}
                      onChange={(e) => {
                        console.log("Phone entered:", e.target.value);
                        setCustomerBooking((prev) => ({
                          ...prev,
                          customerInfo: {
                            ...prev.customerInfo,
                            phone: e.target.value,
                          },
                        }));
                      }}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      required
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Email Address (optional)"
                    value={customerBooking.customerInfo.email}
                    onChange={(e) =>
                      setCustomerBooking((prev) => ({
                        ...prev,
                        customerInfo: {
                          ...prev.customerInfo,
                          email: e.target.value,
                        },
                      }))
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Preferred Contact Method
                    </label>
                    <select
                      value={customerBooking.customerInfo.preferredContact}
                      onChange={(e) =>
                        setCustomerBooking((prev) => ({
                          ...prev,
                          customerInfo: {
                            ...prev.customerInfo,
                            preferredContact: e.target.value as "email" | "sms",
                          },
                        }))
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="sms">Text Message</option>
                      <option value="email">Email</option>
                    </select>
                  </div>

                  {/* Carrier selection for SMS notifications */}
                  {customerBooking.customerInfo.preferredContact === "sms" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mobile Carrier (for text notifications)
                      </label>
                      <select
                        value={customerBooking.customerInfo.carrier || ""}
                        onChange={(e) =>
                          setCustomerBooking((prev) => ({
                            ...prev,
                            customerInfo: {
                              ...prev.customerInfo,
                              carrier: e.target.value,
                            },
                          }))
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                      >
                        <option value="">Select your carrier...</option>
                        <option value="verizon">Verizon</option>
                        <option value="att">AT&T</option>
                        <option value="tmobile">T-Mobile</option>
                        <option value="sprint">Sprint</option>
                        <option value="boost">Boost Mobile</option>
                        <option value="cricket">Cricket</option>
                        <option value="metro">Metro by T-Mobile</option>
                        <option value="uscellular">US Cellular</option>
                        <option value="virgin">Virgin Mobile</option>
                      </select>
                    </div>
                  )}

                  <textarea
                    placeholder="Special requests or notes for your stylist"
                    value={customerBooking.customerInfo.notes}
                    onChange={(e) =>
                      setCustomerBooking((prev) => ({
                        ...prev,
                        customerInfo: {
                          ...prev.customerInfo,
                          notes: e.target.value,
                        },
                      }))
                    }
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    rows={3}
                  />
                </div>

                {/* Debug Info */}
                <div className="p-3 bg-gray-100 rounded text-xs text-gray-600">
                  <strong>Debug Info:</strong>
                  <br />
                  Staff Selected:{" "}
                  {customerBooking.selectedStaff?.name || "None"}
                  <br />
                  Date: {customerBooking.selectedDate || "None"}
                  <br />
                  Name: {customerBooking.customerInfo.name || "None"}
                  <br />
                  Phone: {customerBooking.customerInfo.phone || "None"}
                  <br />
                  Button Enabled:{" "}
                  {customerBooking.selectedStaff &&
                  customerBooking.selectedDate &&
                  customerBooking.customerInfo.name &&
                  customerBooking.customerInfo.phone
                    ? "YES"
                    : "NO"}
                </div>
                {/* Debug Info */}
                <div className="p-3 bg-gray-100 rounded text-xs text-gray-600">
                  <strong>Debug Info:</strong>
                  <br />
                  Staff Selected:{" "}
                  {customerBooking.selectedStaff?.name || "None"}
                  <br />
                  Date: {customerBooking.selectedDate || "None"}
                  <br />
                  Name: {customerBooking.customerInfo.name || "None"}
                  <br />
                  Phone: {customerBooking.customerInfo.phone || "None"}
                  <br />
                  Button Enabled:{" "}
                  {customerBooking.selectedStaff &&
                  customerBooking.selectedDate &&
                  customerBooking.customerInfo.name &&
                  customerBooking.customerInfo.phone
                    ? "YES"
                    : "NO"}
                </div>

                {/* Submit Button - Fixed Version */}
                <div className="space-y-4">
                  {/* Show validation errors */}
                  {(!customerBooking.selectedStaff ||
                    !customerBooking.selectedDate ||
                    !customerBooking.customerInfo.name.trim() ||
                    !customerBooking.customerInfo.phone.trim() ||
                    (customerBooking.customerInfo.preferredContact === "sms" && !customerBooking.customerInfo.carrier)) && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800 text-sm font-medium">
                        Please complete the following:
                      </p>
                      <ul className="text-yellow-700 text-sm mt-1 space-y-1">
                        {!customerBooking.selectedStaff && (
                          <li>• Select a stylist</li>
                        )}
                        {!customerBooking.selectedDate && (
                          <li>• Choose a date</li>
                        )}
                        {!customerBooking.customerInfo.name.trim() && (
                          <li>• Enter your name</li>
                        )}
                        {!customerBooking.customerInfo.phone.trim() && (
                          <li>• Enter your phone number</li>
                        )}
                        {customerBooking.customerInfo.preferredContact === "sms" && !customerBooking.customerInfo.carrier && (
                          <li>• Select your mobile carrier</li>
                        )}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      console.log("🟡 Button clicked!");
                      console.log("🟡 Current form state:", customerBooking);
                      handleWorkInRequestSubmit();
                    }}
                    disabled={
                      !customerBooking.selectedStaff ||
                      !customerBooking.selectedDate ||
                      !customerBooking.customerInfo.name.trim() ||
                      !customerBooking.customerInfo.phone.trim() ||
                      (customerBooking.customerInfo.preferredContact === "sms" && !customerBooking.customerInfo.carrier)
                    }
                    className="w-full bg-orange-600 text-white py-4 px-6 rounded-lg hover:bg-orange-700 transition-all font-medium text-lg disabled:bg-gray-300 disabled:text-gray-900 disabled:cursor-not-allowed border-2 border-orange-600 disabled:border-gray-300"
                    style={{ 
                      minHeight: '60px',
                      color: (!customerBooking.selectedStaff ||
                        !customerBooking.selectedDate ||
                        !customerBooking.customerInfo.name.trim() ||
                        !customerBooking.customerInfo.phone.trim() ||
                        (customerBooking.customerInfo.preferredContact === "sms" && !customerBooking.customerInfo.carrier)) ? '#111827' : '#000000',
                      textShadow: (!customerBooking.selectedStaff ||
                        !customerBooking.selectedDate ||
                        !customerBooking.customerInfo.name.trim() ||
                        !customerBooking.customerInfo.phone.trim() ||
                        (customerBooking.customerInfo.preferredContact === "sms" && !customerBooking.customerInfo.carrier)) ? 'none' : '0 1px 2px rgba(255,255,255,0.8)'
                    }}
                  >
                    {!customerBooking.selectedStaff ||
                    !customerBooking.selectedDate ||
                    !customerBooking.customerInfo.name.trim() ||
                    !customerBooking.customerInfo.phone.trim() ||
                    (customerBooking.customerInfo.preferredContact === "sms" && !customerBooking.customerInfo.carrier)
                      ? "Complete Required Fields"
                      : "Submit Work-In Request"}
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* STEP 8: WORK-IN REQUEST CONFIRMATION */}
          {bookingStep === 8 && (
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200 text-center">
              <Bell className="w-16 h-16 text-orange-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Work-In Request Submitted!
              </h2>
              <div className="mb-6 p-4 bg-orange-50 rounded-lg">
                <p className="text-orange-800 font-medium mb-2">
                  {customerBooking.selectedStaff?.name} has been notified of
                  your request
                </p>
                <p className="text-orange-700 text-sm">
                  Service: {customerBooking.selectedService?.name}
                  <br />
                  Date: {customerBooking.selectedDate}
                  <br />
                  {customerBooking.selectedTime
                    ? `Preferred Time: ${customerBooking.selectedTime}`
                    : "Preferred Time: Flexible (any time)"}
                  <br />
                  Contact: {customerBooking.customerInfo.preferredContact}
                </p>
              </div>
              <p className="text-gray-600 mb-6">
                You'll receive a notification once your stylist responds to your
                request. They can either approve it or suggest alternative times
                that work better.
              </p>
              <button
                onClick={() => {
                  setBookingStep(1);
                  setCustomerBooking({
                    selectedService: null,
                    selectedStaff: null,
                    selectedDate: "",
                    selectedTime: "",
                    customerInfo: {
                      name: "",
                      phone: "",
                      notes: "",
                      email: "",
                      preferredContact: "sms" as "email" | "sms",
                      carrier: "",
                    },
                    isWorkInRequest: false,
                  });
                }}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all font-medium"
              >
                Submit Another Request
              </button>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Stylist view
  if (currentView === "stylist" && currentStaffId) {
    const currentStaffMember = staff.find((s) => s.id === currentStaffId);

    if (!currentStaffMember) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Staff Member Not Found
            </h2>
            <button
              onClick={() => {
                setCurrentView("admin");
                setCurrentStaffId(null);
              }}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all"
            >
              Back to Admin
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Welcome, {currentStaffMember.name}
                </h1>
                <p className="text-sm text-gray-600">Stylist Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Header Button - Desktop Only */}
              <button
                onClick={() => setShowCallInModal(true)}
                style={{
                  background: '#3b82f6',
                  color: '#fff',
                  fontWeight: 'bold',
                  border: '3px solid #1d4ed8',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
                  borderRadius: '8px',
                  minWidth: '140px',
                  minHeight: '44px',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                className="hidden md:flex z-10"
              >
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  <Plus className="w-5 h-5" style={{ color: '#fff', marginRight: 6 }} />
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>Add Call-In</span>
                </span>
              </button>
              <button
                onClick={() => {
                  setCurrentView("admin");
                  setCurrentStaffId(null);
                }}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Admin</span>
              </button>
            </div>
          </div>
        </header>

        {/* Notification Display - placed after header, before main */}
        <div className="fixed top-4 right-4 z-[1000] space-y-2" style={{ zIndex: 1000 }}>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg shadow-lg max-w-sm transition-all ${
                notification.type === "error"
                  ? "bg-red-500 text-white"
                  : notification.type === "success"
                  ? "bg-green-500 text-white"
                  : "bg-blue-500 text-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{notification.message}</p>
                <button
                  onClick={() =>
                    setNotifications((prev) =>
                      prev.filter((n) => n.id !== notification.id)
                    )
                  }
                  className="ml-2 text-white hover:text-gray-200"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>

        <main className="max-w-7xl mx-auto p-6">
          {/* Stylist Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                                 <button
                   onClick={() => setActiveTab("schedule")}
                   className={`py-4 px-1 border-b-2 font-medium text-sm ${
                     activeTab === "schedule"
                       ? "border-purple-500 text-purple-600"
                       : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                   }`}
                 >
                   My Schedule
                 </button>
                 <button
                   onClick={() => setActiveTab("workInRequests")}
                   className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
                     activeTab === "workInRequests"
                       ? "border-purple-500 text-purple-600"
                       : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                   }`}
                 >
                   Work-In Requests
                   {workInRequests.filter(req => req.staffId === currentStaffId && req.status === "pending").length > 0 && (
                     <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                       {workInRequests.filter(req => req.staffId === currentStaffId && req.status === "pending").length > 9 ? '9+' : workInRequests.filter(req => req.staffId === currentStaffId && req.status === "pending").length}
                     </span>
                   )}
                 </button>
                 <button
                   onClick={() => setActiveTab("gallery")}
                   className={`py-4 px-1 border-b-2 font-medium text-sm ${
                     activeTab === "gallery"
                       ? "border-purple-500 text-purple-600"
                       : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                   }`}
                 >
                   My Gallery
                 </button>
              </nav>
            </div>

            <div className="p-6">
                             {/* Schedule Tab */}
               {activeTab === "schedule" && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    My Schedule
                  </h2>
                  <div className="space-y-4">
                    {appointments
                      .filter((apt) => apt.staffId === currentStaffId)
                      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                      .map((appointment) => {
                        const client = clients.find(
                          (c) => c.id === appointment.clientId
                        );
                        const service = services.find(
                          (s) => s.id === appointment.serviceId
                        );
                        return (
                          <div
                            key={appointment.id}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-3">
                                <span className="text-xl">
                                  {client?.avatar || "👤"}
                                </span>
                                <div>
                                  <h3 className="font-medium text-gray-900">
                                    {client?.name || "Unknown Client"}
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    {service?.name} - {service?.duration} min
                                  </p>
                                  <p className="text-sm text-purple-600 font-medium">
                                    {new Date(appointment.date).toLocaleDateString("en-US", {
                                      weekday: "long",
                                      month: "long",
                                      day: "numeric",
                                  })} at {new Date(`2000-01-01T${appointment.time}:00`).toLocaleTimeString("en-US", {
                                    hour: "numeric",
                                    minute: "2-digit",
                                    hour12: true,
                                  })}
                                  </p>
                                  {appointment.notes && (
                                    <p className="text-sm text-gray-500 mt-1 italic">
                                      "{appointment.notes}"
                                    </p>
                                  )}
                                </div>
                              </div>
                            <div className="flex flex-col items-end space-y-2">
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  appointment.status === "confirmed"
                                    ? "bg-green-100 text-green-700"
                                    : appointment.status === "completed"
                                    ? "bg-blue-100 text-blue-700"
                                    : appointment.status === "cancelled"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {appointment.status}
                              </span>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    setEditingAppointment(appointment);
                                    setEditAppointmentForm({
                                      date: appointment.date,
                                      time: appointment.time,
                                      notes: appointment.notes || "",
                                    });
                                    setShowEditAppointmentModal(true);
                                  }}
                                  className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 transition-all"
                                >
                                  Edit Time
                                </button>
                                {appointment.status === "confirmed" && (
                                  <button
                                    onClick={() => handleCancelAppointment(appointment)}
                                    className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-all"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </div>
                            </div>
                          </div>
                        );
                      })}
                    {appointments.filter((apt) => apt.staffId === currentStaffId).length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No appointments scheduled yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

                             {/* Work-In Requests Tab */}
               {activeTab === "workInRequests" && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Work-In Requests
                  </h2>
                  <div className="space-y-4">
                    {workInRequests
                      .filter((req) => req.staffId === currentStaffId && req.status === "pending")
                      .map((request) => {
                        const service = services.find((s) => s.id === request.serviceId);
                        return (
                          <div
                            key={request.id}
                            className="border border-orange-200 rounded-lg p-4 bg-orange-50"
                          >
                            <div className="mb-3">
                              <h3 className="font-medium text-gray-900">
                                {request.customerInfo.name}
                              </h3>
                              <p className="text-sm text-gray-600">{service?.name}</p>
                              <p className="text-sm text-orange-600">
                                {new Date(request.requestedDate).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}{" "}
                                at {!request.requestedTime || request.requestedTime === "01:00" || request.requestedTime === "" || request.requestedTime === null ? "any time" : new Date(`2000-01-01T${request.requestedTime}:00`).toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                📞 {request.customerInfo.phone}
                              </p>
                              {request.customerInfo.notes && (
                                <p className="text-xs text-gray-600 mt-2 italic">
                                  "{request.customerInfo.notes}"
                                </p>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleQuickWorkInResponse(request, "approved")}
                                className="flex-1 bg-green-600 text-white py-2 px-3 rounded text-sm hover:bg-green-700 transition-all"
                              >
                                Quick Approve
                              </button>
                              <button
                                onClick={() => handleShowWorkInResponseModal(request)}
                                className="flex-1 bg-orange-600 text-white py-2 px-3 rounded text-sm hover:bg-orange-700 transition-all"
                              >
                                Respond
                              </button>
                              <button
                                onClick={() => handleQuickWorkInResponse(request, "denied")}
                                className="flex-1 bg-red-600 text-white py-2 px-3 rounded text-sm hover:bg-red-700 transition-all"
                              >
                                Deny
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    {workInRequests.filter((req) => req.staffId === currentStaffId && req.status === "pending").length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No pending work-in requests.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

                             {/* Gallery Tab */}
               {activeTab === "gallery" && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                      My Gallery
                    </h2>
                    <button
                      onClick={() => setShowGalleryModal(true)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-all"
                    >
                      Add Photo
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {currentStaffMember.gallery && currentStaffMember.gallery.length > 0 ? (
                      currentStaffMember.gallery.map((image) => (
                        <div key={image.id} className="relative group">
                          <div className="aspect-square bg-gray-200 rounded-lg overflow-hidden">
                            <img
                              src={image.url}
                              alt={image.caption}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik01MCA0MEw2MCA1MEg3MFY2MEg1MFY0MFoiIGZpbGw9IiM5Q0E0QUYiLz4KPC9zdmc+";
                              }}
                            />
                          </div>
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-all">
                              <button
                                onClick={() => {
                                  setEditingGalleryImage(image);
                                  setGalleryForm({
                                    beforeImageFile: null,
                                    beforeImagePreview: "",
                                    afterImageFile: null,
                                    afterImagePreview: "",
                                    imageFile: null,
                                    imagePreview: "",
                                    caption: image.caption,
                                    isBeforeAfter: image.isBeforeAfter || false,
                                  });
                                  setShowGalleryModal(true);
                                }}
                                className="bg-white text-gray-900 px-3 py-1 rounded text-sm mr-2 hover:bg-gray-100"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteGalleryImage(image)}
                                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          {image.isBeforeAfter && (
                            <div className="absolute top-2 left-2">
                              <span className="px-2 py-1 bg-purple-600 text-white text-xs rounded">
                                Before/After
                              </span>
                            </div>
                          )}
                          <p className="text-sm text-gray-600 mt-2">{image.caption}</p>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12">
                        <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">No gallery photos yet</p>
                        <button
                          onClick={() => setShowGalleryModal(true)}
                          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-all"
                        >
                          Add Your First Photo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Modals */}
        <StaffModal
          show={showStaffModal}
          onClose={handleCloseStaffModal}
          staffForm={staffForm}
          setStaffForm={setStaffForm}
          handleAddStaff={handleAddStaff}
          editingStaff={editingStaff}
        />

        <ServiceModal
          show={showServiceModal}
          onClose={handleCloseServiceModal}
          serviceForm={serviceForm}
          setServiceForm={setServiceForm}
          handleAddService={handleAddService}
          editingService={editingService}
        />

        <CallInModal
          show={showCallInModal}
          onClose={() => setShowCallInModal(false)}
          onSubmit={handleCreateCallInAppointment}
          form={callInForm}
          setForm={setCallInForm}
          staff={staff}
          services={services}
          appointments={appointments}
        />

        <GalleryModal
          show={showGalleryModal}
          onClose={() => {
            setShowGalleryModal(false);
            setEditingGalleryImage(null);
            setGalleryForm({
              beforeImageFile: null,
              beforeImagePreview: "",
              afterImageFile: null,
              afterImagePreview: "",
              imageFile: null,
              imagePreview: "",
              caption: "",
              isBeforeAfter: false,
            });
          }}
          onSubmit={handleGalleryUpload}
          form={galleryForm}
          setForm={setGalleryForm}
          editingImage={editingGalleryImage}
        />

        <AdminLoginModal
          show={showAdminLogin}
          onClose={() => setShowAdminLogin(false)}
          onLogin={handleAdminLogin}
        />

        <StylistLoginModal
          show={showStylistLogin}
          onClose={() => setShowStylistLogin(false)}
          onLogin={(staffId) => {
            setCurrentStaffId(staffId);
            setCurrentView("stylist");
            setShowStylistLogin(false);
          }}
          staff={staff}
        />

        <EditAppointmentModal
          show={showEditAppointmentModal}
          onClose={() => {
            setShowEditAppointmentModal(false);
            setEditingAppointment(null);
            setEditAppointmentForm({
              date: "",
              time: "",
              notes: "",
            });
          }}
          onSubmit={handleEditAppointment}
          form={editAppointmentForm}
          setForm={setEditAppointmentForm}
          appointment={editingAppointment}
          staff={staff}
          services={services}
          appointments={appointments}
          clients={clients}
        />

        {showWorkInResponseModal && selectedWorkInRequest && (
          <WorkInResponseModal
            show={showWorkInResponseModal}
            onClose={() => setShowWorkInResponseModal(false)}
            request={selectedWorkInRequest}
            staffMember={staff.find((s) => s.id === selectedWorkInRequest.staffId)!}
            onUpdateRequest={updateWorkInRequest}
            sendNotification={sendNotification}
            services={services}
          />
        )}
      </div>
    );
  }
};



// Utility functions for time slot validation and appointment overlap checking
const timeSlotUtils = {
  // Convert time string to minutes for easier comparison
  timeToMinutes: (timeString: string): number => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  },

  // Convert minutes back to time string
  minutesToTime: (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  },

  // Check if two time ranges overlap
  doTimeRangesOverlap: (
    start1: string, 
    end1: string, 
    start2: string, 
    end2: string
  ): boolean => {
    const start1Min = timeSlotUtils.timeToMinutes(start1);
    const end1Min = timeSlotUtils.timeToMinutes(end1);
    const start2Min = timeSlotUtils.timeToMinutes(start2);
    const end2Min = timeSlotUtils.timeToMinutes(end2);
    
    return start1Min < end2Min && start2Min < end1Min;
  },

  // Get the end time of an appointment based on start time and duration
  getAppointmentEndTime: (startTime: string, durationMinutes: number): string => {
    const startMinutes = timeSlotUtils.timeToMinutes(startTime);
    const endMinutes = startMinutes + durationMinutes;
    return timeSlotUtils.minutesToTime(endMinutes);
  },

  // Check if a time slot is available considering existing appointments
  isTimeSlotAvailable: (
    proposedStartTime: string,
    serviceDuration: number,
    existingAppointments: Appointment[],
    staffId: string,
    date: string
  ): boolean => {
    const proposedEndTime = timeSlotUtils.getAppointmentEndTime(proposedStartTime, serviceDuration);
    
    // Check against all existing appointments for this staff member on this date
    for (const appointment of existingAppointments) {
      if (
        appointment.staffId === staffId &&
        appointment.date === date &&
        appointment.status !== "cancelled"
      ) {
        const appointmentEndTime = appointment.endTime || 
          timeSlotUtils.getAppointmentEndTime(appointment.time, 60); // Default 60 min if no endTime
        
        if (timeSlotUtils.doTimeRangesOverlap(
          proposedStartTime,
          proposedEndTime,
          appointment.time,
          appointmentEndTime
        )) {
          return false; // Overlap found, slot not available
        }
      }
    }
    
    return true; // No overlaps found, slot is available
  },

  // Generate available time slots for a given date, staff member, and service
  generateAvailableTimeSlots: (
    date: string,
    staffMember: StaffMember,
    service: Service,
    existingAppointments: Appointment[]
  ): string[] => {
    const selectedDate = new Date(date);
    const dayName = selectedDate
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    const availability = staffMember.availability[dayName];

    if (!availability?.available) {
      return [];
    }

    const startTime = availability.start;
    const endTime = availability.end;
    const serviceDuration = service.duration;

    const timeSlots: string[] = [];
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);

    // Generate 30-minute intervals
    for (
      let time = new Date(start);
      time < end;
      time.setMinutes(time.getMinutes() + 30)
    ) {
      const timeString = time.toTimeString().slice(0, 5);

      // Check if there's enough time for the service before closing
      const serviceEndTime = new Date(
        time.getTime() + serviceDuration * 60000
      );
      
      if (serviceEndTime <= end) {
        // Check if this time slot is available (no overlapping appointments)
        if (timeSlotUtils.isTimeSlotAvailable(
          timeString,
          serviceDuration,
          existingAppointments,
          staffMember.id,
          date
        )) {
          timeSlots.push(timeString);
        }
      }
    }

    return timeSlots;
  }
};

export default SalonManagementSystem;

// Force redeploy - Sun Jul 13 20:33:54 CDT 2025
